import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAlbumDetails } from '../services/spotify';
import { getUserReviewForItem, saveReview } from '../services/reviews';
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
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import RatingInput from '../components/RatingInput';
import FriendsReviews from '../components/FriendsReviews';

function AlbumDetailsPage() {
  const { id: albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentReview, setCurrentReview] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [details, review] = await Promise.all([
          getAlbumDetails(albumId),
          getUserReviewForItem('album', albumId)
        ]);
        setAlbum(details);
        setCurrentReview(review);
        if (review?.review_text) setReviewText(review.review_text);
      } catch (err) {
        setError('Falha ao carregar os dados do álbum.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [albumId]);

  const handleRatingChange = async (newRating) => {
    setIsSubmitting(true);
    try {
      const existingReviewId = currentReview ? currentReview.id : null;
      const response = await saveReview('album', albumId, newRating, reviewText, existingReviewId);
      setCurrentReview({
        ...currentReview,
        id: existingReviewId || response.reviewId,
        rating: newRating,
        review_text: reviewText,
      });
      setSnackbarMessage('Avaliação salva com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Falha ao salvar avaliação.';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveText = async () => {
    if (!currentReview) return;
    setIsSubmitting(true);
    try {
      await saveReview('album', albumId, currentReview.rating, reviewText, currentReview.id);
      setCurrentReview({ ...currentReview, review_text: reviewText });
      setSnackbarMessage('Texto da review atualizado!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('Falha ao salvar texto.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const formatDuration = (ms) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!album) return <Typography>Álbum não encontrado.</Typography>;

  return (
    <Container>
      <Paper sx={{ p: 4, mt: 4 }}>
        <Grid container spacing={4}>
          {/* Capa do álbum */}
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              sx={{ width: '100%', height: 'auto', borderRadius: 2 }}
              alt={album.name}
              src={album.imageUrl}
            />
          </Grid>

          {/* Informações e avaliação */}
          <Grid item xs={12} md={8}>
            <Chip
              label={album.albumType === 'single' ? 'Single' : 'Álbum'}
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="h3" component="h1" gutterBottom>{album.name}</Typography>
            <Typography variant="h5" component="h2" color="text.secondary" gutterBottom>
              {album.artist}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {album.releaseDate?.slice(0, 4)} · {album.totalTracks} faixas
            </Typography>

            {/* Links para os artistas */}
            {album.artistIds && (
              <Box sx={{ mt: 1, mb: 2 }}>
                {album.artistIds.map((artistId, i) => (
                  <Button
                    key={artistId}
                    component={Link}
                    to={`/artist/${artistId}`}
                    size="small"
                    variant="text"
                    sx={{ mr: 1, textTransform: 'none' }}
                  >
                    Ver artista
                  </Button>
                ))}
              </Box>
            )}

            {/* Avaliação */}
            <RatingInput
              value={currentReview ? currentReview.rating : null}
              onChange={handleRatingChange}
              readOnly={isSubmitting}
            />
            {isSubmitting && <CircularProgress size={24} sx={{ ml: 2 }} />}

            {/* Texto da review */}
            {currentReview && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Sua review (opcional)"
                  multiline
                  rows={3}
                  fullWidth
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="O que você achou desse álbum?"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSaveText}
                  disabled={isSubmitting || reviewText === (currentReview.review_text || '')}
                >
                  Salvar texto
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Tracklist */}
        {album.tracks && album.tracks.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>Faixas</Typography>
            <List dense>
              {album.tracks.map((track, index) => (
                <React.Fragment key={track.id}>
                  <ListItem
                    component={Link}
                    to={`/music/${track.id}`}
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 32 }}>
                      {track.trackNumber}.
                    </Typography>
                    <ListItemText
                      primary={track.name}
                      secondary={formatDuration(track.durationMs)}
                    />
                  </ListItem>
                  {index < album.tracks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Seção "Following" estilo AniList */}
      <FriendsReviews itemType="album" itemId={albumId} />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AlbumDetailsPage;
