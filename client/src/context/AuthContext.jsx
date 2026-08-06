import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ao carregar a página, verifica se há um token salvo e se é válido
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('mtl_token');
      const savedUser = localStorage.getItem('mtl_user');

      if (!token) {
        setLoading(false);
        return;
      }

      // Se temos token e user salvos, usa-os imediatamente
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch {
          // JSON inválido, ignora
        }
      }

      // Valida o token com o backend
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        setIsAuthenticated(true);
        localStorage.setItem('mtl_user', JSON.stringify(response.data));
      } catch (error) {
        // Token inválido/expirado — limpa tudo
        localStorage.removeItem('mtl_token');
        localStorage.removeItem('mtl_user');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Função auxiliar para definir os dados manualmente após registro
  const setAuth = (token, userData) => {
    localStorage.setItem('mtl_token', token);
    localStorage.setItem('mtl_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Função de Login — agora recebe identifier (e-mail ou username)
  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });

      const { token, user: userData } = response.data;
      setAuth(token, userData);
      
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Falha no login'
      };
    }
  };

  // Função de Logout — limpa token do localStorage
  const logout = async () => {
    localStorage.removeItem('mtl_token');
    localStorage.removeItem('mtl_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};