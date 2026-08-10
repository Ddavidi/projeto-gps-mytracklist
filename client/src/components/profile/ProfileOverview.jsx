import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import ReviewItem from '../ReviewItem';

export default function ProfileOverview({ reviews, favorites, favoriteDetails, itemDetails }) {
  // Pegar as 5 últimas avaliações
  const recentReviews = reviews.slice(0, 5);

  const renderFavoritesSection = (title, type) => {
    const favs = favorites.filter(f => f.item_type === type);
    if (favs.length === 0) return null;

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>{title}</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {favs.map(fav => {
            const details = favoriteDetails[fav.item_id];
            if (!details) return null;
            
            const isArtist = type === 'artist';
            const imgUrl = details.imageUrl || '';
            const linkTarget = `/${type}/${fav.item_id}`;

            return (
              <Box 
                key={fav.id} 
                component={Link} 
                to={linkTarget}
                sx={{ 
                  width: 120, 
                  textDecoration: 'none', 
                  color: 'inherit',
                  '&:hover': { opacity: 0.8 }
                }}
              >
                <Box 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    bgcolor: 'grey.800',
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: isArtist ? '50%' : '8px',
                    mb: 1
                  }}
                />
                <Typography variant="body2" fontWeight="bold" noWrap>
                  {details.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {details.artist || ''}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Grid container spacing={4}>
      {/* Coluna da Esquerda (Favoritos) */}
      <Grid size={{ xs: 12, md: 7 }}>
        {renderFavoritesSection('Músicas Favoritas', 'track')}
        {renderFavoritesSection('Álbuns Favoritos', 'album')}
        {renderFavoritesSection('Artistas Favoritos', 'artist')}
        
        {favorites.length === 0 && (
          <Typography color="text.secondary">Nenhum favorito adicionado ainda.</Typography>
        )}
      </Grid>

      {/* Coluna da Direita (Últimas Avaliações) */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Últimas Avaliações
        </Typography>
        {recentReviews.length > 0 ? (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, boxShadow: 1 }}>
            {recentReviews.map(review => (
              <ReviewItem
                key={review.id}
                review={review}
                itemData={itemDetails[review.item_id]}
              />
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">Nenhuma avaliação recente.</Typography>
        )}
      </Grid>
    </Grid>
  );
}
