import api from '../lib/api';

export const authService = {
  async login(email: string, password: string) {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const response = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
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