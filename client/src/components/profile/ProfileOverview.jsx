import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import AlbumIcon from '@mui/icons-material/Album';
import AddIcon from '@mui/icons-material/Add';
import ReviewCard from '../ReviewCard';

export default function ProfileOverview({ reviews, favorites, favoriteDetails, itemDetails, profileUser, isOwner = false }) {
  const recentReviews = reviews.slice(0, 5);
  const top4Albums = favorites.filter((f) => f.item_type === 'album').slice(0, 4);

  const renderFavoritesSection = (title, type) => {
    const favs = favorites.filter((f) => f.item_type === type);
    if (favs.length === 0) return null;

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Grid container spacing={2}>
          {favs.map((fav) => {
            const details = favoriteDetails[fav.item_id];
            if (!details) return null;

            const isArtist = type === 'artist';
            const imgUrl = details.imageUrl || '';
            const linkTarget = `/${type}/${fav.item_id}`;

            return (
              <Grid size={{ xs: 4, sm: 3 }} key={fav.id}>
                <Box
                  component={Link}
                  to={linkTarget}
                  className="mtl-album-card"
                  sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: isArtist ? '50%' : 2.5,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {imgUrl ? (
                      <Box component="img" src={imgUrl} alt={details.name} className="mtl-cover-img" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <AlbumIcon color="disabled" />
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700} noWrap>{details.name}</Typography>
                  {details.artist && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {details.artist}
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      {/* Vitrine Fixa: Top 4 Álbuns da Vida (estilo Letterboxd / Musicboard) */}
      {(top4Albums.length > 0 || isOwner) && (
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
            <Typography variant="h6">Top 4 Álbuns da Vida</Typography>
            <Typography variant="caption" color="text.secondary">
              {isOwner ? 'Abra qualquer álbum e clique em "Favoritar (Top 4)"' : 'Escolhas essenciais'}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {[0, 1, 2, 3].map((slot) => {
              const fav = top4Albums[slot];
              const details = fav ? favoriteDetails[fav.item_id] : null;

              if (fav && details) {
                return (
                  <Grid size={{ xs: 6, sm: 3 }} key={fav.id}>
                    <Box
                      component={Link}
                      to={`/album/${fav.item_id}`}
                      className="mtl-album-card"
                      sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          mb: 1,
                          position: 'relative',
                        }}
                      >
                        <Box component="img" src={details.imageUrl} alt={details.name} className="mtl-cover-img" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Box
                          className="mtl-mono"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            px: 0.85,
                            py: 0.2,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0,0,0,0.78)',
                            color: 'secondary.main',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          #{slot + 1}
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight={700} noWrap>{details.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{details.artist}</Typography>
                    </Box>
                  </Grid>
                );
              }

              if (!isOwner) return null;

              return (
                <Grid size={{ xs: 6, sm: 3 }} key={`empty-${slot}`}>
                  <Box
                    component={Link}
                    to="/explore"
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.75,
                      color: 'text.secondary',
                      textDecoration: 'none',
                      transition: 'border-color 0.2s ease, color 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                  >
                    <AddIcon />
                    <Typography variant="caption" fontWeight={600}>
                      Escolher #{slot + 1}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          {renderFavoritesSection('Músicas Favoritas', 'track')}
          {renderFavoritesSection('Artistas Favoritos', 'artist')}
          {favorites.filter((f) => f.item_type !== 'album').length === 0 && top4Albums.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Favorite álbuns, músicas ou artistas para montar sua vitrine pessoal.
            </Typography>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Últimas Avaliações
          </Typography>
          {recentReviews.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {recentReviews.map((review) => {
                const details = itemDetails[review.item_id];
                const enrichedReview = {
                  ...review,
                  item_name: review.item_name || details?.name,
                  item_image_url: review.item_image_url || details?.imageUrl,
                  user_username: review.user_username || profileUser?.username,
                  user_avatar: review.user_avatar || profileUser?.avatar_url,
                };
                return <ReviewCard key={review.id} review={enrichedReview} />;
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhuma avaliação recente.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
