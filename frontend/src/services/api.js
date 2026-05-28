// src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Initialize Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Inject JWT token into standard API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamless background token refreshing and request retrying
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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
        clearAuthData();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Process structured backend errors for forms and inline alerts
    if (error.response && error.response.data) {
      return Promise.reject(error.response);
    }
    return Promise.reject(error);
  }
);

// Helper function to clear expired tokens and trigger routing reset
function clearAuthData() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login?session_expired=1';
  }
}

/* AUTH API CALLS */
export const login = async (username, password) => {
  const response = await api.post('/api/token/', { username, password });
  localStorage.setItem('access_token', response.data.access);
  localStorage.setItem('refresh_token', response.data.refresh);
  return response.data;
};

export const register = async (username, email, password, role) => {
  const response = await api.post('/api/auth/register/', { username, email, password, role });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me/');
  return response.data;
};

/* COURSE API CALLS */
export const listCourses = async () => {
  const response = await api.get('/api/courses/');
  return response.data;
};

export const createCourse = async (courseData) => {
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
  const response = await api.post(`/api/courses/${courseId}/enroll/`, { course_code: courseCode });
  return response.data;
};

/* DOCUMENT API CALLS */
export const listDocuments = async (courseId) => {
  const response = await api.get(`/api/documents/?course=${courseId}`);
  return response.data;
};

export const uploadDocument = async (file, title, courseId, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('course_id', courseId);

  const response = await api.post('/api/documents/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

export const checkDocumentStatus = async (id) => {
  const response = await api.get(`/api/documents/${id}/`);
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/${id}/`);
  return response.data;
};

/* CHAT API CALLS */
export const listChatSessions = async (courseId) => {
  const response = await api.get(`/api/chat/sessions/?course=${courseId}`);
  return response.data;
};

export const createChatSession = async (courseId, title) => {
  const response = await api.post('/api/chat/sessions/', { course_id: courseId, title });
  return response.data;
};

export const listMessages = async (sessionId) => {
  const response = await api.get(`/api/chat/sessions/${sessionId}/messages/`);
  return response.data;
};

export const askQuestion = async (question, courseId, sessionId) => {
  const response = await api.post('/api/chat/ask/', {
    question,
    course_id: courseId,
    session_id: sessionId,
  });
  return response.data;
};

export default api;