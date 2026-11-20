import React, { useState } from 'react';
import {
  Card,
  Avatar,
  Typography,
  IconButton,
  Box,
  Rating,
  Divider,
  Collapse,
  TextField,
  CircularProgress,
  Chip,
  alpha,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import AlbumIcon from '@mui/icons-material/Album';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import RepeatIcon from '@mui/icons-material/Repeat';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getReviewComments, addReviewComment } from '../services/reviews';
import { formatDateShort, formatDateTime } from '../utils/date';
import PlayButton from './PlayButton';
import ShareCardModal from './ShareCardModal';

const TYPE_LABEL = {
  track: 'Música',
  album: 'Álbum',
  artist: 'Artista',
};

function ReviewCard({ review }) {
  const [liked, setLiked] = useState(Boolean(review.is_liked));
  const [likesCount, setLikesCount] = useState(Number(review.likes_count) || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [commentsCount, setCommentsCount] = useState(Number(review.comments_count) || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const authorUsername = review.user_username || review.author_username || review.user?.username || 'Usuário';
  const authorAvatar = review.user_avatar || review.author_avatar || review.user?.avatar_url;
  const vibes = Array.isArray(review.vibe_tags) ? review.vibe_tags : [];

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (liked) {
        await api.delete(`/social/reviews/${review.id}/like`);
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        await api.post(`/social/reviews/${review.id}/like`);
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle like', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const getTargetLink = () => {
    if (review.item_type === 'album') return `/album/${review.item_id}`;
    if (review.item_type === 'artist') return `/artist/${review.item_id}`;
    return `/track/${review.item_id}`;
  };

  const toggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setLoadingComments(true);
      try {
        const data = await getReviewComments(review.id);
        setComments(data || []);
      } catch {
        console.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    } else {
      setShowComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addReviewComment(review.id, newComment);
      setNewComment('');
      const data = await getReviewComments(review.id);
      setComments(data || []);
      setCommentsCount((prev) => prev + 1);
    } catch {
      console.error('Failed to send comment');
    }
  };

  const itemType = review.item_type || 'track';

  return (
    <Card
      sx={{
        mb: 2.5,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
        },
      }}
    >
      {/* Cabeçalho do Autor */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar
            component={Link}
            to={`/user/${authorUsername}`}
            src={authorAvatar}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {authorUsername.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={Link}
              to={`/user/${authorUsername}`}
              variant="subtitle2"
              fontWeight={700}
              noWrap
              sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block' }}
            >
              {authorUsername}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateShort(review.createdAt)}
            </Typography>
          </Box>
        </Box>

        <Chip
          size="small"
          label={TYPE_LABEL[itemType] || 'Música'}
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 22, borderColor: 'divider' }}
        />
      </Box>

      {/* Bloco da Mídia Avaliada */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mx: 2.5,
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component={Link}
          to={getTargetLink()}
          sx={{
            width: 64,
            height: 64,
            borderRadius: itemType === 'artist' ? '50%' : 2,
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {review.item_image_url ? (
            <Box
              component="img"
              src={review.item_image_url}
              alt={review.item_name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <AlbumIcon color="disabled" />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component={Link}
            to={getTargetLink()}
            variant="subtitle1"
            fontWeight={700}
            noWrap
            sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block' }}
          >
            {review.item_name || 'Item Desconhecido'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Rating value={Number(review.rating) / 2} precision={0.5} readOnly size="small" />
            <Box
              component="span"
              className="mtl-mono"
              sx={{
                px: 0.9,
                py: 0.2,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 700,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
              }}
            >
              {review.rating}/10
            </Box>
          </Box>
        </Box>

        {itemType !== 'artist' && review.item_id && (
          <PlayButton
            track={{
              type: itemType === 'album' ? 'album' : 'track',
              id: review.item_id,
              name: review.item_name,
              imageUrl: review.item_image_url,
              previewUrl: review.item_preview_url,
            }}
            size="small"
            filled
          />
        )}
      </Box>

      {/* Texto da Review (com proteção de spoiler) e Vibes */}
      {(review.review_text || vibes.length > 0 || review.is_relisten) && (
        <Box sx={{ px: 2.5, pt: 1.75, pb: 0.5 }}>
          {review.review_text && (
            review.has_spoiler && !spoilerRevealed ? (
              <Box
                onClick={() => setSpoilerRevealed(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSpoilerRevealed(true)}
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'warning.main',
                  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  mb: vibes.length > 0 ? 1.25 : 0,
                }}
              >
                <VisibilityOffOutlinedIcon fontSize="small" color="warning" />
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                  Esta review contém spoilers — clique para revelar
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.65, mb: vibes.length > 0 || review.is_relisten ? 1.25 : 0 }}>
                {review.review_text}
              </Typography>
            )
          )}

          {(vibes.length > 0 || review.is_relisten) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {review.is_relisten && (
                <Chip
                  size="small"
                  icon={<RepeatIcon sx={{ fontSize: 14 }} />}
                  label="Re-audição"
                  variant="outlined"
                  color="primary"
                  sx={{ height: 22, fontSize: '0.7rem' }}
                />
              )}
              {vibes.map((tag) => (
                <Chip
                  key={tag}
                  size="small"
                  label={tag}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.14),
                    color: 'secondary.main',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Ações Sociais */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              aria-label="Curtir avaliação"
              onClick={handleLike}
              disabled={likeLoading}
              size="small"
              color={liked ? 'error' : 'default'}
            >
              {liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
            <Typography variant="caption" className="mtl-mono" color="text.secondary" fontWeight={700} sx={{ ml: 0.5 }}>
              {likesCount}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton aria-label="Comentários" onClick={toggleComments} size="small">
              <ChatBubbleOutlineIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" className="mtl-mono" color="text.secondary" fontWeight={700} sx={{ ml: 0.5 }}>
              {commentsCount}
            </Typography>
          </Box>
        </Box>

        <IconButton aria-label="Compartilhar card" onClick={() => setShareOpen(true)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
          <ShareOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      <ShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        review={{ ...review, user_username: authorUsername }}
      />

      {/* Comentários Expandíveis */}
      <Collapse in={showComments} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ px: 2.5, py: 2, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Seja o primeiro a comentar.
                </Typography>
              ) : (
                comments.map((comment) => (
                  <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar
                      src={comment.user_avatar}
                      sx={{ width: 30, height: 30, cursor: 'pointer', fontSize: '0.8rem' }}
                      component={Link}
                      to={`/user/${comment.user_username}`}
                    >
                      {comment.user_username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box
                      sx={{
                        flex: 1,
                        bgcolor: 'background.paper',
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          component={Link}
                          to={`/user/${comment.user_username}`}
                          sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                        >
                          {comment.user_username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {formatDateTime(comment.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{comment.content}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <IconButton color="primary" onClick={handleSendComment} disabled={!newComment.trim()} aria-label="Enviar comentário">
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
}

export default ReviewCard;
