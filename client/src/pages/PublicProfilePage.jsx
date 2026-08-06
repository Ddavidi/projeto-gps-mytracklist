import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserReviewsByUsername } from '../services/reviews';
import { getMultipleTrackDetails } from '../services/spotify';
import {
  Container,
  Typography,
  Box,
  List,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReviewItem from '../components/ReviewItem';

function PublicProfilePage() {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [trackMap, setTrackMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Buscar dados do perfil e avaliações
        const data = await getUserReviewsByUsername(username);
        setProfileData(data);

        // 2. Buscar dados de TODAS as músicas de uma vez (batch)
        if (data.reviews && data.reviews.length > 0) {
          const trackIds = data.reviews.map((r) => r.trackId);
          const tracks = await getMultipleTrackDetails(trackIds);
          setTrackMap(tracks);
        }
      } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 404) {
             setError('Utilizador não encontrado.');
        } else {
             setError('Falha ao carregar o perfil.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Alert severity="error">{error}</Alert>
            <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
                Voltar ao Início
            </Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mt: 2, mb: 2 }}>
        Voltar
      </Button>
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Perfil de {profileData?.user.username}
        </Typography>
        
        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Avaliações Recentes
        </Typography>

        {profileData?.reviews.length === 0 ? (
          <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
            Este utilizador ainda não avaliou nenhuma música.
          </Typography>
        ) : (
          <List sx={{ width: '100%' }}>
            {profileData?.reviews.map((review) => (
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

export default PublicProfilePage;