import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Select,
  MenuItem,
  Chip,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import api from '../../services/api';
import { getUserDiary } from '../../services/reviews';
import { formatTime } from '../../utils/date';

export default function ProfileSpotifyStats({ userId, isOwner = false }) {
  const currentYear = new Date().getFullYear();
  const [timeRange, setTimeRange] = useState('long_term'); // Padrão: Todo o Histórico (Desde a criação da conta)
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partialWarning, setPartialWarning] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        setPartialWarning(null);

        if (timeRange === 'year') {
          // Filtragem por Ano Específico: busca as audições do diário e avaliações do ano escolhido
          const diaryRes = await getUserDiary(userId);
          const yearPrefix = String(selectedYear);
          const yearEntries = (diaryRes || []).filter((e) => String(e.diary_date || '').startsWith(yearPrefix));

          // Agrupa músicas do ano
          const trackMap = new Map();
          const artistMap = new Map();

          for (const item of yearEntries) {
            if (item.item_type === 'track') {
              trackMap.set(item.item_id, {
                id: item.item_id,
                name: item.item_name,
                artist: item.item_artist || '',
                imageUrl: item.item_image_url || '',
                rating: item.rating,
              });
            } else if (item.item_type === 'album') {
              if (item.item_artist) {
                artistMap.set(item.item_artist, {
                  id: item.item_id,
                  name: item.item_artist,
                  imageUrl: item.item_image_url || '',
                  genres: item.vibe_tags || [],
                });
              }
            }
          }

          setTopTracks(Array.from(trackMap.values()).sort((a, b) => b.rating - a.rating));
          setTopArtists(Array.from(artistMap.values()));
          setRecentTracks([]);
        } else {
          // Busca direta na API do Spotify: 4 semanas, 6 meses ou Todo o Histórico (Desde a criação)
          const [tracksRes, artistsRes, recentRes] = await Promise.allSettled([
            api.get(`/spotify/user/${userId}/top/tracks?time_range=${timeRange}`),
            api.get(`/spotify/user/${userId}/top/artists?time_range=${timeRange}`),
            api.get(`/spotify/user/${userId}/recent`),
          ]);

          const okTracks = tracksRes.status === 'fulfilled' ? tracksRes.value.data || [] : [];
          const okArtists = artistsRes.status === 'fulfilled' ? artistsRes.value.data || [] : [];
          const okRecent = recentRes.status === 'fulfilled' ? recentRes.value.data || [] : [];

          setTopTracks(okTracks);
          setTopArtists(okArtists);
          setRecentTracks(okRecent);

          const failed = [tracksRes, artistsRes, recentRes].filter((r) => r.status === 'rejected');
          if (failed.length === 3) {
            const firstErr = failed[0].reason;
            setError(firstErr?.response?.data?.error || 'Não foi possível carregar as estatísticas do Spotify.');
          } else if (failed.length > 0) {
            const firstErr = failed[0].reason;
            setPartialWarning(firstErr?.response?.data?.error || 'Algumas seções do Spotify não puderam ser carregadas.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchStats();
  }, [userId, timeRange, selectedYear]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="info"
        sx={{ mt: 2, borderRadius: 2.5 }}
        action={
          isOwner ? (
            <Button
              component={Link}
              to="/settings?tab=connections"
              color="inherit"
              size="small"
              startIcon={<SettingsOutlinedIcon fontSize="small" />}
            >
              Conexões
            </Button>
          ) : null
        }
      >
        {error}
      </Alert>
    );
  }

  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

  return (
    <Box sx={{ mt: 1 }}>
      {partialWarning && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5 }}>
          {partialWarning}
        </Alert>
      )}

      {/* Seletor de Período Flexível */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
          p: 2,
          borderRadius: 3,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Estatísticas Musicais
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {timeRange === 'long_term' && 'Análise de todo o histórico desde que a conta foi criada'}
            {timeRange === 'medium_term' && 'Últimos 6 meses'}
            {timeRange === 'short_term' && 'Últimas 4 semanas (recente)'}
            {timeRange === 'year' && `Retrospectiva filtrada pelo ano de ${selectedYear}`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            color="primary"
            value={timeRange}
            exclusive
            onChange={(e, newRange) => newRange && setTimeRange(newRange)}
            size="small"
          >
            <ToggleButton value="short_term">4 Semanas</ToggleButton>
            <ToggleButton value="medium_term">6 Meses</ToggleButton>
            <ToggleButton value="long_term" sx={{ display: 'inline-flex', gap: 0.5 }}>
              <AllInclusiveIcon sx={{ fontSize: 16 }} /> Desde a criação
            </ToggleButton>
            <ToggleButton value="year" sx={{ display: 'inline-flex', gap: 0.5 }}>
              <CalendarTodayIcon sx={{ fontSize: 15 }} /> Por Ano
            </ToggleButton>
          </ToggleButtonGroup>

          {timeRange === 'year' && (
            <Select
              size="small"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{ minWidth: 96, height: 34, fontSize: '0.82rem', fontWeight: 700 }}
            >
              {availableYears.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Top Músicas */}
        <Grid size={{ xs: 12, md: timeRange === 'year' ? 6 : 4 }}>
          <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Top Músicas {timeRange === 'year' ? `de ${selectedYear}` : ''}
            </Typography>
            {topTracks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem histórico suficiente neste período.
              </Typography>
            ) : (
              <List disablePadding>
                {topTracks.slice(0, 10).map((track, index) => (
                  <React.Fragment key={track.id + index}>
                    <ListItemButton component={Link} to={`/track/${track.id}`} sx={{ px: 1, borderRadius: 1.5 }}>
                      <Typography variant="caption" className="mtl-mono" sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>
                        {String(index + 1).padStart(2, '0')}
                      </Typography>
                      <ListItemAvatar sx={{ minWidth: 48 }}>
                        <Avatar src={track.imageUrl} variant="rounded" sx={{ width: 38, height: 38 }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={track.name}
                        secondary={track.artist}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                    {index < Math.min(topTracks.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Top Artistas */}
        <Grid size={{ xs: 12, md: timeRange === 'year' ? 6 : 4 }}>
          <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Top Artistas {timeRange === 'year' ? `de ${selectedYear}` : ''}
            </Typography>
            {topArtists.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem histórico suficiente neste período.
              </Typography>
            ) : (
              <List disablePadding>
                {topArtists.slice(0, 10).map((artist, index) => (
                  <React.Fragment key={artist.id + index}>
                    <ListItemButton component={Link} to={`/artist/${artist.id}`} sx={{ px: 1, borderRadius: 1.5 }}>
                      <Typography variant="caption" className="mtl-mono" sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>
                        {String(index + 1).padStart(2, '0')}
                      </Typography>
                      <ListItemAvatar sx={{ minWidth: 48 }}>
                        <Avatar src={artist.imageUrl} sx={{ width: 38, height: 38 }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={artist.name}
                        secondary={artist.genres?.slice(0, 2).join(', ') || 'Artista'}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { textTransform: 'capitalize' } }}
                      />
                    </ListItemButton>
                    {index < Math.min(topArtists.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Últimas Escutadas (apenas para modo Spotify live) */}
        {timeRange !== 'year' && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                Últimas Escutadas
              </Typography>
              {recentTracks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma música reproduzida recentemente.
                </Typography>
              ) : (
                <List disablePadding>
                  {recentTracks.slice(0, 10).map((track, index) => (
                    <React.Fragment key={track.id + index + track.playedAt}>
                      <ListItemButton component={Link} to={`/track/${track.id}`} sx={{ px: 1, borderRadius: 1.5 }}>
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Avatar src={track.imageUrl} variant="rounded" sx={{ width: 38, height: 38 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={track.name}
                          secondary={`${track.artist} · ${formatTime(track.playedAt)}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                      {index < Math.min(recentTracks.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
