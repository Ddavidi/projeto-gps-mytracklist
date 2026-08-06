import React, { useState, useEffect } from 'react';
import { getMyReviews } from '../services/reviews';
import { getMultipleTrackDetails } from '../services/spotify';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Box,
  List,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import ReviewItem from '../components/ReviewItem';

function ProfilePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [trackMap, setTrackMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Buscar todas as avaliações do utilizador
        const myReviews = await getMyReviews();
        setReviews(myReviews);

        // 2. Buscar dados de TODAS as músicas de uma vez (batch)
        if (myReviews.length > 0) {
          const trackIds = myReviews.map((r) => r.trackId);
          const tracks = await getMultipleTrackDetails(trackIds);
          setTrackMap(tracks);
        }
      } catch (err) {
        setError('Falha ao carregar as suas avaliações.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meu Perfil
        </Typography>
        <Typography variant="h6" component="h2" color="text.secondary" gutterBottom>
          {user?.username}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Minhas Avaliações
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && reviews.length === 0 && (
          <Typography sx={{ mt: 2 }}>Você ainda não avaliou nenhuma música.</Typography>
        )}

        {!loading && !error && reviews.length > 0 && (
          <List sx={{ width: '100%' }}>
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                track={trackMap[review.trackId]}
              />
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}

export default ProfilePage;