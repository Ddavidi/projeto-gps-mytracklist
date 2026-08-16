import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTrackDetails } from '../services/spotify';

import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Snackbar,
  TextField,
  Button,
  Divider,
  Avatar,
} from '@mui/material';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';
import PlayButton from '../components/PlayButton';
import { Link as RouterLink } from 'react-router-dom';

function TrackDetailsPage() {
  const { id: trackId } = useParams();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        setLoading(true);
        setError('');
        const details = await getTrackDetails(trackId);
        setTrack(details);
      } catch (err) {
        setError('Falha ao carregar os dados da música.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [trackId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!track) {
    return <Typography>Música não encontrada.</Typography>;
  }

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Sidebar (Esquerda) */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Box
            component="img"
            sx={{ width: '100%', height: 'auto', borderRadius: 2, boxShadow: 3 }}
            alt={track.name}
            src={track.imageUrl}
          />
          
          <ScoreDistribution itemType="track" itemId={trackId} />

          <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
              Informação
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Tipo</Typography>
                <Typography variant="body2" fontWeight="bold">Música</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Duração</Typography>
                <Typography variant="body2">{formatDuration(track.durationMs)}</Typography>
              </Box>
              {track.releaseDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Lançamento</Typography>
                  <Typography variant="body2">{track.releaseDate}</Typography>
                </Box>
              )}
              {track.popularity > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                  <Typography variant="body2">{track.popularity}%</Typography>
                </Box>
              )}
            </Box>
          </Paper>


        </Grid>

        {/* Main Content (Direita) */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h3" component="h1" fontWeight="bold">{track.name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
            <Typography variant="h6" color="text.secondary">{track.artist}</Typography>
            <PlayButton
              track={{ id: track.id, name: track.name, artist: track.artist, imageUrl: track.imageUrl, previewUrl: track.previewUrl }}
              filled
              size="medium"
            />
          </Box>

          <Typography variant="h6" fontWeight="bold" gutterBottom>Avalie esta Música</Typography>
          <ReviewSection itemType="track" itemId={trackId} itemData={{ name: track.name, imageUrl: track.imageUrl, previewUrl: track.previewUrl }} />

          <Divider sx={{ my: 4 }} />

          {/* Relações (Artist / Album) */}
          {(track.artistId || track.albumId) && (
            <>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Relações</Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {track.artistId && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper
                      component={RouterLink}
                      to={`/artist/${track.artistId}`}
                      elevation={1}
                      sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit', borderRadius: 2, transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      {track.artistImageUrl ? (
                        <Avatar src={track.artistImageUrl} alt={track.artist} sx={{ width: 48, height: 48 }} />
                      ) : (
                        <Avatar sx={{ width: 48, height: 48 }}>A</Avatar>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="primary" fontWeight="bold" display="block">ARTISTA</Typography>
                        <Typography variant="body1" fontWeight="bold" noWrap>{track.artist}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                )}
                {track.albumId && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper
                      component={RouterLink}
                      to={`/album/${track.albumId}`}
                      elevation={1}
                      sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit', borderRadius: 2, transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      {track.imageUrl ? (
                        <Avatar variant="square" src={track.imageUrl} alt={track.album} sx={{ width: 48, height: 48, borderRadius: 1 }} />
                      ) : (
                        <Avatar variant="square" sx={{ width: 48, height: 48, borderRadius: 1 }}>AL</Avatar>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="secondary" fontWeight="bold" display="block">ÁLBUM</Typography>
                        <Typography variant="body1" fontWeight="bold" noWrap>{track.album}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          <Divider sx={{ my: 4 }} />
          
          <Box sx={{ mt: 2 }}>
            <FriendsReviews itemType="track" itemId={trackId} />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default TrackDetailsPage;
