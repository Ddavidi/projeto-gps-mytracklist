import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  Collapse,
  alpha,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import RepeatIcon from '@mui/icons-material/Repeat';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import RatingInput from './RatingInput';
import BirthDateField from './BirthDateField';
import { getUserReviewForItem, saveReview } from '../services/reviews';
import { VIBE_TAGS } from '../constants/vibes';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ReviewSection({ itemType, itemId, itemData = {}, onReviewSaved, trackAverageInfo = null }) {
  const [currentReview, setCurrentReview] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [listenedAt, setListenedAt] = useState(getTodayIso());
  const [isRelisten, setIsRelisten] = useState(false);
  const [vibeTags, setVibeTags] = useState([]);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        setReviewText(review?.review_text || '');
        setListenedAt(review?.listened_at || getTodayIso());
        setIsRelisten(Boolean(review?.is_relisten));
        setVibeTags(Array.isArray(review?.vibe_tags) ? review.vibe_tags : []);
        setHasSpoiler(Boolean(review?.has_spoiler));
      } catch (err) {
        console.error('Falha ao carregar avaliação:', err);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchReview();
  }, [itemType, itemId]);

  const persistReview = async (ratingToSave, overrides = {}) => {
    setIsSubmitting(true);
    try {
      const existingReviewId = currentReview ? currentReview.id : null;
      const metadata = {
        itemName: itemData.name,
        itemImageUrl: itemData.imageUrl,
        itemPreviewUrl: itemData.previewUrl,
      };
      const extras = {
        listenedAt: overrides.listenedAt ?? listenedAt,
        isRelisten: overrides.isRelisten ?? isRelisten,
        vibeTags: overrides.vibeTags ?? vibeTags,
        hasSpoiler: overrides.hasSpoiler ?? hasSpoiler,
      };
      const textToSave = overrides.reviewText ?? reviewText;

      const response = await saveReview(
        itemType,
        itemId,
        ratingToSave,
        textToSave,
        existingReviewId,
        metadata,
        extras
      );

      setCurrentReview({
        ...currentReview,
        id: existingReviewId || response.reviewId,
        rating: ratingToSave,
        review_text: textToSave,
        listened_at: extras.listenedAt,
        is_relisten: extras.isRelisten,
        vibe_tags: extras.vibeTags,
        has_spoiler: extras.hasSpoiler,
      });

      if (onReviewSaved) onReviewSaved();

      setSnackbarMessage('Avaliação salva com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Falha ao salvar avaliação:', err);
      setSnackbarMessage(err.response?.data?.error || 'Falha ao salvar avaliação. Tente novamente.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVibe = (tag) => {
    setVibeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 4 ? [...prev, tag] : prev
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Carregando sua avaliação...</Typography>
      </Box>
    );
  }

  const displayRating = currentReview ? currentReview.rating : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography variant="h6">Sua Avaliação</Typography>
        {trackAverageInfo && trackAverageInfo.count > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.6,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              border: '1px solid',
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
            }}
          >
            <AutoAwesomeOutlinedIcon color="primary" sx={{ fontSize: 16 }} />
            <Typography variant="caption" color="text.primary">
              Média das faixas: <Box component="span" className="mtl-mono" fontWeight={700}>{trackAverageInfo.average.toFixed(1)}</Box>{' '}
              ({trackAverageInfo.count}/{trackAverageInfo.total})
            </Typography>
            <Button
              size="small"
              variant="contained"
              sx={{ py: 0.25, px: 1.1, minWidth: 0, fontSize: '0.72rem' }}
              disabled={isSubmitting}
              onClick={() => persistReview(Math.round(trackAverageInfo.average))}
            >
              Aplicar {Math.round(trackAverageInfo.average)}
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <RatingInput
          value={displayRating}
          onChange={(newRating) => persistReview(newRating)}
          readOnly={isSubmitting}
        />
        {isSubmitting && <CircularProgress size={20} sx={{ ml: 2 }} />}
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
            placeholder="Conte o que achou da produção, letras, momentos marcantes..."
            variant="outlined"
            sx={{ mb: 1.5 }}
          />

          {/* Tags de Vibe */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
              Vibes da audição (até 4)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {VIBE_TAGS.map((tag) => {
                const active = vibeTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    clickable
                    color={active ? 'secondary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    onClick={() => toggleVibe(tag)}
                  />
                );
              })}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Button size="small" color="inherit" onClick={() => setShowAdvanced((s) => !s)} sx={{ color: 'text.secondary', px: 0.5 }}>
              {showAdvanced ? 'Ocultar opções de Diário e Spoiler' : 'Opções de Diário, Re-audição e Spoiler'}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => persistReview(currentReview.rating)}
              disabled={isSubmitting}
            >
              Salvar detalhes
            </Button>
          </Box>

          <Collapse in={showAdvanced}>
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2.5,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <BirthDateField
                size="small"
                label="Data em que ouviu (Diário)"
                value={listenedAt}
                onChange={(iso) => iso && setListenedAt(iso)}
                sx={{ maxWidth: 240 }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={isRelisten} onChange={(e) => setIsRelisten(e.target.checked)} color="primary" />}
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <RepeatIcon fontSize="small" />
                      <Typography variant="body2">Re-audição (já ouvi antes)</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch size="small" checked={hasSpoiler} onChange={(e) => setHasSpoiler(e.target.checked)} color="warning" />}
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityOffOutlinedIcon fontSize="small" />
                      <Typography variant="body2">Contém spoiler</Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 96 }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ReviewSection;
