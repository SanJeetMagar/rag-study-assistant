import axios, {AxiosError, InternalAxiosRequestConfig} from "axios";
import type {
  AskResponse,
  ChatSession,
  Course,
  Message,
  Paginated,
  Role,
  StudyDocument,
  User,
} from "../types";

const ACCESS_KEY = "studyai-access";
const REFRESH_KEY = "studyai-refresh";

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  save(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Vite proxies /api to Django, so requests stay same-origin.
export const api = axios.create({baseURL: "/api"});

api.interceptors.request.use((config) => {
  const token = tokens.access();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Refresh-on-401.
 *
 * Access tokens expire after 30 minutes. Without this a student mid-conversation
 * would start seeing failures with no explanation. On the first 401 we refresh
 * once and replay the original request; concurrent 401s share that single
 * refresh rather than each firing their own.
 */
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokens.refresh();
  if (!refresh) throw new Error("no refresh token");

  // Bare axios, not `api` — going through the instance would recurse.
  const {data} = await axios.post("/api/auth/refresh/", {refresh});
  tokens.save(data.access);
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {_retried?: boolean};

    const isAuthFailure = error.response?.status === 401;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (!isAuthFailure || original?._retried || isRefreshCall) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      refreshing = refreshing ?? refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const access = await refreshing;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      tokens.clear();
      // Full reload so every cached query is dropped along with the session.
      window.location.href = "/login";
      return Promise.reject(error);
    }
  },
);

/** Pull a readable message out of a DRF error body. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!axios.isAxiosError(error)) return fallback;

  const status = error.response?.status;

  if (!error.response) {
    return "Cannot reach the server. Is the backend running?";
  }

  const data = error.response.data;

  // A string body means the response was not DRF JSON at all -- typically an
  // HTML error page, which happens when /api is proxied somewhere unexpected.
  // Iterating it as an object would read character 0 and render "0: <".
  if (typeof data !== "object" || data === null) {
    return `Server returned ${status} but not an API response. Check that the `
      + `backend is running and that Vite is proxying /api to it.`;
  }

  const body = data as Record<string, unknown>;
  if (typeof body.detail === "string") return body.detail;

  const first = Object.entries(body)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const text = Array.isArray(value) ? value[0] : value;
  return field === "non_field_errors" ? String(text) : `${field}: ${text}`;
}

// ---------------------------------------------------------------- endpoints

export const auth = {
  async login(email: string, password: string) {
    const {data} = await api.post("/auth/login/", {email, password});
    tokens.save(data.access, data.refresh);
    return data.user as User;
  },
  async register(payload: {
    username: string;
    email: string;
    password: string;
    role: Role;
  }) {
    await api.post("/auth/register/", payload);
    return auth.login(payload.email, payload.password);
  },
  async me() {
    const {data} = await api.get<User>("/auth/me/");
    return data;
  },
  logout() {
    tokens.clear();
  },
};

export const courses = {
  async list() {
    const {data} = await api.get<Paginated<Course>>("/courses/");
    return data.results;
  },
  async get(id: number) {
    const {data} = await api.get<Course>(`/courses/${id}/`);
    return data;
  },
  async create(payload: {title: string; description?: string}) {
    const {data} = await api.post<Course>("/courses/", payload);
    return data;
  },
  async update(id: number, payload: {title?: string; description?: string}) {
    const {data} = await api.patch<Course>(`/courses/${id}/`, payload);
    return data;
  },
  async leave(id: number) {
    await api.post(`/courses/${id}/leave/`);
  },
  async join(courseCode: string) {
    const {data} = await api.post<Course>("/courses/join/", {course_code: courseCode});
    return data;
  },
  async remove(id: number) {
    await api.delete(`/courses/${id}/`);
  },
};

export const documents = {
  async listForCourse(courseId: number) {
    const {data} = await api.get<Paginated<StudyDocument>>(
      `/documents/?course_id=${courseId}`,
    );
    return data.results;
  },
  async upload(courseId: number, title: string, file: File) {
    const form = new FormData();
    form.append("course", String(courseId));
    form.append("title", title);
    form.append("file", file);
    const {data} = await api.post<StudyDocument>("/documents/", form);
    return data;
  },
  async status(id: number) {
    const {data} = await api.get<StudyDocument>(`/documents/${id}/status/`);
    return data;
  },
  async reprocess(id: number) {
    const {data} = await api.post<StudyDocument>(`/documents/${id}/reprocess/`);
    return data;
  },
  async rename(id: number, title: string) {
    const {data} = await api.patch<StudyDocument>(`/documents/${id}/`, {title});
    return data;
  },
  async remove(id: number) {
    await api.delete(`/documents/${id}/`);
  },
  /**
   * Fetch the PDF as an object URL for the viewer.
   *
   * The file is behind an authenticated endpoint, and an <iframe> cannot send
   * an Authorization header -- so fetch it here, where the interceptor adds
   * the token, and hand the iframe a blob URL instead. Revoke it when done.
   */
  async fileUrl(id: number) {
    const {data} = await api.get(`/documents/${id}/file/`, {
      responseType: "blob",
    });
    return URL.createObjectURL(data as Blob);
  },
};

export const chat = {
  async ask(question: string, courseId: number, sessionId?: number | null) {
    const {data} = await api.post<AskResponse>("/chat/ask/", {
      question,
      course_id: courseId,
      session_id: sessionId ?? null,
    });
    return data;
  },
  async sessions(courseId: number) {
    const {data} = await api.get<Paginated<ChatSession>>(
      `/chat/sessions/?course_id=${courseId}`,
    );
    return data.results;
  },
  async messages(sessionId: number) {
    const {data} = await api.get<Message[]>(`/chat/sessions/${sessionId}/messages/`);
    return data;
  },
};
