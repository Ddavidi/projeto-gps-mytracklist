import React, { useState, useEffect, useCallback } from 'react';
import { getMyReviews } from '../services/reviews';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Box,
  List,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import ReviewItem from '../components/ReviewItem';

function ProfilePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Aba ativa: 0 = Músicas, 1 = Álbuns, 2 = Artistas
  const [tabIndex, setTabIndex] = useState(0);

  const enrichReviewsWithSpotifyData = useCallback(async (reviewList) => {
    const trackIds = [...new Set(reviewList.filter(r => r.item_type === 'track').map(r => r.item_id))];
    const albumIds = [...new Set(reviewList.filter(r => r.item_type === 'album').map(r => r.item_id))];
    const artistIds = [...new Set(reviewList.filter(r => r.item_type === 'artist').map(r => r.item_id))];

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds),
      getMultipleAlbumDetails(albumIds),
      getMultipleArtistDetails(artistIds),
    ]);

    return { ...tracks, ...albums, ...artists };
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError('');

        const myReviews = await getMyReviews();
        setReviews(myReviews);

        if (myReviews.length > 0) {
          const details = await enrichReviewsWithSpotifyData(myReviews);
          setItemDetails(details);
        }
      } catch (err) {
        setError('Falha ao carregar as suas avaliações.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [enrichReviewsWithSpotifyData]);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const currentType = tabIndex === 0 ? 'track' : tabIndex === 1 ? 'album' : 'artist';
  const filteredReviews = reviews.filter(r => (r.item_type || 'track') === currentType);

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

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas de avaliações">
            <Tab label="Músicas" />
            <Tab label="Álbuns" />
            <Tab label="Artistas" />
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && filteredReviews.length === 0 && (
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>
            Você ainda não avaliou {currentType === 'track' ? 'nenhuma música' : currentType === 'album' ? 'nenhum álbum' : 'nenhum artista'}.
          </Typography>
        )}

        {!loading && !error && filteredReviews.length > 0 && (
          <List sx={{ width: '100%' }}>
            {filteredReviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                itemData={itemDetails[review.item_id]}
              />
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}

export default ProfilePage;