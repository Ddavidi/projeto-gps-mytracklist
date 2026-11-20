import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography,
  Box,
  Container,
  Grid,
  Button,
  Paper,
  Skeleton,
  Alert,
  alpha,
} from '@mui/material';
import AlbumIcon from '@mui/icons-material/Album';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import FeedList from '../components/FeedList';
import PlayButton from '../components/PlayButton';
import { useAuth } from '../context/AuthContext';
import { getTrending, getMultipleAlbumDetails } from '../services/spotify';
import api from '../services/api';

function HomePage() {
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
      } catch {
        setErrorTrending('Falha ao carregar lançamentos do Spotify.');
      } finally {
        setLoadingTrending(false);
      }
    };

    const fetchTopAlbums = async () => {
      try {
        setLoadingTop(true);
        const res = await api.get('/reviews/top/album?limit=5');
        const albums = res.data || [];

        const albumIds = albums.map((a) => a.item_id);
        if (albumIds.length > 0 && isAuthenticated) {
          const spotifyData = await getMultipleAlbumDetails(albumIds).catch(() => ({}));
          const enrichedAlbums = albums.map((a) => ({
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
  }, [isAuthenticated]);

  const TopRatedPanel = () => (
    <Paper sx={{ p: 3, borderRadius: 3.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <EmojiEventsOutlinedIcon color="secondary" fontSize="small" />
        <Typography variant="h6">Top Comunidade</Typography>
      </Box>

      {loadingTop ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Skeleton variant="rounded" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="75%" height={18} />
                <Skeleton width="45%" height={14} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : topAlbums.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum álbum avaliado ainda. Seja o primeiro a deixar sua nota.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {topAlbums.map((album, index) => (
            <Box
              component={Link}
              to={`/album/${album.item_id}`}
              key={album.item_id}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                p: 1,
                mx: -1,
                borderRadius: 2,
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                  transform: 'translateX(3px)',
                },
              }}
            >
              <Typography
                variant="body2"
                className="mtl-mono"
                sx={{
                  minWidth: 22,
                  fontWeight: 700,
                  color: index === 0 ? 'secondary.main' : 'text.secondary',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </Typography>
              {album.item_image_url ? (
                <Box
                  component="img"
                  src={album.item_image_url}
                  alt={album.item_name}
                  sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlbumIcon fontSize="small" color="disabled" />
                </Box>
              )}
              <Box sx={{ overflow: 'hidden', flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {album.item_name || 'Álbum'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, color: 'secondary.main' }}>
                    <StarIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" className="mtl-mono" fontWeight={700}>
                      {album.avg_rating}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    · {album.review_count} {Number(album.review_count) === 1 ? 'avaliação' : 'avaliações'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  const TrendingGrid = ({ limit = 8 }) => (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" fontSize="small" />
          <Typography variant="h5">Lançamentos em Alta</Typography>
        </Box>
      </Box>

      {loadingTrending ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 6, sm: 3 }} key={i}>
              <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 2.5, mb: 1 }} />
              <Skeleton width="80%" height={18} />
              <Skeleton width="55%" height={14} />
            </Grid>
          ))}
        </Grid>
      ) : errorTrending ? (
        <Alert severity="error">{errorTrending}</Alert>
      ) : (
        <Grid container spacing={2.25}>
          {trending.slice(0, limit).map((album) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={album.id}>
              <Box
                component={Link}
                to={`/album/${album.id}`}
                className="mtl-album-card"
                sx={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  p: 1.25,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    mb: 1.25,
                  }}
                >
                  {album.imageUrl ? (
                    <Box
                      component="img"
                      src={album.imageUrl}
                      alt={album.name}
                      className="mtl-cover-img"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlbumIcon color="disabled" fontSize="large" />
                    </Box>
                  )}

                  {isAuthenticated && (
                    <Box
                      className="mtl-hover-play"
                      sx={{ position: 'absolute', right: 8, bottom: 8 }}
                      onClick={(e) => e.preventDefault()}
                    >
                      <PlayButton
                        track={{ type: 'album', id: album.id, name: album.name, artist: album.artist, imageUrl: album.imageUrl }}
                        size="small"
                        filled
                      />
                    </Box>
                  )}
                </Box>

                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {album.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {album.artist}
                </Typography>
                {album.releaseDate && (
                  <Typography variant="caption" className="mtl-mono" color="text.secondary" sx={{ fontSize: '0.7rem', opacity: 0.75 }}>
                    {album.releaseDate}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // ==========================================
  // HOME DESLOGADA — HERO EDITORIAL
  // ==========================================
  if (!isAuthenticated) {
    const heroAlbums = trending.slice(0, 4);
    return (
      <Box>
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: (theme) =>
              `radial-gradient(ellipse 80% 70% at 85% 15%, ${alpha(theme.palette.primary.main, 0.14)}, transparent 65%)`,
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }} className="mtl-reveal">
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                    mb: 2.5,
                  }}
                >
                  Catalogue álbuns. Escreva reviews. Descubra música de verdade.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: '50ch', fontSize: '1.08rem', lineHeight: 1.65 }}
                >
                  O MyTrackList é o diário musical da comunidade. Dê notas de 0 a 10 para faixas e discos, siga pessoas com gostos parecidos e conecte sua conta do Spotify.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/register"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ px: 3, py: 1.35 }}
                  >
                    Começar grátis
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    to="/login"
                    sx={{ px: 3, py: 1.35 }}
                  >
                    Já tenho conta
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Grid container spacing={2}>
                  {(heroAlbums.length > 0 ? heroAlbums : [1, 2, 3, 4]).map((item, idx) => (
                    <Grid size={{ xs: 6 }} key={item.id || idx}>
                      {typeof item === 'object' ? (
                        <Box
                          component={Link}
                          to={`/album/${item.id}`}
                          className="mtl-album-card"
                          sx={{
                            display: 'block',
                            position: 'relative',
                            borderRadius: 3,
                            overflow: 'hidden',
                            aspectRatio: '1 / 1',
                            border: '1px solid',
                            borderColor: 'divider',
                            textDecoration: 'none',
                            transform: idx % 2 === 1 ? { sm: 'translateY(18px)' } : 'none',
                          }}
                        >
                          <Box
                            component="img"
                            src={item.imageUrl}
                            alt={item.name}
                            className="mtl-cover-img"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(180deg, transparent 48%, rgba(0,0,0,0.85) 100%)',
                              p: 1.75,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.75)' }}>
                              {item.artist}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 3 }} />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TrendingGrid limit={8} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TopRatedPanel />
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  // ==========================================
  // HOME LOGADA — VITRINE + FEED + TOP COMUNIDADE
  // ==========================================
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }} className="mtl-reveal">
      {/* Cabeçalho compacto de boas-vindas */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 4,
          pb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' }, mb: 0.5 }}>
            Olá, {user?.name || user?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Veja o que a comunidade está avaliando e explore os lançamentos da semana.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PeopleOutlineIcon fontSize="small" />}
            component={Link}
            to="/search-users"
          >
            Encontrar amigos
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PaletteOutlinedIcon fontSize="small" />}
            component={Link}
            to="/settings?tab=appearance"
          >
            Trocar paleta
          </Button>
        </Box>
      </Box>

      {/* Vitrine horizontal de lançamentos */}
      <TrendingGrid limit={8} />

      {/* Feed Social + Ranking Lateral */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" sx={{ mb: 2.5 }}>
            Atividades Recentes
          </Typography>
          <FeedList />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 88 }}>
            <TopRatedPanel />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default HomePage;
