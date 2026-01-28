import api from '../lib/api';

export const authService = {
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/auth/login/access-token', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  async register(email: string, password: string, fullName: string) {
    return api.post('/auth/register', null, {
      params: {
        email,
        password,
        full_name: fullName
      }
    });
  },
   logout(): void {
    localStorage.removeItem('token');
    window.location.reload();
  },
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }
};