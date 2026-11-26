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
  Paper,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RepeatIcon from '@mui/icons-material/Repeat';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StarIcon from '@mui/icons-material/Star';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RatingInput from './RatingInput';
import BirthDateField from './BirthDateField';
import { getUserReviewForItem, saveReview, deleteReview } from '../services/reviews';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(iso) {
  if (!iso) return '';
  const parts = String(iso).slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

function ReviewSection({ itemType, itemId, itemData = {}, onReviewSaved, trackAverageInfo = null, defaultEditing = false }) {
  const [currentReview, setCurrentReview] = useState(null);
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [isExpanded, setIsExpanded] = useState(defaultEditing);

  const [rating, setRating] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [listenedAt, setListenedAt] = useState(getTodayIso());
  const [isRelisten, setIsRelisten] = useState(false);
  const [vibeTags, setVibeTags] = useState([]);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [visibility, setVisibility] = useState('public'); // 'public' | 'close_friends' | 'private'
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const syncReviewState = (review) => {
    setCurrentReview(review);
    if (review && review.rating !== undefined && review.rating !== null) {
      setRating(Number(review.rating));
      setReviewText(review.review_text || '');
      setListenedAt(review.listened_at || getTodayIso());
      setIsRelisten(Boolean(review.is_relisten));
      setVibeTags(Array.isArray(review.vibe_tags) ? review.vibe_tags : []);
      setHasSpoiler(Boolean(review.has_spoiler));
      setVisibility(review.visibility || 'public');
    } else {
      setRating(null);
      setReviewText('');
      setListenedAt(getTodayIso());
      setIsRelisten(false);
      setVibeTags([]);
      setHasSpoiler(false);
      setVisibility('public');
    }
    setIsEditing(Boolean(defaultEditing));
    setIsExpanded(Boolean(defaultEditing));
  };

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      try {
        const review = await getUserReviewForItem(itemType, itemId);
        syncReviewState(review);
      } catch (err) {
        console.error('Falha ao carregar avaliação:', err);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchReview();
  }, [itemType, itemId]);

  const handleSaveReview = async (overrideRating = null) => {
    const targetRating = overrideRating !== null ? overrideRating : rating;

    // Validação estrita: não é permitido avaliar sem colocar alguma nota
    if (targetRating === null || targetRating === undefined || isNaN(targetRating) || targetRating < 0 || targetRating > 10) {
      setSnackbarMessage('É obrigatório selecionar uma nota de 0 a 10 para salvar sua avaliação.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const existingReviewId = currentReview ? currentReview.id : null;
      const metadata = {
        itemName: itemData.name,
        itemImageUrl: itemData.imageUrl,
        itemPreviewUrl: itemData.previewUrl,
      };
      const extras = {
        listenedAt,
        isRelisten,
        vibeTags,
        hasSpoiler,
        visibility,
      };

      const response = await saveReview(
        itemType,
        itemId,
        targetRating,
        reviewText,
        existingReviewId,
        metadata,
        extras
      );

      const updated = {
        ...(currentReview || {}),
        id: existingReviewId || response.reviewId,
        rating: targetRating,
        review_text: reviewText,
        listened_at: extras.listenedAt,
        is_relisten: extras.isRelisten,
        vibe_tags: extras.vibeTags,
        has_spoiler: extras.hasSpoiler,
        visibility: extras.visibility,
      };

      syncReviewState(updated);

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

  const handleCancelEdit = () => {
    syncReviewState(currentReview);
  };

  const handleDeleteReview = async () => {
    if (!currentReview?.id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    setIsSubmitting(true);
    try {
      await deleteReview(currentReview.id);
      syncReviewState(null);
      setIsEditing(false);
      setIsExpanded(false);
      setSnackbarMessage('Avaliação excluída com sucesso.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      if (onReviewSaved) onReviewSaved(null);
    } catch (err) {
      console.error('Erro ao excluir review:', err);
      setSnackbarMessage(err.response?.data?.error || 'Não foi possível excluir a avaliação.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Carregando sua avaliação...</Typography>
      </Box>
    );
  }

  const hasReview = Boolean(currentReview && currentReview.rating !== undefined && currentReview.rating !== null);

  // ==========================================
  // 1. MODO COLAPSADO (Ainda não avaliado)
  // ==========================================
  if (!hasReview && !isEditing) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
              Sua Avaliação
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Você ainda não avaliou este item.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<RateReviewOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIsEditing(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                px: 2,
              }}
            >
              Fazer Review
            </Button>
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}
              title="Expandir para fazer review"
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    );
  }

  // ==========================================
  // 2. MODO LEITURA (Quando o usuário já avaliou)
  // ==========================================
  if (hasReview && !isEditing) {
    const revVisibility = currentReview.visibility || 'public';

    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
              Sua Avaliação
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.25,
                py: 0.35,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
              }}
            >
              <StarIcon sx={{ fontSize: 17, color: '#f59e0b' }} />
              <Typography variant="body2" fontWeight={800} className="mtl-mono">
                {currentReview.rating}/10
              </Typography>
            </Box>

            {revVisibility === 'close_friends' && (
              <Chip
                size="small"
                label="⭐ Close Friends"
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  bgcolor: alpha('#16a34a', 0.16),
                  color: '#22c55e',
                  border: '1px solid',
                  borderColor: alpha('#22c55e', 0.4),
                }}
              />
            )}
            {revVisibility === 'private' && (
              <Chip
                size="small"
                icon={<LockOutlinedIcon sx={{ fontSize: 13 }} />}
                label="Privada"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.72rem', fontWeight: 700 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIsEditing(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              Editar Avaliação
            </Button>
            {currentReview.review_text && (
              <IconButton
                size="small"
                onClick={() => setIsExpanded((e) => !e)}
                sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}
                title={isExpanded ? 'Contrair detalhes' : 'Expandir detalhes'}
              >
                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Resumo compacto de leitura */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: currentReview.review_text || isExpanded ? 1.5 : 0, flexWrap: 'wrap' }}>
          <RatingInput value={currentReview.rating} readOnly />
          {currentReview.listened_at && (
            <Chip
              size="small"
              icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 14 }} />}
              label={`Ouvido em ${formatDateDisplay(currentReview.listened_at)}`}
              variant="outlined"
              sx={{ fontSize: '0.75rem', borderColor: 'divider' }}
            />
          )}
          {currentReview.is_relisten && (
            <Chip
              size="small"
              icon={<RepeatIcon sx={{ fontSize: 14 }} />}
              label="Re-audição"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          {currentReview.has_spoiler && (
            <Chip
              size="small"
              icon={<VisibilityOffOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Spoiler"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Box>

        {/* Texto da Review (com suporte a expandir/contrair) */}
        {currentReview.review_text && (
          <Box
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative',
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                maxHeight: isExpanded ? 'none' : '4.8em',
                overflow: 'hidden',
                textOverflow: isExpanded ? 'clip' : 'ellipsis',
              }}
            >
              "{currentReview.review_text}"
            </Typography>
            {currentReview.review_text.length > 180 && (
              <Button
                size="small"
                onClick={() => setIsExpanded((e) => !e)}
                sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none', fontSize: '0.78rem', color: 'primary.main' }}
              >
                {isExpanded ? 'Mostrar menos' : 'Ler review completa'}
              </Button>
            )}
          </Box>
        )}
      </Paper>
    );
  }

  // ==========================================
  // 3. MODO EDIÇÃO (Criando ou Editando avaliação)
  // ==========================================
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
        border: '1px solid',
        borderColor: 'primary.main',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>
          {hasReview ? 'Editar Sua Avaliação' : 'Fazer Review'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                onClick={() => setRating(Math.round(trackAverageInfo.average))}
              >
                Aplicar {Math.round(trackAverageInfo.average)}
              </Button>
            </Box>
          )}
          <IconButton
            size="small"
            onClick={handleCancelEdit}
            sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}
            title="Contrair"
          >
            <ExpandLessIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Seleção de Nota (Obrigatória) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
        <Typography variant="caption" color={rating === null ? 'error' : 'text.secondary'} fontWeight={600}>
          {rating === null ? '⚠️ Escolha uma nota de 0 a 10 (obrigatório):' : `Sua nota: ${rating}/10`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RatingInput
            value={rating}
            onChange={(newRating) => setRating(newRating)}
            readOnly={isSubmitting}
          />
          {isSubmitting && <CircularProgress size={20} />}
        </Box>
      </Box>

      {/* Seletor de Visibilidade: Pública | Close Friends | Privada */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
          Quem pode ver esta review?
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={visibility}
          onChange={(e, val) => val && setVisibility(val)}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="public" sx={{ textTransform: 'none', gap: 0.6, px: 1.5 }}>
            <PublicOutlinedIcon sx={{ fontSize: 16 }} /> Pública
          </ToggleButton>
          <ToggleButton
            value="close_friends"
            sx={{
              textTransform: 'none',
              gap: 0.6,
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: alpha('#16a34a', 0.2),
                color: '#22c55e',
                borderColor: alpha('#22c55e', 0.5),
                '&:hover': { bgcolor: alpha('#16a34a', 0.28) },
              },
            }}
          >
            <StarIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Close Friends
          </ToggleButton>
          <ToggleButton
            value="private"
            sx={{
              textTransform: 'none',
              gap: 0.6,
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                color: 'warning.main',
              },
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 16 }} /> Privada
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Formulário de Review Text */}
      <Box sx={{ mt: 1 }}>
        <TextField
          label="Sua review (opcional)"
          multiline
          rows={3}
          fullWidth
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Conte o que achou da produção, das letras ou momentos marcantes..."
          variant="outlined"
          sx={{ mb: 1.5 }}
        />

        {/* Opções avançadas de Diário */}
        <Box sx={{ mb: 1.5 }}>
          <Button size="small" color="inherit" onClick={() => setShowAdvanced((s) => !s)} sx={{ color: 'text.secondary', px: 0.5 }}>
            {showAdvanced ? 'Ocultar opções de Diário e Spoiler' : 'Opções de Diário, Re-audição e Spoiler'}
          </Button>

          <Collapse in={showAdvanced}>
            <Box
              sx={{
                mt: 1.5,
                p: 2,
                borderRadius: 2.5,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
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

        {/* Botões de Ação */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: hasReview ? 'space-between' : 'flex-end', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
          {hasReview && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon fontSize="small" />}
              onClick={handleDeleteReview}
              disabled={isSubmitting}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Excluir Avaliação
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleSaveReview()}
              disabled={isSubmitting || rating === null || rating === undefined}
              sx={{ borderRadius: 2, textTransform: 'none', px: 2.5, fontWeight: 700 }}
            >
              {hasReview ? 'Salvar Alterações' : 'Publicar Avaliação'}
            </Button>
          </Box>
        </Box>
      </Box>

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
    </Paper>
  );
}

export default ReviewSection;
