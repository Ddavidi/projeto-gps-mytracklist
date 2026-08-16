import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getAlbumDetails } from '../services/spotify';
import api from '../services/api';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Avatar, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  Button,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import AlbumIcon from '@mui/icons-material/Album';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';
import PlayButton from '../components/PlayButton';

function AlbumDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRatings, setUserRatings] = useState({});

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAlbumDetails(id);
        setAlbum(data);
        
        if (data.tracks && data.tracks.length > 0) {
          const items = data.tracks.map(t => ({ itemType: 'track', itemId: t.id }));
          try {
            const res = await api.post('/reviews/batch', { items });
            const ratingsMap = {};
            res.data.forEach(r => { ratingsMap[r.item_id] = r.rating; });
            setUserRatings(ratingsMap);
          } catch(err) {
            console.error('Failed to fetch track ratings', err);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Falha ao carregar os detalhes do álbum.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !album) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Álbum não encontrado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
        Voltar
      </Button>

      <Grid container spacing={4}>
        {/* Sidebar (Esquerda) */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Box
            component="img"
            sx={{ width: '100%', height: 'auto', borderRadius: 2, boxShadow: 3 }}
            alt={album.name}
            src={album.imageUrl}
          />
          
          <ScoreDistribution itemType="album" itemId={id} />

          <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
              Informação
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Tipo</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{album.albumType || 'Álbum'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Total de Faixas</Typography>
                <Typography variant="body2">{album.totalTracks}</Typography>
              </Box>
              {album.releaseDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Lançamento</Typography>
                  <Typography variant="body2">{album.releaseDate}</Typography>
                </Box>
              )}
              {album.label && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Gravadora</Typography>
                  <Typography variant="body2">{album.label}</Typography>
                </Box>
              )}
              {album.popularity > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                  <Typography variant="body2">{album.popularity}%</Typography>
                </Box>
              )}
            </Box>
          </Paper>


        </Grid>

        {/* Main Content (Direita) */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>{album.name}</Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
            {album.artist}
          </Typography>

          <Typography variant="h6" fontWeight="bold" gutterBottom>Avalie este Álbum</Typography>
          <ReviewSection itemType="album" itemId={id} itemData={{ name: album.name, imageUrl: album.imageUrl, previewUrl: null }} />

          <Divider sx={{ my: 4 }} />

          {/* Relações (Artist) */}
          {album.artistId && (
            <>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Relações</Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    component={RouterLink}
                    to={`/artist/${album.artistId}`}
                    elevation={1}
                    sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit', borderRadius: 2, transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    {album.artistImageUrl ? (
                      <Avatar src={album.artistImageUrl} alt={album.artist} sx={{ width: 48, height: 48 }} />
                    ) : (
                      <Avatar sx={{ width: 48, height: 48 }}>A</Avatar>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="primary" fontWeight="bold" display="block">ARTISTA</Typography>
                      <Typography variant="body1" fontWeight="bold" noWrap>{album.artist}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 4 }} />

          {/* Tracklist Section */}
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
            Faixas do Álbum
          </Typography>
          <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
            <List disablePadding>
              {album.tracks?.map((track, index) => (
                <React.Fragment key={track.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    sx={{
                      py: 1.5,
                      px: 2,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', mb: { xs: 1, sm: 0 } }}>
                      <Typography variant="body2" color="text.secondary" sx={{ width: 32, fontWeight: 600 }}>
                        {track.trackNumber || index + 1}
                      </Typography>
                      <ListItemText
                        primary={track.name}
                        secondary={track.artist !== album.artist && track.artist ? track.artist : null}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: { xs: 4, sm: 0 } }}>
                      {userRatings[track.id] && (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                          <StarIcon fontSize="small" />
                          <Typography variant="body2" fontWeight="bold" sx={{ ml: 0.5 }}>{userRatings[track.id]}/10</Typography>
                        </Box>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {formatDuration(track.durationMs)}
                      </Typography>
                      <PlayButton
                        track={{ id: track.id, name: track.name, artist: track.artist || album.artist, imageUrl: album.imageUrl, previewUrl: track.previewUrl }}
                        size="small"
                      />
                      <Button 
                        variant="outlined" 
                        size="small" 
                        component={RouterLink} 
                        to={`/track/${track.id}`}
                        startIcon={<MusicNoteIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        Ver
                      </Button>
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
          
          <Box sx={{ mt: 6 }}>
            <FriendsReviews itemType="album" itemId={id} />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AlbumDetailsPage;
