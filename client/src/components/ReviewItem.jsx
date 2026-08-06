import React from 'react';
import { Link } from 'react-router-dom';
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import RatingInput from './RatingInput';

/**
 * Componente que exibe uma avaliação individual com dados do Spotify.
 * Agora recebe os dados da track como prop (carregados em batch pela página pai).
 * 
 * @param {Object} props
 * @param {Object} props.review - Dados da avaliação (id, trackId, rating, createdAt)
 * @param {Object} props.track - Dados da música do Spotify (name, artist, album, imageUrl)
 */
function ReviewItem({ review, track }) {
  // Se não temos dados da track, não renderiza
  if (!track) {
    return null;
  }

  return (
    <ListItem divider alignItems="flex-start" sx={{ py: 2 }}>
      <ListItemAvatar sx={{ mr: 2 }}>
        <Avatar
          variant="rounded"
          src={track.imageUrl}
          alt={track.name}
          sx={{ width: 64, height: 64 }}
        />
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Link to={`/music/${review.trackId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6" component="span" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              {track.name}
            </Typography>
          </Link>
        }
        secondary={
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
            <Typography variant="body2" color="text.primary" fontWeight="bold">
              {track.artist}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {track.album}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
               <RatingInput value={review.rating} readOnly={true} size="small" />
               <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                 • Avaliado em {new Date(review.createdAt).toLocaleDateString()}
               </Typography>
            </Box>
          </Box>
        }
      />
    </ListItem>
  );
}

export default ReviewItem;