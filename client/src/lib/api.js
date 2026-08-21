import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setToken(token) {
  if (token) localStorage.setItem('vs_token', token);
  else localStorage.removeItem('vs_token');
}

export function getToken() {
  return localStorage.getItem('vs_token');
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('vs_token')) {
      setToken(null);
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const coursesAPI = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  getEnrolledStudents: (id) => api.get(`/courses/${id}/students`),
};

export const enrollmentsAPI = {
  getMine: () => api.get('/enrollments/mine'),
  enroll: (courseId) => api.post('/enrollments/checkout', { courseId }),
  markVideoWatched: (courseId, videoIndex) =>
    api.post(`/enrollments/${courseId}/videos/${videoIndex}/watched`),
};

export const notesAPI = {
  getNotes: (courseId) => api.get(`/notes/${courseId}`),
  saveNotes: (courseId, content) => api.put(`/notes/${courseId}`, { content }),
};

export const submissionsAPI = {
  submit: (data) => api.post('/submissions', data),
  getMine: () => api.get('/submissions/mine'),
  getById: (id) => api.get(`/submissions/${id}`),
  logSnapshot: (id, snapshotData) => api.post(`/submissions/${id}/snapshots`, snapshotData),
};

export const interviewsAPI = {
  start: (submissionId) => api.post(`/interviews/start/${submissionId}`),
  submitAnswers: (submissionId, answers) => api.post(`/interviews/answers/${submissionId}`, { answers }),
  getTranscript: (submissionId) => api.get(`/interviews/${submissionId}`),
};

export const teacherAPI = {
  getQueue: () => api.get('/teacher/queue'),
  review: (submissionId, decision, comments) => api.post('/teacher/reviews', { submissionId, decision, comments }),
};

export const portfolioAPI = {
  getMine: () => api.get('/portfolio/mine'),
  getByUser: (userId) => api.get(`/portfolio/${userId}`),
};

export default api;
