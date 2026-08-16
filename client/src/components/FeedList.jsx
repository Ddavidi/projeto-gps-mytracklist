import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSocialFeed } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import ReviewCard from './ReviewCard';

const ITEM_META = {
  track: { label: 'Música', icon: <MusicNoteIcon fontSize="small" />, path: '/track' },
  album: { label: 'Álbum', icon: <AlbumIcon fontSize="small" />, path: '/album' },
  artist: { label: 'Artista', icon: <PersonIcon fontSize="small" />, path: '/artist' },
};

function FeedList() {
  const [feed, setFeed] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const enrichFeedWithSpotifyData = useCallback(async (feedItems) => {
    const trackIds = [...new Set(feedItems.filter(f => f.item_type === 'track').map(f => f.item_id))];
    const albumIds = [...new Set(feedItems.filter(f => f.item_type === 'album').map(f => f.item_id))];
    const artistIds = [...new Set(feedItems.filter(f => f.item_type === 'artist').map(f => f.item_id))];

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds),
      getMultipleAlbumDetails(albumIds),
      getMultipleArtistDetails(artistIds),
    ]);

    return { ...tracks, ...albums, ...artists };
  }, []);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getSocialFeed(LIMIT, 0);
        setFeed(data.feed || []);
        setHasMore(data.hasMore);
        if (data.feed && data.feed.length > 0) {
          const details = await enrichFeedWithSpotifyData(data.feed);
          setItemDetails(details);
        }
      } catch (err) {
        setError('Falha ao carregar o feed. Tente novamente.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [enrichFeedWithSpotifyData]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await getSocialFeed(LIMIT, feed.length);
      const newItems = data.feed || [];
      setFeed((prev) => [...prev, ...newItems]);
      setHasMore(data.hasMore);
      if (newItems.length > 0) {
        const details = await enrichFeedWithSpotifyData(newItems);
        setItemDetails((prev) => ({ ...prev, ...details }));
      }
    } catch (err) {
      console.error('Erro ao carregar mais itens do feed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  if (feed.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" gutterBottom>Seu feed está vazio</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Comece a seguir outros utilizadores para ver as avaliações deles aqui.
        </Typography>
        <Button component={Link} to="/search-users" variant="contained">
          Encontrar pessoas
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {feed.map((item) => {
        const spotifyData = itemDetails[item.item_id];
        // Combine backend data with spotify data (for old reviews without item_name)
        const reviewData = {
          ...item,
          user_username: item.author_username,
          user_avatar: item.author_avatar,
          item_name: item.item_name || spotifyData?.name,
          item_image_url: item.item_image_url || spotifyData?.imageUrl
        };

        return <ReviewCard key={item.id} review={reviewData} />;
      })}

      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : null}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </Box>
      )}

      {!hasMore && feed.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          Você chegou ao fim do feed.
        </Typography>
      )}
    </Box>
  );
}

export default FeedList;
