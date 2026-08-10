import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import RatingInput from './RatingInput';
import { getUserReviewForItem, saveReview } from '../services/reviews';

function ReviewSection({ itemType, itemId }) {
  const [currentReview, setCurrentReview] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      try {
        const review = await getUserReviewForItem(itemType, itemId);
        setCurrentReview(review);
        if (review?.review_text) setReviewText(review.review_text);
      } catch (err) {
        console.error('Falha ao carregar avaliação:', err);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchReview();
  }, [itemType, itemId]);

  const handleRatingChange = async (newRating) => {
    setIsSubmitting(true);
    try {
      const existingReviewId = currentReview ? currentReview.id : null;
      const response = await saveReview(itemType, itemId, newRating, reviewText, existingReviewId);

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
      console.error('Falha ao salvar avaliação:', err);
      const errorMessage = err.response?.data?.error || 'Falha ao salvar avaliação. Tente novamente.';
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
      await saveReview(itemType, itemId, currentReview.rating, reviewText, currentReview.id);
      setCurrentReview({ ...currentReview, review_text: reviewText });
      setSnackbarMessage('Texto da review atualizado!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Falha ao salvar texto da review.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}><CircularProgress size={24} sx={{ mr: 2 }} /> Carregando avaliação...</Box>;
  }

  const displayRating = currentReview ? currentReview.rating : null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Sua Avaliação
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <RatingInput
          value={displayRating}
          onChange={handleRatingChange}
          readOnly={isSubmitting}
        />
        {isSubmitting && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Box>

      {currentReview && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Sua review (opcional)"
            multiline
            rows={3}
            fullWidth
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="O que você achou?"
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
    </Box>
  );
}

export default ReviewSection;
