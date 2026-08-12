import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import api from '../../services/api';

export default function ProfileSpotifyStats({ userId }) {
  const [timeRange, setTimeRange] = useState('short_term'); // short_term, medium_term, long_term
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [tracksRes, artistsRes, recentRes] = await Promise.all([
          api.get(`/spotify/user/${userId}/top/tracks?time_range=${timeRange}`),
          api.get(`/spotify/user/${userId}/top/artists?time_range=${timeRange}`),
          api.get(`/spotify/user/${userId}/recent`)
        ]);
        setTopTracks(tracksRes.data);
        setTopArtists(artistsRes.data);
        setRecentTracks(recentRes.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Não foi possível carregar as estatísticas do Spotify.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchStats();
  }, [userId, timeRange]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="info" sx={{ mt: 2 }}>{error}</Alert>;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">Estatísticas do Spotify</Typography>
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

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Top 10 Músicas</Typography>
            <List disablePadding>
              {topTracks.slice(0, 10).map((track, index) => (
                <React.Fragment key={track.id + index}>
                  <ListItem sx={{ px: 0 }}>
                    <Typography variant="body2" sx={{ width: 24, fontWeight: 'bold', color: 'text.secondary' }}>
                      {index + 1}
                    </Typography>
                    <ListItemAvatar>
                      <Avatar src={track.imageUrl} variant="square" sx={{ borderRadius: 1 }} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={track.name} 
                      secondary={track.artist}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItem>
                  {index < 9 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Top 10 Artistas</Typography>
            <List disablePadding>
              {topArtists.slice(0, 10).map((artist, index) => (
                <React.Fragment key={artist.id + index}>
                  <ListItem sx={{ px: 0 }}>
                    <Typography variant="body2" sx={{ width: 24, fontWeight: 'bold', color: 'text.secondary' }}>
                      {index + 1}
                    </Typography>
                    <ListItemAvatar>
                      <Avatar src={artist.imageUrl} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={artist.name} 
                      secondary={artist.genres?.slice(0,2).join(', ')}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItem>
                  {index < 9 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Últimas Escutadas</Typography>
            <List disablePadding>
              {recentTracks.slice(0, 10).map((track, index) => (
                <React.Fragment key={track.id + index + track.playedAt}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar src={track.imageUrl} variant="square" sx={{ borderRadius: 1 }} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={track.name} 
                      secondary={`${track.artist} • ${new Date(track.playedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItem>
                  {index < 9 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
