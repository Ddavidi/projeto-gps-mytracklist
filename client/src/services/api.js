import axios from 'axios';

// Define a URL base: usa a variável de ambiente em produção, ou localhost em desenvolvimento
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: baseURL,
});

// Interceptor de REQUEST: Adiciona o token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mtl_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de RESPONSE: Redireciona para login se receber 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido — limpa e redireciona
      localStorage.removeItem('mtl_token');
      localStorage.removeItem('mtl_user');

      // Só redireciona se não estiver já na página de login/register
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;