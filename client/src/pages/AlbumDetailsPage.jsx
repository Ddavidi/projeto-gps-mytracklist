import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getAlbumDetails } from '../services/spotify';
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
  Chip
} from '@mui/material';
import AlbumIcon from '@mui/icons-material/Album';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function AlbumDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAlbumDetails(id);
        setAlbum(data);
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
        Voltar
      </Button>

      {/* Album Header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          borderRadius: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          alignItems: 'center', 
          gap: 3,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
        }}
      >
        <Avatar
          variant="square"
          src={album.imageUrl}
          alt={album.name}
          sx={{ width: 180, height: 180, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        />
        <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
          <Chip label="ÁLBUM" color="secondary" size="small" sx={{ fontWeight: 'bold', mb: 1 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {album.name}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {album.artist}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {album.releaseDate ? `Lançamento: ${album.releaseDate} • ` : ''}{album.totalTracks} faixas
          </Typography>
        </Box>
      </Paper>

      {/* Tracklist Section */}
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        Faixas do Álbum
      </Typography>

      <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List disablePadding>
          {album.tracks?.map((track, index) => (
            <React.Fragment key={track.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                secondaryAction={
                  <Button 
                    variant="outlined" 
                    size="small" 
                    component={RouterLink} 
                    to={`/music/${track.id}`}
                    startIcon={<MusicNoteIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    Avaliar
                  </Button>
                }
                sx={{
                  py: 1.5,
                  px: 2,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ width: 32, fontWeight: 600 }}>
                  {track.trackNumber || index + 1}
                </Typography>
                <ListItemText
                  primary={track.name}
                  secondary={track.artist !== album.artist ? track.artist : null}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                  {formatDuration(track.durationMs)}
                </Typography>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default AlbumDetailsPage;
