import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getArtistDetails } from '../services/spotify';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Avatar, 
  CircularProgress, 
  Alert, 
  Grid,
  Card,
  CardActionArea,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';

function ArtistDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [albumFilter, setAlbumFilter] = useState('Todos');

  useEffect(() => {
    const fetchArtist = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getArtistDetails(id);
        setArtist(data);
      } catch (err) {
        console.error(err);
        setError('Falha ao carregar os detalhes do artista.');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !artist) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Artista não encontrado.'}</Alert>
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
            alt={artist.name}
            src={artist.imageUrl}
          />
          
          <ScoreDistribution itemType="artist" itemId={id} />

          <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
              Informação
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Tipo</Typography>
                <Typography variant="body2" fontWeight="bold">Artista</Typography>
              </Box>
              {artist.followers > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Seguidores</Typography>
                  <Typography variant="body2">{artist.followers.toLocaleString('pt-BR')}</Typography>
                </Box>
              )}
              {artist.popularity > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                  <Typography variant="body2">{artist.popularity}%</Typography>
                </Box>
              )}
              {artist.genres && artist.genres.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Gêneros</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {artist.genres.map((genre, idx) => (
                      <Chip key={idx} label={genre} variant="outlined" size="small" sx={{ textTransform: 'capitalize', fontSize: '0.7rem', height: 20 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>


        </Grid>

        {/* Main Content (Direita) */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>{artist.name}</Typography>

          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>Avalie este Artista</Typography>
          <ReviewSection itemType="artist" itemId={id} itemData={{ name: artist.name, imageUrl: artist.imageUrl, previewUrl: null }} />

          <Divider sx={{ my: 4 }} />

          <Grid container spacing={4} sx={{ mt: 1 }}>
            {/* Top Tracks */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MusicNoteIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  Top Músicas
                </Typography>
              </Box>
              <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                  {artist.topTracks?.slice(0, 8).map((track, index) => (
                    <React.Fragment key={track.id}>
                      {index > 0 && <Divider component="li" />}
                      <ListItem
                        secondaryAction={
                          <Button 
                            variant="outlined" 
                            size="small" 
                            component={RouterLink} 
                            to={`/music/${track.id}`}
                            sx={{ borderRadius: 2 }}
                          >
                            Ver
                          </Button>
                        }
                        sx={{ py: 1.5, px: 2, '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <ListItemAvatar>
                          <Avatar variant="square" src={track.imageUrl} alt={track.name} sx={{ width: 44, height: 44, borderRadius: 1.5 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={track.name}
                          secondary={track.album}
                          primaryTypographyProps={{ fontWeight: 600, noWrap: true, fontSize: '0.85rem' }}
                          secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Albums & Singles */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AlbumIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h5" fontWeight="bold">
                    Álbuns e Singles
                  </Typography>
                </Box>
                <Box>
                  <Chip 
                    label="Todos" 
                    onClick={() => setAlbumFilter('Todos')} 
                    color={albumFilter === 'Todos' ? 'secondary' : 'default'}
                    variant={albumFilter === 'Todos' ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ mr: 0.5 }}
                  />
                  <Chip 
                    label="Álbuns" 
                    onClick={() => setAlbumFilter('album')} 
                    color={albumFilter === 'album' ? 'secondary' : 'default'}
                    variant={albumFilter === 'album' ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ mr: 0.5 }}
                  />
                  <Chip 
                    label="Singles/EPs" 
                    onClick={() => setAlbumFilter('single')} 
                    color={albumFilter === 'single' ? 'secondary' : 'default'}
                    variant={albumFilter === 'single' ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
              </Box>
              <Grid container spacing={2}>
                {artist.albums?.filter(a => albumFilter === 'Todos' || a.albumType === albumFilter).map((album) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={album.id}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        borderRadius: 2.5,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 }
                      }}
                    >
                      <CardActionArea component={RouterLink} to={`/album/${album.id}`}>
                        <Avatar
                          variant="square"
                          src={album.imageUrl}
                          alt={album.name}
                          sx={{ width: '100%', height: 110, borderRadius: '10px 10px 0 0' }}
                        />
                        <Box sx={{ p: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ fontSize: '0.8rem' }}>
                            {album.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                            {album.releaseDate}
                          </Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>


          <Box sx={{ mt: 6 }}>
            <FriendsReviews itemType="artist" itemId={id} />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ArtistDetailsPage;
