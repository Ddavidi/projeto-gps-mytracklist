import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { getTrackDetails } from '../services/spotify';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Button,
  Avatar,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';
import PlayButton from '../components/PlayButton';
import MediaActionBar from '../components/MediaActionBar';
import { formatCalendarDate } from '../utils/date';

function TrackDetailsPage() {
  const { id: trackId } = useParams();
  const navigate = useNavigate();
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;
  }

  if (error || !track) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Música não encontrada.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <Box className="mtl-reveal">
      <Box sx={{ position: 'relative', overflow: 'hidden', pb: 2 }}>
        {track.imageUrl && (
          <Box
            sx={{
              position: 'absolute',
              inset: -40,
              backgroundImage: `url(${track.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(52px) saturate(1.25)',
              opacity: 0.22,
              pointerEvents: 'none',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.25)} 0%, ${theme.palette.background.default} 92%)`,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 3 }}>
          <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate(-1)} sx={{ mb: 2.5, color: 'text.secondary' }}>
            Voltar
          </Button>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box
                component="img"
                sx={{
                  width: '100%',
                  maxWidth: { xs: 280, md: '100%' },
                  mx: { xs: 'auto', md: 0 },
                  display: 'block',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                }}
                alt={track.name}
                src={track.imageUrl}
              />

              <ScoreDistribution itemType="track" itemId={trackId} />

              <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  Ficha Técnica
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Duração</Typography>
                    <Typography variant="body2" className="mtl-mono">{formatDuration(track.durationMs)}</Typography>
                  </Box>
                  {track.releaseDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Lançamento</Typography>
                      <Typography variant="body2" className="mtl-mono">{formatCalendarDate(track.releaseDate)}</Typography>
                    </Box>
                  )}
                  {track.popularity > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                      <Typography variant="body2" className="mtl-mono">{track.popularity}%</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.9rem', sm: '2.6rem' } }}>
                  {track.name}
                </Typography>
                <PlayButton
                  track={{ id: track.id, name: track.name, artist: track.artist, imageUrl: track.imageUrl, previewUrl: track.previewUrl }}
                  filled
                  size="medium"
                />
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                {track.artist}
              </Typography>

              <MediaActionBar
                itemType="track"
                itemId={trackId}
                itemName={track.name}
                itemArtist={track.artist}
                itemImageUrl={track.imageUrl}
              />

              <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5, mb: 4 }}>
                <ReviewSection itemType="track" itemId={trackId} itemData={{ name: track.name, imageUrl: track.imageUrl, previewUrl: track.previewUrl }} />
              </Paper>

              {(track.artistId || track.albumId) && (
                <Box sx={{ mb: 5 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                    Relações
                  </Typography>
                  <Grid container spacing={2}>
                    {track.artistId && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper
                          component={RouterLink}
                          to={`/artist/${track.artistId}`}
                          sx={{
                            p: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            textDecoration: 'none',
                            color: 'inherit',
                            borderRadius: 3,
                            transition: 'border-color 0.2s ease',
                            '&:hover': { borderColor: 'primary.main' },
                          }}
                        >
                          <Avatar src={track.artistImageUrl} alt={track.artist} sx={{ width: 52, height: 52 }}>
                            {track.artist?.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="primary" fontWeight={700} display="block">Artista</Typography>
                            <Typography variant="subtitle1" fontWeight={700} noWrap>{track.artist}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                    {track.albumId && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper
                          component={RouterLink}
                          to={`/album/${track.albumId}`}
                          sx={{
                            p: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            textDecoration: 'none',
                            color: 'inherit',
                            borderRadius: 3,
                            transition: 'border-color 0.2s ease',
                            '&:hover': { borderColor: 'primary.main' },
                          }}
                        >
                          <Avatar variant="rounded" src={track.imageUrl} alt={track.album} sx={{ width: 52, height: 52 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="secondary" fontWeight={700} display="block">Álbum</Typography>
                            <Typography variant="subtitle1" fontWeight={700} noWrap>{track.album}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Avaliações da Comunidade
              </Typography>
              <FriendsReviews itemType="track" itemId={trackId} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default TrackDetailsPage;
