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
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import api from '../../services/api';
import { formatTime } from '../../utils/date';

export default function ProfileSpotifyStats({ userId, isOwner = false }) {
  const [timeRange, setTimeRange] = useState('short_term');
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
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchStats();
  }, [userId, timeRange]);

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

  return (
    <Box sx={{ mt: 1 }}>
      {partialWarning && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5 }}>
          {partialWarning}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h6">Estatísticas do Spotify</Typography>
        <ToggleButtonGroup
          color="primary"
          value={timeRange}
          exclusive
          onChange={(e, newRange) => newRange && setTimeRange(newRange)}
          size="small"
        >
          <ToggleButton value="short_term">4 Semanas</ToggleButton>
          <ToggleButton value="medium_term">6 Meses</ToggleButton>
          <ToggleButton value="long_term">1 Ano</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* Top 10 Músicas */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Top 10 Músicas
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

        {/* Top 10 Artistas */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02), borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Top 10 Artistas
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

        {/* Últimas Escutadas */}
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
      </Grid>
    </Box>
  );
}
