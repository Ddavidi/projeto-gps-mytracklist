import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Tabs, Tab, TextField, Button, Alert, CircularProgress, Divider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function SettingsPage() {
  const { user, login } = useAuth(); // We might just use the token in api interceptors
  const [tabIndex, setTabIndex] = useState(0);
  const location = useLocation();
  
  const [profileData, setProfileData] = useState({ name: '', gender: '', birthDate: '', bio: '' });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    // Check url params for spotify auth success/error
    const params = new URLSearchParams(location.search);
    if (params.get('spotify_connected') === 'true') {
      setMessage('Conta do Spotify vinculada com sucesso!');
      setTabIndex(2);
    } else if (params.get('spotify_error')) {
      setError(`Erro ao vincular Spotify: ${params.get('spotify_error')}`);
      setTabIndex(2);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        gender: user.gender || '',
        birthDate: user.birth_date || '',
        bio: user.bio || ''
      });
      setSpotifyConnected(user.spotify_connected);
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      await api.put('/auth/profile', profileData);
      setMessage('Perfil atualizado com sucesso!');
      // Ideally we should reload user context, but it will sync on next fetch
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas novas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      await api.put('/users/me/password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setMessage('Senha alterada com sucesso!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSpotify = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/spotify/url');
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError('Falha ao obter link de autorização do Spotify.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkSpotify = async () => {
    if (!window.confirm('Tem certeza que deseja desvincular a sua conta do Spotify? Suas playlists e estatísticas deixarão de aparecer no seu perfil.')) return;
    
    try {
      setLoading(true);
      await api.delete('/auth/spotify/unlink');
      setMessage('Conta do Spotify desvinculada com sucesso!');
      setSpotifyConnected(false);
    } catch (err) {
      setError('Falha ao desvincular conta do Spotify.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Configurações da Conta
      </Typography>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} aria-label="settings tabs">
            <Tab label="Perfil Público" sx={{ fontWeight: 'bold' }} />
            <Tab label="Segurança" sx={{ fontWeight: 'bold' }} />
            <Tab label="Conexões" sx={{ fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        <Box sx={{ p: 4, bgcolor: 'background.default' }}>
          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {tabIndex === 0 && (
            <Box component="form" onSubmit={handleProfileSubmit}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Informações Pessoais</Typography>
              
              <TextField
                fullWidth
                label="Nome de Exibição"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Biografia"
                multiline
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                margin="normal"
                placeholder="Conte um pouco sobre o seu gosto musical..."
              />
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  label="Gênero"
                  value={profileData.gender}
                  onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Nascimento"
                  InputLabelProps={{ shrink: true }}
                  value={profileData.birthDate}
                  onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                />
              </Box>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Salvar Alterações'}
                </Button>
              </Box>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Alterar Senha</Typography>
              
              <TextField
                fullWidth
                type="password"
                label="Senha Atual"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                margin="normal"
                required
              />
              <Divider sx={{ my: 3 }} />
              <TextField
                fullWidth
                type="password"
                label="Nova Senha"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                type="password"
                label="Confirmar Nova Senha"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                margin="normal"
                required
              />

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Atualizar Senha'}
                </Button>
              </Box>
            </Box>
          )}

          {tabIndex === 2 && (
            <Box>
              <Typography variant="h6" fontWeight="bold" mb={2}>Conexões de Terceiros</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Vincule sua conta do Spotify para podermos exibir suas Playlists e seu histórico de músicas mais tocadas (Top Tracks) no seu perfil.
              </Typography>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Spotify</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Importe suas playlists e músicas mais ouvidas.
                  </Typography>
                </Box>
                {spotifyConnected ? (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleUnlinkSpotify}
                    disabled={loading}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Desvincular Conta'}
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={handleConnectSpotify}
                    disabled={loading}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Vincular Conta'}
                  </Button>
                )}
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default SettingsPage;
