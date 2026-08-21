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
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong';

export default api;
