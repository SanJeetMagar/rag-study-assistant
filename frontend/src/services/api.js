// src/services/api.js
import axios from 'axios';

// Instantiate Axios with config from env or fallback base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue system to manage concurrent requests when refreshing JWTs
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to attach bearer token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle transparent JWT refreshing on 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Reject immediately if the request comes from the refresh or login endpoints to prevent infinite loops
    if (originalRequest.url === '/api/token/' || originalRequest.url === '/api/token/refresh/') {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        clearAuthTokensAndRedirect();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearAuthTokensAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Clean session state and drop back to login page safely
function clearAuthTokensAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
}

/* AUTHENTICATION ENDPOINTS */
export const loginUser = async (username, password) => {
  const response = await api.post('/api/token/', { username, password });
  return response.data; // Expected response shape: { access, refresh }
};

export const registerUser = async (username, email, password, role) => {
  const response = await api.post('/api/auth/register/', { username, email, password, role });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me/');
  return response.data; // Expected response shape: { id, username, email, role, date_joined }
};

/* COURSES ENDPOINTS */
export const getCourses = async () => {
  const response = await api.get('/api/courses/');
  return response.data;
};

export const createCourse = async (courseData) => {
  // courseData: { title, description, course_code }
  const response = await api.post('/api/courses/', courseData);
  return response.data;
};

export const getCourseDetail = async (id) => {
  const response = await api.get(`/api/courses/${id}/`);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/api/courses/${id}/`);
  return response.data;
};

export const enrollInCourse = async (courseId, courseCode) => {
  const response = await api.post(`/api/courses/${courseId}/enroll/`, {
    course_code: courseCode,
  });
  return response.data;
};

/* DOCUMENTS ENDPOINTS */
export const getDocuments = async (courseId) => {
  const response = await api.get(`/api/documents/?course=${courseId}`);
  return response.data;
};

export const uploadDocument = async (formData, onUploadProgress) => {
  // formData expects: { file, title, course_id }
  const response = await api.post('/api/documents/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/${id}/`);
  return response.data;
};

/* CHAT ENDPOINTS */
export const getChatSessions = async (courseId) => {
  const response = await api.get(`/api/chat/sessions/?course=${courseId}`);
  return response.data;
};

export const createChatSession = async (courseId, title) => {
  const response = await api.post('/api/chat/sessions/', { course_id: courseId, title });
  return response.data;
};

export const getSessionMessages = async (sessionId) => {
  const response = await api.get(`/api/chat/sessions/${sessionId}/messages/`);
  return response.data;
};

export const askQuestion = async (question, courseId, sessionId) => {
  const response = await api.post('/api/chat/ask/', {
    question,
    course_id: courseId,
    session_id: sessionId,
  });
  return response.data; // Expected: { answer, chunks_used, similarity_scores }
};

export default api;