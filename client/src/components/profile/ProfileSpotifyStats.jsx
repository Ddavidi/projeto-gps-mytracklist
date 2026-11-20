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
import StarIcon from '@mui/icons-material/Star';
import api from '../../services/api';
import { getUserDiary } from '../../services/reviews';
import { formatTime } from '../../utils/date';

export default function ProfileSpotifyStats({ userId, isOwner = false }) {
  const currentYear = new Date().getFullYear();
  const [timeRange, setTimeRange] = useState('short_term'); // last_week | short_term | medium_term | long_term | year
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [topTracks, setTopTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partialWarning, setPartialWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        setPartialWarning(null);

        if (timeRange === 'year') {
          // Filtragem por Ano Específico usando o histórico de avaliações e Diário do usuário
          try {
            const diaryRes = await getUserDiary(userId);
            if (cancelled) return;
            const entries = Array.isArray(diaryRes) ? diaryRes : [];
            const yearPrefix = String(selectedYear);
            const yearEntries = entries.filter((e) => {
              const dateStr = String(e.diary_date || e.listened_at || e.createdAt || '');
              return dateStr.startsWith(yearPrefix);
            });

            const tracks = yearEntries
              .filter((e) => e.item_type === 'track')
              .sort((a, b) => Number(b.rating) - Number(a.rating))
              .map((item) => ({
                id: item.item_id,
                name: item.item_name || 'Música',
                artist: `Nota ${item.rating}/10`,
                imageUrl: item.item_image_url || '',
                rating: item.rating,
              }));

            const albums = yearEntries
              .filter((e) => e.item_type === 'album')
              .sort((a, b) => Number(b.rating) - Number(a.rating))
              .map((item) => ({
                id: item.item_id,
                name: item.item_name || 'Álbum',
                artist: `Nota ${item.rating}/10`,
                imageUrl: item.item_image_url || '',
                rating: item.rating,
              }));

            const artists = yearEntries
              .filter((e) => e.item_type === 'artist')
              .sort((a, b) => Number(b.rating) - Number(a.rating))
              .map((item) => ({
                id: item.item_id,
                name: item.item_name || 'Artista',
                imageUrl: item.item_image_url || '',
                genres: [`Nota ${item.rating}/10`],
                rating: item.rating,
              }));

            setTopTracks(tracks);
            setTopAlbums(albums);
            setTopArtists(artists);
            setRecentTracks([]);
          } catch (yearErr) {
            if (cancelled) return;
            console.error('Erro ao buscar estatísticas por ano:', yearErr);
            setTopTracks([]);
            setTopAlbums([]);
            setTopArtists([]);
            setRecentTracks([]);
            setPartialWarning(`Não foi possível carregar os registros do ano de ${selectedYear}.`);
          }
        } else if (timeRange === 'last_week') {
          // Última Semana: agrega reproduções recentes do Spotify nos últimos 7 dias
          try {
            const recentRes = await api.get(`/spotify/user/${userId}/recent`);
            if (cancelled) return;
            const allRecent = Array.isArray(recentRes.data) ? recentRes.data : [];
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

            const weekTracks = allRecent.filter((t) => {
              if (!t.playedAt) return true;
              const ts = new Date(t.playedAt).getTime();
              return !Number.isNaN(ts) && ts >= sevenDaysAgo;
            });

            // Conta frequência de músicas na última semana
            const trackCountMap = new Map();
            const artistCountMap = new Map();

            for (const t of weekTracks) {
              const existingTrack = trackCountMap.get(t.id) || { ...t, playCount: 0 };
              existingTrack.playCount += 1;
              trackCountMap.set(t.id, existingTrack);

              const artistName = t.artist || 'Artista';
              const primaryArtist = artistName.split(',')[0].trim();
              const existingArtist = artistCountMap.get(primaryArtist) || {
                id: t.artistId || t.id,
                name: primaryArtist,
                imageUrl: t.imageUrl || '',
                playCount: 0,
                isTrackFallback: !t.artistId,
              };
              existingArtist.playCount += 1;
              artistCountMap.set(primaryArtist, existingArtist);
            }

            const rankedTracks = Array.from(trackCountMap.values())
              .sort((a, b) => b.playCount - a.playCount)
              .map((t) => ({
                ...t,
                artist: `${t.artist} · ${t.playCount}x`,
              }));

            const rankedArtists = Array.from(artistCountMap.values())
              .sort((a, b) => b.playCount - a.playCount)
              .map((a) => ({
                ...a,
                genres: [`${a.playCount} ${a.playCount === 1 ? 'reprodução' : 'reproduções'} na semana`],
              }));

            setTopTracks(rankedTracks);
            setTopAlbums([]);
            setTopArtists(rankedArtists);
            setRecentTracks(weekTracks);
          } catch (weekErr) {
            if (cancelled) return;
            setError(weekErr?.response?.data?.error || 'Não foi possível carregar o histórico da última semana no Spotify.');
          }
        } else {
          // Busca direta na API do Spotify: 1 mês (short_term), 6 meses (medium_term) ou Desde a criação (long_term)
          const [tracksRes, artistsRes, recentRes] = await Promise.allSettled([
            api.get(`/spotify/user/${userId}/top/tracks?time_range=${timeRange}`),
            api.get(`/spotify/user/${userId}/top/artists?time_range=${timeRange}`),
            api.get(`/spotify/user/${userId}/recent`),
          ]);

          if (cancelled) return;

          const okTracks = tracksRes.status === 'fulfilled' ? tracksRes.value.data || [] : [];
          const okArtists = artistsRes.status === 'fulfilled' ? artistsRes.value.data || [] : [];
          const okRecent = recentRes.status === 'fulfilled' ? recentRes.value.data || [] : [];

          setTopTracks(okTracks);
          setTopAlbums([]);
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
        if (!cancelled) setLoading(false);
      }
    };

    if (userId) fetchStats();
    return () => {
      cancelled = true;
    };
  }, [userId, timeRange, selectedYear]);

  const availableYears = Array.from({ length: 8 }, (_, idx) => currentYear - idx);

  return (
    <Box sx={{ mt: 1 }}>
      {/* Seletor de Período Flexível (sempre visível para permitir alternar mesmo em caso de erro) */}
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
            Spotify Stats
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {timeRange === 'last_week' && 'Músicas e artistas mais tocados nos últimos 7 dias'}
            {timeRange === 'short_term' && 'Mais ouvidos no último mês (aprox. 30 dias)'}
            {timeRange === 'medium_term' && 'Mais ouvidos nos últimos 6 meses'}
            {timeRange === 'long_term' && 'Análise de todo o histórico acumulado desde a criação da conta'}
            {timeRange === 'year' && `Melhores músicas, álbuns e artistas registrados no ano de ${selectedYear}`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            color="primary"
            value={timeRange}
            exclusive
            onChange={(e, newRange) => newRange && setTimeRange(newRange)}
            size="small"
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="last_week">Última Semana</ToggleButton>
            <ToggleButton value="short_term">1 Mês</ToggleButton>
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
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
      ) : (
        <>
          {partialWarning && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5 }}>
              {partialWarning}
            </Alert>
          )}

          {timeRange === 'year' && topTracks.length === 0 && topAlbums.length === 0 && topArtists.length === 0 && (
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2.5 }}>
              Nenhum registro encontrado para o ano de <strong>{selectedYear}</strong>. Como a API do Spotify não oferece histórico separado por ano passado, a visão por ano usa os itens avaliados e datados no seu Diário em {selectedYear}.
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Coluna 1: Top Músicas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                  Top Músicas {timeRange === 'year' ? `(${selectedYear})` : ''}
                </Typography>
                {topTracks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sem músicas registradas neste período.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {topTracks.slice(0, 10).map((track, index) => (
                      <React.Fragment key={`${track.id}-${index}`}>
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
                          {track.rating !== undefined && (
                            <Chip
                              size="small"
                              icon={<StarIcon sx={{ fontSize: 13, color: '#f59e0b !important' }} />}
                              label={track.rating}
                              sx={{ height: 22, fontWeight: 700 }}
                            />
                          )}
                        </ListItemButton>
                        {index < Math.min(topTracks.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Coluna 2: Top Álbuns (no modo Por Ano) OU Top Artistas (no modo Spotify) */}
            {timeRange === 'year' ? (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Top Álbuns ({selectedYear})
                  </Typography>
                  {topAlbums.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sem álbuns avaliados em {selectedYear}.
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {topAlbums.slice(0, 10).map((album, index) => (
                        <React.Fragment key={`${album.id}-${index}`}>
                          <ListItemButton component={Link} to={`/album/${album.id}`} sx={{ px: 1, borderRadius: 1.5 }}>
                            <Typography variant="caption" className="mtl-mono" sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>
                              {String(index + 1).padStart(2, '0')}
                            </Typography>
                            <ListItemAvatar sx={{ minWidth: 48 }}>
                              <Avatar src={album.imageUrl} variant="rounded" sx={{ width: 38, height: 38 }} />
                            </ListItemAvatar>
                            <ListItemText
                              primary={album.name}
                              secondary={album.artist}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                            />
                            <Chip
                              size="small"
                              icon={<StarIcon sx={{ fontSize: 13, color: '#f59e0b !important' }} />}
                              label={album.rating}
                              sx={{ height: 22, fontWeight: 700 }}
                            />
                          </ListItemButton>
                          {index < Math.min(topAlbums.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            ) : (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Top Artistas
                  </Typography>
                  {topArtists.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sem histórico suficiente neste período.
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {topArtists.slice(0, 10).map((artist, index) => (
                        <React.Fragment key={`${artist.id}-${index}`}>
                          <ListItemButton
                            component={Link}
                            to={artist.isTrackFallback ? `/track/${artist.id}` : `/artist/${artist.id}`}
                            sx={{ px: 1, borderRadius: 1.5 }}
                          >
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
            )}

            {/* Coluna 3: Top Artistas (no modo Por Ano) OU Últimas Escutadas (no modo Spotify) */}
            {timeRange === 'year' ? (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Top Artistas ({selectedYear})
                  </Typography>
                  {topArtists.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sem artistas avaliados em {selectedYear}.
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {topArtists.slice(0, 10).map((artist, index) => (
                        <React.Fragment key={`${artist.id}-${index}`}>
                          <ListItemButton component={Link} to={`/artist/${artist.id}`} sx={{ px: 1, borderRadius: 1.5 }}>
                            <Typography variant="caption" className="mtl-mono" sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>
                              {String(index + 1).padStart(2, '0')}
                            </Typography>
                            <ListItemAvatar sx={{ minWidth: 48 }}>
                              <Avatar src={artist.imageUrl} sx={{ width: 38, height: 38 }} />
                            </ListItemAvatar>
                            <ListItemText
                              primary={artist.name}
                              secondary={artist.genres?.[0] || 'Artista'}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                            />
                            <Chip
                              size="small"
                              icon={<StarIcon sx={{ fontSize: 13, color: '#f59e0b !important' }} />}
                              label={artist.rating}
                              sx={{ height: 22, fontWeight: 700 }}
                            />
                          </ListItemButton>
                          {index < Math.min(topArtists.length, 10) - 1 && <Divider sx={{ opacity: 0.5 }} />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            ) : (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3, height: '100%' }}>
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
                        <React.Fragment key={`${track.id}-${index}-${track.playedAt}`}>
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
        </>
      )}
    </Box>
  );
}
