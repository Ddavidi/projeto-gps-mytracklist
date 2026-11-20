import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  MenuItem,
  Grid,
  Chip,
  alpha,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import api from '../services/api';
import BirthDateField from '../components/BirthDateField';
import { MUSIC_GENRES } from '../constants/genres';

function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { paletteId, selectPalette, palettes } = useThemeMode();
  const [tabIndex, setTabIndex] = useState(0);
  const location = useLocation();

  const [profileData, setProfileData] = useState({
    name: '',
    gender: '',
    birthDate: '',
    bio: '',
    favoriteGenres: [],
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('spotify_connected') === 'true') {
      setMessage('Conta do Spotify vinculada com sucesso! Seus dados já podem ser carregados no perfil.');
      setTabIndex(3);
      refreshUser();
    } else if (params.get('spotify_error')) {
      setError(`Erro ao vincular Spotify: ${params.get('spotify_error')}`);
      setTabIndex(3);
    } else if (params.get('tab') === 'appearance') {
      setTabIndex(1);
    } else if (params.get('tab') === 'connections') {
      setTabIndex(3);
    }
  }, [location.search, refreshUser]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        gender: user.gender || '',
        birthDate: user.birth_date || '',
        bio: user.bio || '',
        favoriteGenres: Array.isArray(user.favorite_genres) ? user.favorite_genres : [],
      });
      setSpotifyConnected(Boolean(user.spotify_connected));
    }
  }, [user]);

  const toggleGenre = (genre) => {
    setProfileData((prev) => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter((g) => g !== genre)
        : [...prev.favoriteGenres, genre],
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await api.put('/auth/profile', profileData);
      await refreshUser();
      setMessage('Perfil atualizado com sucesso!');
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
        newPassword: passwordData.newPassword,
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
      setError(null);
      const res = await api.get('/auth/spotify/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      setError('Falha ao obter link de autorização do Spotify.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkSpotify = async () => {
    if (!window.confirm('Deseja desvincular sua conta do Spotify? Playlists e estatísticas deixarão de aparecer no perfil.')) return;
    try {
      setLoading(true);
      setError(null);
      await api.delete('/auth/spotify/unlink');
      setSpotifyConnected(false);
      await refreshUser();
      setMessage('Conta do Spotify desvinculada com sucesso.');
    } catch {
      setError('Falha ao desvincular conta do Spotify.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }} className="mtl-reveal">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 0.75, fontSize: { xs: '1.85rem', md: '2.25rem' } }}>
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personalize seu perfil, teste paletas de cores para todo o site e gerencie conexões.
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={tabIndex}
            onChange={(e, val) => {
              setTabIndex(val);
              setMessage(null);
              setError(null);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<PersonOutlineIcon fontSize="small" />} iconPosition="start" label="Perfil" />
            <Tab icon={<PaletteIcon fontSize="small" />} iconPosition="start" label="Aparência & Cores" />
            <Tab icon={<LockOutlinedIcon fontSize="small" />} iconPosition="start" label="Segurança" />
            <Tab icon={<LinkIcon fontSize="small" />} iconPosition="start" label="Conexões" />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* ABA 0: PERFIL */}
          {tabIndex === 0 && (
            <Box component="form" onSubmit={handleProfileSubmit}>
              <Typography variant="h6" mb={2}>Informações Pessoais</Typography>

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
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Gênero"
                    value={profileData.gender || ''}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  >
                    <MenuItem value="">Não especificado</MenuItem>
                    <MenuItem value="Homem">Homem</MenuItem>
                    <MenuItem value="Mulher">Mulher</MenuItem>
                    <MenuItem value="Não binário">Não binário</MenuItem>
                    <MenuItem value="Outro">Outro</MenuItem>
                    <MenuItem value="Prefiro não dizer">Prefiro não dizer</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <BirthDateField
                    fullWidth
                    label="Data de Nascimento"
                    value={profileData.birthDate}
                    onChange={(iso) => setProfileData({ ...profileData, birthDate: iso })}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3.5 }} />

              <Typography variant="h6" mb={0.75}>Gêneros Musicais Favoritos</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Eles aparecem no seu perfil público para pessoas com gosto parecido te encontrarem.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {MUSIC_GENRES.map((genre) => {
                  const active = profileData.favoriteGenres.includes(genre);
                  return (
                    <Chip
                      key={genre}
                      label={genre}
                      clickable
                      icon={active ? <CheckIcon sx={{ fontSize: 16 }} /> : undefined}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => toggleGenre(genre)}
                    />
                  );
                })}
              </Box>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Salvar Alterações'}
                </Button>
              </Box>
            </Box>
          )}

          {/* ABA 1: APARÊNCIA & PALETAS */}
          {tabIndex === 1 && (
            <Box>
              <Typography variant="h6" mb={0.75}>Paleta de Cores do Site</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Clique em qualquer paleta abaixo para transformar imediatamente as cores de fundo, superfícies, botões e destaques de todo o MyTrackList.
              </Typography>

              <Grid container spacing={2.5}>
                {palettes.map((item) => {
                  const isSelected = item.id === paletteId;
                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                      <Box
                        onClick={() => selectPalette(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectPalette(item.id);
                          }
                        }}
                        sx={{
                          p: 2.25,
                          borderRadius: 3,
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: item.bg,
                          color: item.text,
                          transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            borderColor: item.primary,
                          },
                        }}
                      >
                        {/* Mini Preview da interface na paleta */}
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: item.surface,
                            border: `1px solid ${item.border}`,
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.primary }} />
                              <Box sx={{ width: 48, height: 7, borderRadius: 1, bgcolor: item.text, opacity: 0.85 }} />
                            </Box>
                            <Box sx={{ width: 28, height: 14, borderRadius: 99, bgcolor: item.primary }} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Box sx={{ flex: 1, height: 34, borderRadius: 1.5, bgcolor: item.elevated }} />
                            <Box sx={{ flex: 1, height: 34, borderRadius: 1.5, bgcolor: item.elevated, position: 'relative' }}>
                              <Box sx={{ position: 'absolute', bottom: 5, right: 5, width: 14, height: 6, borderRadius: 1, bgcolor: item.secondary }} />
                            </Box>
                            <Box sx={{ flex: 1, height: 34, borderRadius: 1.5, bgcolor: item.elevated }} />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: item.text }}>
                            {item.name}
                          </Typography>
                          {isSelected ? (
                            <CheckCircleIcon sx={{ color: item.primary, fontSize: 20 }} />
                          ) : (
                            <Typography variant="caption" sx={{ color: item.textMuted, fontWeight: 600 }}>
                              {item.mode === 'dark' ? 'Escuro' : 'Claro'}
                            </Typography>
                          )}
                        </Box>

                        <Typography variant="caption" display="block" sx={{ color: item.textMuted, mb: 1.5, minHeight: 32 }}>
                          {item.tagline}
                        </Typography>

                        {/* Amostras de cor */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            {[item.bg, item.surface, item.primary, item.secondary].map((hex, i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  bgcolor: hex,
                                  border: `1px solid ${item.border}`,
                                }}
                              />
                            ))}
                          </Box>
                          <Typography variant="caption" sx={{ color: item.textMuted, fontSize: '0.7rem' }}>
                            {item.inspiration}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* ABA 2: SEGURANÇA */}
          {tabIndex === 2 && (
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Typography variant="h6" mb={2}>Alterar Senha</Typography>

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
                error={Boolean(passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword)}
                helperText={
                  passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                    ? 'As senhas novas não coincidem.'
                    : ''
                }
              />

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Atualizar Senha'}
                </Button>
              </Box>
            </Box>
          )}

          {/* ABA 3: CONEXÕES */}
          {tabIndex === 3 && (
            <Box>
              <Typography variant="h6" mb={1}>Conexões de Terceiros</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Vincule sua conta do Spotify para exibir suas playlists, músicas recentes e Top Artistas/Músicas diretamente no perfil.
              </Typography>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>Spotify</Typography>
                    {spotifyConnected && (
                      <Chip size="small" label="Conectado" color="primary" sx={{ height: 22 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Importa playlists, histórico recente e estatísticas de audição.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {spotifyConnected ? (
                    <>
                      <Button variant="outlined" onClick={handleConnectSpotify} disabled={loading}>
                        Reconectar
                      </Button>
                      <Button variant="outlined" color="error" onClick={handleUnlinkSpotify} disabled={loading}>
                        Desvincular
                      </Button>
                    </>
                  ) : (
                    <Button variant="contained" onClick={handleConnectSpotify} disabled={loading}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Vincular Spotify'}
                    </Button>
                  )}
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                Se os seus dados do Spotify não carregarem após vincular, clique em <strong>Reconectar</strong> para renovar as permissões. Em aplicativos no Modo Desenvolvimento do Spotify, a conta Spotify precisa estar cadastrada em <em>User Management</em> no painel do Spotify Developer.
              </Alert>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default SettingsPage;
