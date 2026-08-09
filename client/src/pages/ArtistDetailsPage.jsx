import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArtistDetails } from '../services/spotify';
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
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
} from '@mui/material';
import RatingInput from '../components/RatingInput';
import FriendsReviews from '../components/FriendsReviews';

function ArtistDetailsPage() {
  const { id: artistId } = useParams();
  const [artist, setArtist] = useState(null);
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
          getArtistDetails(artistId),
          getUserReviewForItem('artist', artistId)
        ]);
        setArtist(details);
        setCurrentReview(review);
        if (review?.review_text) setReviewText(review.review_text);
      } catch (err) {
        setError('Falha ao carregar os dados do artista.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [artistId]);

  const handleRatingChange = async (newRating) => {
    setIsSubmitting(true);
    try {
      const existingReviewId = currentReview ? currentReview.id : null;
      const response = await saveReview('artist', artistId, newRating, reviewText, existingReviewId);
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
      await saveReview('artist', artistId, currentReview.rating, reviewText, currentReview.id);
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

  const formatFollowers = (count) => {
    if (!count) return '';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M seguidores`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K seguidores`;
    return `${count} seguidores`;
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!artist) return <Typography>Artista não encontrado.</Typography>;

  return (
    <Container>
      <Paper sx={{ p: 4, mt: 4 }}>
        <Grid container spacing={4}>
          {/* Foto do artista */}
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              sx={{ width: '100%', height: 'auto', borderRadius: '50%', aspectRatio: '1/1', objectFit: 'cover' }}
              alt={artist.name}
              src={artist.imageUrl}
            />
          </Grid>

          {/* Informações e avaliação */}
          <Grid item xs={12} md={8}>
            <Typography variant="overline" color="text.secondary">Artista</Typography>
            <Typography variant="h3" component="h1" gutterBottom>{artist.name}</Typography>

            {artist.followers && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatFollowers(artist.followers)}
              </Typography>
            )}

            {/* Gêneros */}
            {artist.genres && artist.genres.length > 0 && (
              <Box sx={{ mt: 1, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {artist.genres.slice(0, 5).map((genre) => (
                  <Chip key={genre} label={genre} size="small" variant="outlined" />
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
                  placeholder="O que você acha desse artista?"
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

        {/* Top Tracks */}
        {artist.topTracks && artist.topTracks.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>Músicas Populares</Typography>
            <Grid container spacing={2}>
              {artist.topTracks.map((track) => (
                <Grid item xs={12} sm={6} md={4} key={track.id}>
                  <Card>
                    <CardActionArea component={Link} to={`/music/${track.id}`}>
                      <CardMedia
                        component="img"
                        height="120"
                        image={track.imageUrl}
                        alt={track.name}
                      />
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" noWrap>{track.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {track.album}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Seção "Following" estilo AniList */}
      <FriendsReviews itemType="artist" itemId={artistId} />

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

export default ArtistDetailsPage;
