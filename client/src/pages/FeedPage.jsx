import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSocialFeed } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';

// Ícone e label por tipo de item
const ITEM_META = {
  track: { label: 'Música', icon: <MusicNoteIcon fontSize="small" />, path: '/music' },
  album: { label: 'Álbum', icon: <AlbumIcon fontSize="small" />, path: '/album' },
  artist: { label: 'Artista', icon: <PersonIcon fontSize="small" />, path: '/artist' },
};

function FeedPage() {
  const [feed, setFeed] = useState([]);
  const [itemDetails, setItemDetails] = useState({}); // mapa de id -> dados do Spotify
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // Carrega dados do Spotify para os itens do feed
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
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  }

  if (feed.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h5" gutterBottom>Seu feed está vazio</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Comece a seguir outros utilizadores para ver as avaliações deles aqui.
          </Typography>
          <Button component={Link} to="/search-users" variant="contained">
            Encontrar pessoas
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" sx={{ mt: 4, mb: 3 }}>
        Feed
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {feed.map((item, index) => {
          const meta = ITEM_META[item.item_type] || ITEM_META.track;
          const spotifyData = itemDetails[item.item_id];

          return (
            <React.Fragment key={item.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {/* Avatar do autor */}
                  <Avatar
                    component={Link}
                    to={`/user/${item.author_username}`}
                    sx={{ textDecoration: 'none', cursor: 'pointer', bgcolor: 'primary.main' }}
                  >
                    {(item.author_name || item.author_username || '?')[0].toUpperCase()}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    {/* Cabeçalho: quem avaliou o quê */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      <Typography
                        component={Link}
                        to={`/user/${item.author_username}`}
                        sx={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}
                      >
                        {item.author_username}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">avaliou</Typography>
                      <Chip
                        icon={meta.icon}
                        label={meta.label}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 0.5 }}
                      />
                    </Box>

                    {/* Card do item avaliado */}
                    <Paper
                      variant="outlined"
                      component={Link}
                      to={`${meta.path}/${item.item_id}`}
                      sx={{
                        p: 2,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        mb: 2,
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {spotifyData?.imageUrl && (
                        <Box
                          component="img"
                          src={spotifyData.imageUrl}
                          alt={spotifyData.name}
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: item.item_type === 'artist' ? '50%' : 1,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {spotifyData?.name || item.item_id}
                        </Typography>
                        {spotifyData?.artist && (
                          <Typography variant="body2" color="text.secondary">
                            {spotifyData.artist}
                          </Typography>
                        )}
                      </Box>

                      {/* Nota à direita */}
                      <Box sx={{ ml: 'auto', textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="h5" fontWeight={700} color="primary.main">
                          {item.rating}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">/10</Typography>
                      </Box>
                    </Paper>

                    {/* Texto da review */}
                    {item.review_text && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        "{item.review_text}"
                      </Typography>
                    )}

                    {/* Data */}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {index < feed.length - 1 && <Box />}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Botão "Carregar mais" */}
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
    </Container>
  );
}

export default FeedPage;
