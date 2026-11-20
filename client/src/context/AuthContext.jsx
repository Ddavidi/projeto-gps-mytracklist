import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('mtl_token');
    if (!token) return null;
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
      localStorage.setItem('mtl_user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('mtl_token');
        localStorage.removeItem('mtl_user');
        setUser(null);
        setIsAuthenticated(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('mtl_token');
      const savedUser = localStorage.getItem('mtl_user');

      if (!token) {
        setLoading(false);
        return;
      }

      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch {
          // JSON inválido, ignora
        }
      }

      await refreshUser();
      setLoading(false);
    };

    checkAuth();
  }, [refreshUser]);

  const setAuth = (token, userData) => {
    localStorage.setItem('mtl_token', token);
    localStorage.setItem('mtl_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const updateUserLocal = (partial) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...partial };
      localStorage.setItem('mtl_user', JSON.stringify(next));
      return next;
    });
  };

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      const { token, user: userData } = response.data;
      setAuth(token, userData);
      // Busca dados completos (incluindo spotify_connected, favorite_genres, etc.)
      refreshUser();
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Falha no login'
      };
    }
  };

  const logout = async () => {
    localStorage.removeItem('mtl_token');
    localStorage.removeItem('mtl_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading, setAuth, refreshUser, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
};
