import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert, Card, CardMedia, CardContent, CardActionArea, Dialog, DialogTitle, DialogContent, IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ProfilePlaylists({ userId }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/spotify/user/${userId}/playlists`);
        setPlaylists(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Não foi possível carregar as playlists do Spotify.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchPlaylists();
  }, [userId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="info" sx={{ mt: 2 }}>{error}</Alert>;
  if (playlists.length === 0) return <Typography sx={{ mt: 2, color: 'text.secondary' }}>Nenhuma playlist encontrada.</Typography>;

  const handleOpenPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist);
    setTracksLoading(true);
    setTracksError(null);
    try {
      const res = await api.get(`/spotify/user/${userId}/playlists/${playlist.id}/tracks`);
      setPlaylistTracks(res.data);
    } catch (err) {
      setTracksError('Erro ao carregar músicas da playlist.');
    } finally {
      setTracksLoading(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {playlists.map((playlist) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={playlist.id}>
          <Card elevation={0} sx={{ bgcolor: 'background.default', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardActionArea onClick={() => handleOpenPlaylist(playlist)} sx={{ flexGrow: 1 }}>
              <CardMedia
                component="img"
                height="200"
                image={playlist.imageUrl || 'https://via.placeholder.com/200?text=Sem+Capa'}
                alt={playlist.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {playlist.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {playlist.tracksTotal} músicas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  De: {playlist.owner}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>

      {/* Dialog de Músicas da Playlist */}
      <Dialog open={!!selectedPlaylist} onClose={() => setSelectedPlaylist(null)} maxWidth="md" fullWidth>
        {selectedPlaylist && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">{selectedPlaylist.name}</Typography>
              <IconButton onClick={() => setSelectedPlaylist(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {tracksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : tracksError ? (
                <Alert severity="error">{tracksError}</Alert>
              ) : playlistTracks.length === 0 ? (
                <Typography color="text.secondary">Esta playlist não possui músicas válidas.</Typography>
              ) : (
                <List disablePadding>
                  {playlistTracks.map((track, i) => (
                    <ListItem key={track.id + i} sx={{ px: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <ListItemAvatar>
                        <Avatar variant="square" src={track.imageUrl} sx={{ borderRadius: 1 }} />
                      </ListItemAvatar>
                      <ListItemText 
                        primary={track.name} 
                        secondary={track.artist}
                        primaryTypographyProps={{ variant: 'body1', fontWeight: 'bold' }}
                      />
                      <Button 
                        variant="outlined" 
                        size="small" 
                        color="primary"
                        onClick={() => navigate(`/music/${track.id}`)}
                      >
                        Avaliar
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
