import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Box, Container, Grid, Button, Paper, CircularProgress, Alert } from '@mui/material';
import FeedList from '../components/FeedList';
import { useAuth } from '../context/AuthContext';
import { getTrending, getMultipleAlbumDetails } from '../services/spotify';
import api from '../services/api';
import AlbumIcon from '@mui/icons-material/Album';
import StarIcon from '@mui/icons-material/Star';

function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [errorTrending, setErrorTrending] = useState('');

  const [topAlbums, setTopAlbums] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);


  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoadingTrending(true);
        const data = await getTrending();
        setTrending(data.albums || []);
      } catch (err) {
        setErrorTrending('Falha ao carregar tendências.');
      } finally {
        setLoadingTrending(false);
      }
    };

    const fetchTopAlbums = async () => {
      try {
        setLoadingTop(true);
        const res = await api.get('/reviews/top/album?limit=5');
        const albums = res.data || [];
        
        const albumIds = albums.map(a => a.item_id);
        if (albumIds.length > 0) {
          const spotifyData = await getMultipleAlbumDetails(albumIds);
          const enrichedAlbums = albums.map(a => ({
             ...a,
             item_name: a.item_name || spotifyData[a.item_id]?.name,
             item_image_url: a.item_image_url || spotifyData[a.item_id]?.imageUrl,
          }));
          setTopAlbums(enrichedAlbums);
        } else {
          setTopAlbums(albums);
        }
      } catch (err) {
        console.error('Falha ao carregar top álbuns:', err);
      } finally {
        setLoadingTop(false);
      }
    };

    fetchTrending();
    fetchTopAlbums();
  }, []);

  const TrendingSection = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        🔥 Em Alta no Spotify
      </Typography>
      
      {loadingTrending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : errorTrending ? (
        <Alert severity="error">{errorTrending}</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {trending.map((album) => (
            <Box 
              component={Link} 
              to={`/album/${album.id}`}
              key={album.id} 
              sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { bgcolor: 'action.hover' },
                p: 1,
                borderRadius: 1,
                transition: 'background-color 0.2s'
              }}
            >
              {album.imageUrl ? (
                <Box
                  component="img"
                  src={album.imageUrl}
                  alt={album.name}
                  sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlbumIcon color="action" />
                </Box>
              )}
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                  {album.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {album.artist}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  const TopRatedSection = () => (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        ⭐ Top Comunidade
      </Typography>
      
      {loadingTop ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : topAlbums.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nenhum álbum avaliado ainda.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {topAlbums.map((album, index) => (
            <Box 
              component={Link} 
              to={`/album/${album.item_id}`}
              key={album.item_id} 
              sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { bgcolor: 'action.hover' },
                p: 1,
                borderRadius: 1,
                transition: 'background-color 0.2s'
              }}
            >
              <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ minWidth: 20 }}>
                {index + 1}
              </Typography>
              {album.item_image_url ? (
                <Box
                  component="img"
                  src={album.item_image_url}
                  alt={album.item_name}
                  sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlbumIcon color="action" />
                </Box>
              )}
              <Box sx={{ overflow: 'hidden', flex: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                  {album.item_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" fontWeight="bold">{album.avg_rating}</Typography>
                  <Typography variant="caption" color="text.secondary">({album.review_count} avaliações)</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Grid container spacing={4}>
        
        {/* Lado Esquerdo - Conteúdo Principal */}
        <Grid size={{ xs: 12, md: 8 }}>
          {!isAuthenticated ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              py: 8,
              px: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1
            }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800, color: 'primary.main' }}>
                MyTrackList
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600 }}>
                A sua nova rede social de música. Procure artistas, avalie os seus álbuns favoritos e veja o que os seus amigos andam a ouvir.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button variant="contained" size="large" component={Link} to="/login">
                  Entrar / Criar Conta
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Bem-vindo de volta, {user?.name || user?.username}!
                </Typography>
              </Box>
              
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Atividades Recentes
              </Typography>
              <FeedList />
            </Box>
          )}
        </Grid>

        {/* Lado Direito - Em Alta */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <TrendingSection />
            <TopRatedSection />
          </Box>
        </Grid>

      </Grid>
    </Container>
  );
}

export default HomePage;
