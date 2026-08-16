import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriendsReviews } from '../services/social';
import { Box, Typography, Card, CardHeader, CardContent, Avatar, Rating, CircularProgress } from '@mui/material';

function FriendsReviews({ itemType, itemId }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !itemId || !itemType) return;

    setLoading(true);
    getFriendsReviews(itemType, itemId)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [isAuthenticated, itemType, itemId]);

  if (!isAuthenticated || (!loading && reviews.length === 0)) return null;

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Avaliações de Amigos
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map((review) => (
            <Card key={review.id} variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
              <CardHeader
                avatar={
                  <Avatar 
                    component={Link} 
                    to={`/user/${review.author_username}`} 
                    sx={{ bgcolor: 'primary.main', textDecoration: 'none' }}
                  >
                    {(review.author_name || review.author_username || '?')[0].toUpperCase()}
                  </Avatar>
                }
                title={
                  <Typography 
                    component={Link} 
                    to={`/user/${review.author_username}`} 
                    variant="subtitle2" 
                    fontWeight="bold" 
                    sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {review.author_username}
                  </Typography>
                }
                subheader={new Date(review.createdAt).toLocaleDateString()}
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mr: 1 }}>
                    <Rating value={review.rating / 2} precision={0.5} readOnly size="small" />
                    <Typography variant="body2" fontWeight="bold" sx={{ ml: 1 }}>{review.rating}/10</Typography>
                  </Box>
                }
                sx={{ pb: review.review_text ? 0 : 2 }}
              />
              {review.review_text && (
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {review.review_text}
                  </Typography>
                </CardContent>
              )}
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default FriendsReviews;
