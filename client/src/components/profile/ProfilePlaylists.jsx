import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert, Card, CardMedia, CardContent, CardActionArea, Dialog, DialogTitle, DialogContent, IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ReviewSection from '../ReviewSection';
import StarIcon from '@mui/icons-material/Star';

export default function ProfilePlaylists({ userId, reviews = [] }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  const [selectedTrackForReview, setSelectedTrackForReview] = useState(null);
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
          <Card 
            elevation={2} 
            sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
            }}
          >
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
                  {playlistTracks.map((track, i) => {
                    const userReview = reviews.find(r => r.item_id === track.id && r.item_type === 'track');
                    const hasRated = !!userReview;
                    
                    return (
                    <ListItem 
                      key={track.id + i} 
                      sx={{ 
                        px: 2, 
                        py: 1.5,
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar variant="square" src={track.imageUrl} sx={{ borderRadius: 1, width: 48, height: 48, mr: 1 }} />
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="bold" noWrap>
                              {track.name}
                            </Typography>
                            {hasRated && (
                              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(237, 108, 2, 0.1)', color: 'warning.main', px: 1, py: 0.2, borderRadius: 1 }}>
                                <StarIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                <Typography variant="caption" fontWeight="bold">{userReview.rating}</Typography>
                              </Box>
                            )}
                          </Box>
                        }
                        secondary={track.artist}
                        sx={{ m: 0 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant={hasRated ? "contained" : "outlined"} 
                          size="small" 
                          color="primary"
                          onClick={() => setSelectedTrackForReview(track)}
                          sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                          {hasRated ? 'Editar Nota' : 'Avaliar'}
                        </Button>
                        <Button 
                          variant="text" 
                          size="small" 
                          color="inherit"
                          onClick={() => navigate(`/track/${track.id}`)}
                        >
                          Detalhes
                        </Button>
                      </Box>
                    </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Dialog para Avaliação Rápida */}
      <Dialog open={!!selectedTrackForReview} onClose={() => setSelectedTrackForReview(null)} maxWidth="sm" fullWidth>
        {selectedTrackForReview && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Avaliar Música</Typography>
              <IconButton onClick={() => setSelectedTrackForReview(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar variant="square" src={selectedTrackForReview.imageUrl} sx={{ width: 64, height: 64, borderRadius: 1, mr: 2 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">{selectedTrackForReview.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedTrackForReview.artist}</Typography>
                </Box>
              </Box>
              
              <ReviewSection 
                itemType="track" 
                itemId={selectedTrackForReview.id} 
                itemData={{ 
                  name: selectedTrackForReview.name, 
                  imageUrl: selectedTrackForReview.imageUrl, 
                  previewUrl: selectedTrackForReview.previewUrl 
                }} 
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button 
                  variant="text" 
                  onClick={() => navigate(`/track/${selectedTrackForReview.id}`)}
                >
                  Ver todos os detalhes da música
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
