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
 * Componente genérico que exibe uma avaliação (track, album ou artist).
 * 
 * @param {Object} props
 * @param {Object} props.review - Dados da avaliação (id, item_id, item_type, rating, review_text, createdAt)
 * @param {Object} props.itemData - Dados do Spotify carregados em batch
 */
function ReviewItem({ review, itemData }) {
  if (!itemData) {
    return null;
  }

  // Define a rota e o subtítulo dependendo do tipo
  const itemType = review.item_type || 'track';
  let pathPrefix = '/music';
  let subtitle = '';

  if (itemType === 'track') {
    pathPrefix = '/music';
    subtitle = `${itemData.artist} • ${itemData.album}`;
  } else if (itemType === 'album') {
    pathPrefix = '/album';
    subtitle = itemData.artist;
  } else if (itemType === 'artist') {
    pathPrefix = '/artist';
    subtitle = 'Artista';
  }

  return (
    <ListItem divider alignItems="flex-start" sx={{ py: 2 }}>
      <ListItemAvatar sx={{ mr: 2 }}>
        <Avatar
          variant={itemType === 'artist' ? 'circular' : 'rounded'}
          src={itemData.imageUrl}
          alt={itemData.name}
          sx={{ width: 64, height: 64 }}
        />
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Link to={`${pathPrefix}/${review.item_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6" component="span" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              {itemData.name}
            </Typography>
          </Link>
        }
        secondary={
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
               <RatingInput value={review.rating} readOnly={true} size="small" />
               <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                 • Avaliado em {new Date(review.createdAt || review.updatedAt || Date.now()).toLocaleDateString()}
               </Typography>
            </Box>

            {review.review_text && (
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 1, 
                  fontStyle: 'italic', 
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                "{review.review_text}"
              </Typography>
            )}
          </Box>
        }
      />
    </ListItem>
  );
}

export default ReviewItem;