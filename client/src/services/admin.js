import api from './api';

export const getAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas do painel admin:', error);
    throw error;
  }
};
