import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_V1_URL = `${BASE_URL}/api/v1`;

const api = axios.create({
  baseURL: API_V1_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const impersonatedId = localStorage.getItem('impersonated_user_id');

  
  if (config.method === 'get' && impersonatedId && impersonatedId !== 'all') {
    config.params = {
      ...config.params,
      user_id: impersonatedId
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('impersonated_user_id'); 
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;