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
  FormControlLabel,
  Switch,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import api from '../services/api';
import { getCloseFriends, addCloseFriend, removeCloseFriend, getFollowing } from '../services/social';
import { updateListenLaterVisibility } from '../services/listenLater';
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
    is_private: false,
  });
  const [listenLaterVisibility, setListenLaterVisibility] = useState('public');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // Close Friends state
  const [closeFriends, setCloseFriends] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [cfSearch, setCfSearch] = useState('');
  const [cfSearchResults, setCfSearchResults] = useState([]);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfBusyId, setCfBusyId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('spotify_connected') === 'true') {
      setMessage('Conta do Spotify vinculada com sucesso! Seus dados já podem ser carregados no perfil.');
      setTabIndex(5);
      refreshUser();
    } else if (params.get('spotify_error')) {
      setError(`Erro ao vincular Spotify: ${params.get('spotify_error')}`);
      setTabIndex(5);
    } else if (params.get('tab') === 'appearance') {
      setTabIndex(1);
    } else if (params.get('tab') === 'privacy') {
      setTabIndex(2);
    } else if (params.get('tab') === 'close-friends') {
      setTabIndex(3);
    } else if (params.get('tab') === 'security') {
      setTabIndex(4);
    } else if (params.get('tab') === 'connections') {
      setTabIndex(5);
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
        is_private: Boolean(user.is_private),
      });
      setListenLaterVisibility(user.listen_later_visibility || (user.listen_later_is_public === false ? 'private' : 'public'));
      setSpotifyConnected(Boolean(user.spotify_connected));
    }
  }, [user]);

  useEffect(() => {
    const uid = user?.id || user?.userId;
    if (tabIndex === 3 && uid) {
      setCfLoading(true);
      Promise.all([
        getCloseFriends().catch(() => []),
        getFollowing(uid).catch(() => []),
      ])
        .then(([cf, following]) => {
          setCloseFriends(cf || []);
          setFollowingList((following || []).filter((u) => u.id !== uid));
        })
        .finally(() => setCfLoading(false));
    }
  }, [tabIndex, user]);

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
      await api.put('/auth/profile', {
        name: profileData.name,
        gender: profileData.gender,
        birthDate: profileData.birthDate,
        bio: profileData.bio,
        favoriteGenres: profileData.favoriteGenres,
      });
      await refreshUser();
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccountPrivacy = async (checked) => {
    setProfileData((prev) => ({ ...prev, is_private: checked }));
    setPrivacySaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.put('/auth/profile', { is_private: checked });
      await refreshUser();
      setMessage(checked ? 'Seu perfil agora é privado.' : 'Seu perfil agora é público.');
    } catch (err) {
      setProfileData((prev) => ({ ...prev, is_private: !checked }));
      setError(err.response?.data?.error || 'Erro ao salvar privacidade da conta.');
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleListenLaterVisibilityChange = async (e, nextVal) => {
    if (!nextVal || nextVal === listenLaterVisibility) return;
    const prev = listenLaterVisibility;
    setListenLaterVisibility(nextVal);
    setPrivacySaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateListenLaterVisibility(nextVal);
      await refreshUser();
      setMessage('Privacidade da lista Quero Ouvir atualizada!');
    } catch {
      setListenLaterVisibility(prev);
      setError('Erro ao atualizar privacidade de Quero Ouvir.');
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleCfSearch = async (e) => {
    e.preventDefault();
    if (!cfSearch.trim()) {
      setCfSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/users/search', { params: { q: cfSearch.trim() } });
      const uid = user?.id || user?.userId;
      setCfSearchResults((res.data || []).filter((u) => u.id !== uid));
    } catch {
      setCfSearchResults([]);
    }
  };

  const handleToggleCloseFriend = async (targetUser) => {
    const isAdded = closeFriends.some((cf) => cf.id === targetUser.id);
    setCfBusyId(targetUser.id);
    try {
      if (isAdded) {
        await removeCloseFriend(targetUser.id);
        setCloseFriends((prev) => prev.filter((cf) => cf.id !== targetUser.id));
      } else {
        await addCloseFriend(targetUser.id);
        setCloseFriends((prev) => [targetUser, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao atualizar Close Friends.');
    } finally {
      setCfBusyId(null);
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
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }} className="mtl-reveal">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 0.75, fontSize: { xs: '1.85rem', md: '2.25rem' } }}>
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personalize seu perfil, escolha as cores do site, gerencie sua privacidade e conexões.
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
            <Tab icon={<ShieldOutlinedIcon fontSize="small" />} iconPosition="start" label="Privacidade" />
            <Tab icon={<StarIcon fontSize="small" sx={{ color: '#22c55e' }} />} iconPosition="start" label="Close Friends" />
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
                    onChange={(isoDate) => setProfileData({ ...profileData, birthDate: isoDate })}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3.5 }} />

              <Typography variant="h6" mb={0.75}>Gêneros Favoritos</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Selecione os gêneros que melhor representam o seu perfil musical.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {MUSIC_GENRES.map((genre) => {
                  const active = profileData.favoriteGenres.includes(genre);
                  return (
                    <Chip
                      key={genre}
                      label={genre}
                      clickable
                      onClick={() => toggleGenre(genre)}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      icon={active ? <CheckIcon fontSize="small" /> : undefined}
                      sx={{ fontWeight: active ? 700 : 500 }}
                    />
                  );
                })}
              </Box>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={loading} sx={{ px: 3, py: 1, fontWeight: 700, borderRadius: 2 }}>
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
                          bgcolor: (theme) =>
                            isSelected ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.text.primary, 0.02),
                          transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            height: 62,
                            borderRadius: 2,
                            mb: 2,
                            p: 1.5,
                            bgcolor: item.bg,
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {(item.swatches || [item.bg, item.surface, item.primary, item.secondary]).map((hex, idx) => (
                              <Box
                                key={`${item.id}-${idx}`}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: hex,
                                  border: '2px solid rgba(255,255,255,0.2)',
                                }}
                              />
                            ))}
                          </Box>
                          <Box
                            sx={{
                              px: 1.25,
                              py: 0.4,
                              borderRadius: 1.5,
                              bgcolor: item.primary,
                              color: item.primaryContrast,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            {item.mode === 'dark' ? 'Escuro' : 'Claro'}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {item.name}
                          </Typography>
                          {isSelected && <CheckCircleIcon color="primary" fontSize="small" />}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
                          {item.tagline}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* ABA 2: PRIVACIDADE (Dedicada) */}
          {tabIndex === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} mb={0.5}>
                  Privacidade da Conta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Controle quem pode ver seu perfil, sua fila Quero Ouvir e suas avaliações.
                </Typography>
              </Box>

              {/* Card 1: Perfil Privado ou Público */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ maxWidth: '54ch' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {profileData.is_private ? (
                      <LockOutlinedIcon color="warning" fontSize="small" />
                    ) : (
                      <PublicOutlinedIcon color="primary" fontSize="small" />
                    )}
                    <Typography variant="subtitle1" fontWeight={700}>
                      {profileData.is_private ? 'Perfil Privado' : 'Perfil Público'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {profileData.is_private
                      ? 'Apenas amigos que seguem você conseguem ver suas avaliações, tier lists e diário. Visitantes de fora veem apenas sua foto de perfil e capa.'
                      : 'Qualquer pessoa da comunidade pode visitar seu perfil e explorar suas avaliações e listas públicas.'}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={profileData.is_private ? 'private' : 'public'}
                  onChange={(e, val) => {
                    if (val !== null) {
                      handleToggleAccountPrivacy(val === 'private');
                    }
                  }}
                  disabled={privacySaving}
                >
                  <ToggleButton value="public" sx={{ textTransform: 'none', gap: 0.6, px: 2 }}>
                    <PublicOutlinedIcon sx={{ fontSize: 16 }} /> Público
                  </ToggleButton>
                  <ToggleButton
                    value="private"
                    sx={{
                      textTransform: 'none',
                      gap: 0.6,
                      px: 2,
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                        color: 'warning.main',
                      },
                    }}
                  >
                    <LockOutlinedIcon sx={{ fontSize: 16 }} /> Privado
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>

              {/* Card 2: Visibilidade de Quero Ouvir */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Visibilidade da lista "Quero Ouvir"
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Defina quem pode abrir e visualizar a sua lista de músicas, álbuns e artistas que você planeja escutar.
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={listenLaterVisibility}
                  onChange={handleListenLaterVisibilityChange}
                  disabled={privacySaving}
                  sx={{ flexWrap: 'wrap' }}
                >
                  <ToggleButton value="public" sx={{ textTransform: 'none', gap: 0.6, px: 2 }}>
                    <PublicOutlinedIcon sx={{ fontSize: 16 }} /> Pública
                  </ToggleButton>
                  <ToggleButton
                    value="close_friends"
                    sx={{
                      textTransform: 'none',
                      gap: 0.6,
                      px: 2,
                      '&.Mui-selected': {
                        bgcolor: alpha('#16a34a', 0.2),
                        color: '#22c55e',
                        borderColor: alpha('#22c55e', 0.5),
                      },
                    }}
                  >
                    <StarIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Close Friends
                  </ToggleButton>
                  <ToggleButton
                    value="private"
                    sx={{
                      textTransform: 'none',
                      gap: 0.6,
                      px: 2,
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                        color: 'warning.main',
                      },
                    }}
                  >
                    <LockOutlinedIcon sx={{ fontSize: 16 }} /> Privada
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>

              {/* Card 3: Atalho para Close Friends */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <StarIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Lista de Close Friends
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Escolha os amigos que terão acesso às suas reviews e listas marcadas como Close Friends.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setTabIndex(3)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Gerenciar Close Friends
                </Button>
              </Paper>
            </Box>
          )}

          {/* ABA 3: CLOSE FRIENDS */}
          {tabIndex === 3 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <StarIcon sx={{ color: '#22c55e' }} />
                <Typography variant="h6" fontWeight={700}>
                  Close Friends ({closeFriends.length})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Escolha os amigos que fazem parte da sua lista de <strong>Close Friends</strong>. Reviews e listas marcadas como Close Friends ficam visíveis apenas para as pessoas desta lista.
              </Typography>

              {/* Buscar usuários */}
              <Box component="form" onSubmit={handleCfSearch} sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Pesquisar amigo pelo nome de usuário..."
                  value={cfSearch}
                  onChange={(e) => setCfSearch(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" size="small" color="primary">
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {cfSearchResults.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Resultados da pesquisa
                  </Typography>
                  <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
                    {cfSearchResults.map((u) => {
                      const inList = closeFriends.some((cf) => cf.id === u.id);
                      return (
                        <ListItem
                          key={u.id}
                          secondaryAction={
                            <Button
                              size="small"
                              variant={inList ? 'contained' : 'outlined'}
                              disabled={cfBusyId === u.id}
                              onClick={() => handleToggleCloseFriend(u)}
                              startIcon={<StarIcon sx={{ fontSize: 15 }} />}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 700,
                                ...(inList
                                  ? { bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }
                                  : { borderColor: alpha('#22c55e', 0.5), color: '#22c55e' }),
                              }}
                            >
                              {inList ? 'Nos Close Friends' : 'Adicionar'}
                            </Button>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar src={u.avatar_url}>{u.username?.charAt(0).toUpperCase()}</Avatar>
                          </ListItemAvatar>
                          <ListItemText primary={`@${u.username}`} secondary={u.name || ''} />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {cfLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={26} />
                </Box>
              ) : (
                <>
                  {/* Lista Atual de Close Friends */}
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
                    Sua lista atual ({closeFriends.length})
                  </Typography>
                  {closeFriends.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 2.5,
                        textAlign: 'center',
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Você ainda não adicionou ninguém aos seus Close Friends.
                      </Typography>
                    </Paper>
                  ) : (
                    <List disablePadding sx={{ mb: 3, border: '1px solid', borderColor: alpha('#22c55e', 0.35), borderRadius: 2.5, overflow: 'hidden' }}>
                      {closeFriends.map((friend) => (
                        <ListItem
                          key={friend.id}
                          secondaryAction={
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={cfBusyId === friend.id}
                              onClick={() => handleToggleCloseFriend(friend)}
                              sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                              Remover
                            </Button>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar src={friend.avatar_url}>{friend.username?.charAt(0).toUpperCase()}</Avatar>
                          </ListItemAvatar>
                          <ListItemText primary={`@${friend.username}`} secondary={friend.name || 'Close Friend'} />
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {/* Todos os usuários que você segue */}
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
                    Pessoas que você segue ({followingList.length})
                  </Typography>
                  {followingList.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        textAlign: 'center',
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Você ainda não segue ninguém. Use a barra de pesquisa acima para encontrar amigos.
                      </Typography>
                    </Paper>
                  ) : (
                    <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
                      {followingList.map((u) => {
                        const inList = closeFriends.some((cf) => cf.id === u.id);
                        return (
                          <ListItem
                            key={u.id}
                            secondaryAction={
                              <Button
                                size="small"
                                variant={inList ? 'contained' : 'outlined'}
                                disabled={cfBusyId === u.id}
                                onClick={() => handleToggleCloseFriend(u)}
                                startIcon={<StarIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  ...(inList
                                    ? { bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }
                                    : { borderColor: alpha('#22c55e', 0.5), color: '#22c55e' }),
                                }}
                              >
                                {inList ? 'Nos Close Friends' : 'Adicionar'}
                              </Button>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar src={u.avatar_url}>{u.username?.charAt(0).toUpperCase()}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={`@${u.username}`} secondary={u.name || ''} />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </>
              )}
            </Box>
          )}

          {/* ABA 4: SEGURANÇA */}
          {tabIndex === 4 && (
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
              <TextField
                fullWidth
                type="password"
                label="Nova Senha"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                margin="normal"
                required
                helperText="Mínimo de 10 caracteres, incluindo letras e números ou símbolos."
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

          {/* ABA 5: CONEXÕES */}
          {tabIndex === 5 && (
            <Box>
              <Typography variant="h6" mb={1}>Conexões</Typography>
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
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default SettingsPage;
