import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getUserReviewsByUsername } from '../services/reviews';
import { followUser, unfollowUser, checkIsFollowing, getFollowers, getFollowing } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import {
  Container,
  Typography,
  Box,
  List,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import ReviewItem from '../components/ReviewItem';
import { useAuth } from '../context/AuthContext';

function PublicProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  
  const [targetUser, setTargetUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados Sociais
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLoading, setSocialLoading] = useState(false);

  // Aba ativa
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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getUserReviewsByUsername(username);
        setTargetUser(response.user);
        setReviews(response.reviews || []);

        if (response.reviews && response.reviews.length > 0) {
          const details = await enrichReviewsWithSpotifyData(response.reviews);
          setItemDetails(details);
        }

        // Buscar dados sociais se o user for encontrado
        if (response.user) {
          const [followers, following, followingStatus] = await Promise.all([
            getFollowers(response.user.id),
            getFollowing(response.user.id),
            currentUser ? checkIsFollowing(response.user.id) : Promise.resolve(false)
          ]);
          setFollowersCount(followers.length);
          setFollowingCount(following.length);
          setIsFollowing(followingStatus);
        }

      } catch (err) {
        if (err.response?.status === 404) {
          setError('Utilizador não encontrado.');
        } else {
          setError('Falha ao carregar perfil.');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, enrichReviewsWithSpotifyData, currentUser]);

  const handleToggleFollow = async () => {
    if (!targetUser) return;
    setSocialLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(targetUser.id);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await followUser(targetUser.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  const currentType = tabIndex === 0 ? 'track' : tabIndex === 1 ? 'album' : 'artist';
  const filteredReviews = reviews.filter(r => (r.item_type || 'track') === currentType);

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Perfil de {targetUser.name || targetUser.username}
            </Typography>
            <Typography variant="h6" component="h2" color="text.secondary" gutterBottom>
              @{targetUser.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {followersCount} Seguidores • {followingCount} Seguindo
            </Typography>
          </Box>
          
          {currentUser && currentUser.username !== targetUser.username && (
            <Button
              variant={isFollowing ? "outlined" : "contained"}
              color="primary"
              onClick={handleToggleFollow}
              disabled={socialLoading}
            >
              {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas de avaliações">
            <Tab label="Músicas" />
            <Tab label="Álbuns" />
            <Tab label="Artistas" />
          </Tabs>
        </Box>

        {filteredReviews.length === 0 ? (
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>
            Este utilizador ainda não avaliou {currentType === 'track' ? 'nenhuma música' : currentType === 'album' ? 'nenhum álbum' : 'nenhum artista'}.
          </Typography>
        ) : (
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

export default PublicProfilePage;