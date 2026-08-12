import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardContent, CardActions, Avatar, Typography, IconButton, Box, Rating, Divider, Collapse, TextField, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getReviewComments, addReviewComment } from '../services/reviews';

function ReviewCard({ review }) {
  const [liked, setLiked] = useState(Boolean(review.is_liked));
  const [likesCount, setLikesCount] = useState(Number(review.likes_count) || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

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
    return `/music/${review.item_id}`; // Default track
  };

  const toggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setLoadingComments(true);
      try {
        const data = await getReviewComments(review.id);
        setComments(data || []);
      } catch(err) {
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
      // Recarrega os comentários para mostrar o novo
      const data = await getReviewComments(review.id);
      setComments(data || []);
    } catch(err) {
      console.error('Failed to send comment');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {/* Reviewer Header */}
      <CardHeader
        avatar={
          <Avatar 
            component={Link} 
            to={`/user/${review.user_username || review.user?.username}`} 
            src={review.user_avatar || review.user?.avatar_url} 
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          />
        }
        title={
          <Typography 
            component={Link} 
            to={`/user/${review.user_username || review.user?.username}`} 
            variant="subtitle2" 
            fontWeight="bold" 
            sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {review.user_username || review.user?.username || 'Usuário'}
          </Typography>
        }
        subheader={new Date(review.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      />

      <Divider />

      {/* Track / Album context */}
      <Box sx={{ display: 'flex', p: 2, bgcolor: 'background.default', alignItems: 'center' }}>
        <Box 
          component={Link} 
          to={getTargetLink()}
          sx={{ display: 'block', mr: 2, flexShrink: 0, textDecoration: 'none' }}
        >
          {review.item_image_url ? (
            <Avatar variant="square" src={review.item_image_url} sx={{ width: 64, height: 64, borderRadius: 2 }} />
          ) : (
            <Box sx={{ width: 64, height: 64, bgcolor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary">Mídia</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography 
            component={Link} 
            to={getTargetLink()}
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {review.item_name || 'Item Desconhecido'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Rating value={review.rating / 2} precision={0.5} readOnly size="small" />
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
              {review.rating}/10
            </Typography>
          </Box>
        </Box>

        {/* Audio Preview */}
        {review.item_preview_url && (
          <Box sx={{ ml: 2 }}>
            <IconButton onClick={togglePlay} color="primary" sx={{ bgcolor: 'action.hover' }}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <audio 
              ref={audioRef} 
              src={review.item_preview_url} 
              onEnded={() => setIsPlaying(false)} 
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              style={{ display: 'none' }} 
            />
          </Box>
        )}
      </Box>

      {/* Review Text */}
      {review.review_text && (
        <CardContent sx={{ pt: 1 }}>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {review.review_text}
          </Typography>
        </CardContent>
      )}

      {/* Interactions */}
      <CardActions disableSpacing sx={{ px: 2, pb: 2, display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="like review" onClick={handleLike} disabled={likeLoading} color={liked ? 'error' : 'default'}>
            {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>
            {likesCount}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="comment" onClick={toggleComments}>
            <ChatBubbleOutlineIcon />
          </IconButton>
        </Box>
      </CardActions>

      {/* Comentários Expandíveis */}
      <Collapse in={showComments} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent sx={{ bgcolor: 'background.default', pt: 2, pb: 2 }}>
          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Seja o primeiro a comentar!
                </Typography>
              ) : (
                comments.map((comment) => (
                  <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar 
                      src={comment.user_avatar} 
                      sx={{ width: 32, height: 32, cursor: 'pointer' }} 
                      component={Link}
                      to={`/user/${comment.user_username}`}
                    />
                    <Box sx={{ flex: 1, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography 
                          variant="subtitle2" 
                          fontWeight="bold"
                          component={Link}
                          to={`/user/${comment.user_username}`}
                          sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {comment.user_username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{comment.content}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}

          {/* Campo de Novo Comentário */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Adicionar um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <IconButton 
              color="primary" 
              onClick={handleSendComment}
              disabled={!newComment.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}

export default ReviewCard;
