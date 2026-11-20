import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getArtistDetails } from '../services/spotify';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Grid,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  alpha,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';
import PlayButton from '../components/PlayButton';
import MediaActionBar from '../components/MediaActionBar';
import { formatCalendarDate } from '../utils/date';

function ArtistDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [albumFilter, setAlbumFilter] = useState('Todos');

  useEffect(() => {
    const fetchArtist = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getArtistDetails(id);
        setArtist(data);
      } catch (err) {
        console.error(err);
        setError('Falha ao carregar os detalhes do artista.');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  if (error || !artist) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Artista não encontrado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  return (
    <Box className="mtl-reveal">
      <Box sx={{ position: 'relative', overflow: 'hidden', pb: 2 }}>
        {artist.imageUrl && (
          <Box
            sx={{
              position: 'absolute',
              inset: -40,
              backgroundImage: `url(${artist.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(52px) saturate(1.2)',
              opacity: 0.2,
              pointerEvents: 'none',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.25)} 0%, ${theme.palette.background.default} 92%)`,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 3 }}>
          <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate(-1)} sx={{ mb: 2.5, color: 'text.secondary' }}>
            Voltar
          </Button>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box
                component="img"
                sx={{
                  width: '100%',
                  maxWidth: { xs: 240, md: '100%' },
                  mx: { xs: 'auto', md: 0 },
                  display: 'block',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'divider',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                }}
                alt={artist.name}
                src={artist.imageUrl}
              />

              <ScoreDistribution itemType="artist" itemId={id} />

              <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  Sobre o Artista
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {artist.followers > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Seguidores no Spotify</Typography>
                      <Typography variant="body2" className="mtl-mono" fontWeight={600}>
                        {artist.followers.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                  {artist.popularity > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                      <Typography variant="body2" className="mtl-mono">{artist.popularity}%</Typography>
                    </Box>
                  )}
                  {artist.genres?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                        Gêneros
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {artist.genres.map((genre, idx) => (
                          <Chip key={idx} label={genre} variant="outlined" size="small" sx={{ textTransform: 'capitalize', fontSize: '0.72rem' }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8.5 }}>
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '2rem', sm: '2.8rem' }, mb: 3 }}>
                {artist.name}
              </Typography>

              <MediaActionBar
                itemType="artist"
                itemId={id}
                itemName={artist.name}
                itemImageUrl={artist.imageUrl}
              />

              <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5, mb: 4 }}>
                <ReviewSection itemType="artist" itemId={id} itemData={{ name: artist.name, imageUrl: artist.imageUrl, previewUrl: null }} />
              </Paper>

              {/* Top Músicas */}
              {artist.topTracks?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MusicNoteIcon color="primary" fontSize="small" />
                    <Typography variant="h5">Top Músicas</Typography>
                  </Box>
                  <Paper sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
                    <List disablePadding>
                      {artist.topTracks.slice(0, 8).map((track, index) => (
                        <React.Fragment key={track.id}>
                          {index > 0 && <Divider component="li" />}
                          <ListItem
                            sx={{ py: 1.25, px: 2, '&:hover': { bgcolor: 'action.hover' } }}
                            secondaryAction={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PlayButton
                                  track={{ id: track.id, name: track.name, artist: track.artist, imageUrl: track.imageUrl, previewUrl: track.previewUrl }}
                                  size="small"
                                />
                                <Button variant="outlined" size="small" component={RouterLink} to={`/track/${track.id}`}>
                                  Ver
                                </Button>
                              </Box>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar variant="rounded" src={track.imageUrl} alt={track.name} sx={{ width: 44, height: 44 }} />
                            </ListItemAvatar>
                            <ListItemText
                              primary={track.name}
                              secondary={track.album}
                              primaryTypographyProps={{ fontWeight: 700, noWrap: true, variant: 'body2' }}
                              secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
                              sx={{ pr: 12 }}
                            />
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {/* Discografia */}
              <Box sx={{ mb: 5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    mb: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlbumIcon color="secondary" fontSize="small" />
                    <Typography variant="h5">Discografia</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {[
                      { key: 'Todos', label: 'Todos' },
                      { key: 'album', label: 'Álbuns' },
                      { key: 'single', label: 'Singles & EPs' },
                    ].map((opt) => (
                      <Chip
                        key={opt.key}
                        label={opt.label}
                        onClick={() => setAlbumFilter(opt.key)}
                        color={albumFilter === opt.key ? 'primary' : 'default'}
                        variant={albumFilter === opt.key ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {artist.albums
                    ?.filter((a) => albumFilter === 'Todos' || a.albumType === albumFilter)
                    .map((album) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={album.id}>
                        <Box
                          component={RouterLink}
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
                            '&:hover': { borderColor: 'primary.main' },
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              borderRadius: 2,
                              overflow: 'hidden',
                              bgcolor: 'action.hover',
                              mb: 1,
                            }}
                          >
                            <Box
                              component="img"
                              src={album.imageUrl}
                              alt={album.name}
                              className="mtl-cover-img"
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {album.name}
                          </Typography>
                          <Typography variant="caption" className="mtl-mono" color="text.secondary" display="block">
                            {formatCalendarDate(album.releaseDate)}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                </Grid>
              </Box>

              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Avaliações da Comunidade
              </Typography>
              <FriendsReviews itemType="artist" itemId={id} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default ArtistDetailsPage;
