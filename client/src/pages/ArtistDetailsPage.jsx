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

function ArtistDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      {/* Artist Profile Header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          alignItems: 'center', 
          gap: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
        }}
      >
        <Avatar
          src={artist.imageUrl}
          alt={artist.name}
          sx={{ width: 160, height: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        />
        <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
          <Chip label="ARTISTA" color="success" size="small" sx={{ fontWeight: 'bold', mb: 1 }} />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {artist.name}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' }, mb: 2 }}>
            {artist.genres?.map((genre, idx) => (
              <Chip key={idx} label={genre} variant="outlined" size="small" sx={{ textTransform: 'capitalize' }} />
            ))}
          </Box>

          {artist.followers > 0 && (
            <Typography variant="body2" color="text.secondary">
              {artist.followers.toLocaleString('pt-BR')} seguidores no Spotify
            </Typography>
          )}
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Top Tracks */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MusicNoteIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              Músicas Mais Populares
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
                        Avaliar
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
                      primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Albums & Singles */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AlbumIcon color="secondary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              Álbuns e Singles
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {artist.albums?.map((album) => (
              <Grid item xs={6} sm={4} key={album.id}>
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
                      sx={{ width: '100%', height: 130, borderRadius: '10px 10px 0 0' }}
                    />
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>
                        {album.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {album.releaseDate} • {album.totalTracks} faixas
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ArtistDetailsPage;
