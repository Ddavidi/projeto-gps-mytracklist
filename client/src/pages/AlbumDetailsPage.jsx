import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getAlbumDetails } from '../services/spotify';
import api from '../services/api';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';
import ReviewSection from '../components/ReviewSection';
import FriendsReviews from '../components/FriendsReviews';
import ScoreDistribution from '../components/ScoreDistribution';
import PlayButton from '../components/PlayButton';
import MediaActionBar from '../components/MediaActionBar';
import { formatCalendarDate } from '../utils/date';

function AlbumDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRatings, setUserRatings] = useState({});
  const [reviewTrackModal, setReviewTrackModal] = useState(null);

  const fetchTrackRatings = async (tracks) => {
    if (!tracks || tracks.length === 0) return;
    const items = tracks.map((t) => ({ itemType: 'track', itemId: t.id }));
    try {
      const res = await api.post('/reviews/batch', { items });
      const ratingsMap = {};
      res.data.forEach((r) => { ratingsMap[r.item_id] = r.rating; });
      setUserRatings(ratingsMap);
    } catch (err) {
      console.error('Failed to fetch track ratings', err);
    }
  };

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAlbumDetails(id);
        setAlbum(data);
        await fetchTrackRatings(data.tracks);
      } catch (err) {
        console.error(err);
        setError('Falha ao carregar os detalhes do álbum.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  if (error || !album) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Álbum não encontrado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  const ratedValues = Object.values(userRatings).filter((v) => typeof v === 'number');
  const trackAverageInfo =
    ratedValues.length > 0 && album?.tracks?.length > 0
      ? {
          average: ratedValues.reduce((acc, v) => acc + v, 0) / ratedValues.length,
          count: ratedValues.length,
          total: album.tracks.length,
        }
      : null;

  return (
    <Box className="mtl-reveal">
      {/* Backdrop cinematográfico da capa do álbum */}
      <Box sx={{ position: 'relative', overflow: 'hidden', pb: 2 }}>
        {album.imageUrl && (
          <Box
            sx={{
              position: 'absolute',
              inset: -40,
              backgroundImage: `url(${album.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(52px) saturate(1.25)',
              opacity: 0.24,
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
            {/* Sidebar (Capa + Distribuição + Ficha) */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box
                component="img"
                sx={{
                  width: '100%',
                  maxWidth: { xs: 280, md: '100%' },
                  mx: { xs: 'auto', md: 0 },
                  display: 'block',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                }}
                alt={album.name}
                src={album.imageUrl}
              />

              <ScoreDistribution itemType="album" itemId={id} />

              <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  Ficha Técnica
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Tipo</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{album.albumType || 'Álbum'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Total de Faixas</Typography>
                    <Typography variant="body2" className="mtl-mono">{album.totalTracks}</Typography>
                  </Box>
                  {album.releaseDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Lançamento</Typography>
                      <Typography variant="body2" className="mtl-mono">{formatCalendarDate(album.releaseDate)}</Typography>
                    </Box>
                  )}
                  {album.label && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Gravadora</Typography>
                      <Typography variant="body2">{album.label}</Typography>
                    </Box>
                  )}
                  {album.popularity > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Popularidade</Typography>
                      <Typography variant="body2" className="mtl-mono">{album.popularity}%</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Conteúdo Principal */}
            <Grid size={{ xs: 12, md: 8.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.9rem', sm: '2.6rem' } }}>
                  {album.name}
                </Typography>
                <PlayButton
                  track={{ type: 'album', id, name: album.name, artist: album.artist, imageUrl: album.imageUrl }}
                  size="medium"
                  filled
                />
              </Box>

              {album.artistId ? (
                <Box
                  component={RouterLink}
                  to={`/artist/${album.artistId}`}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1.25,
                    mb: 4,
                    textDecoration: 'none',
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <Avatar src={album.artistImageUrl} alt={album.artist} sx={{ width: 30, height: 30 }}>
                    {album.artist?.charAt(0)}
                  </Avatar>
                  <Typography variant="h6" color="inherit" fontWeight={600}>
                    {album.artist}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                  {album.artist}
                </Typography>
              )}

              <MediaActionBar
                itemType="album"
                itemId={id}
                itemName={album.name}
                itemArtist={album.artist}
                itemImageUrl={album.imageUrl}
              />

              <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5, mb: 4 }}>
                <ReviewSection
                  itemType="album"
                  itemId={id}
                  itemData={{ name: album.name, imageUrl: album.imageUrl, previewUrl: null }}
                  trackAverageInfo={trackAverageInfo}
                />
              </Paper>

              {/* Tracklist */}
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Faixas do Álbum
              </Typography>
              <Paper sx={{ borderRadius: 3.5, overflow: 'hidden', mb: 5 }}>
                <List disablePadding>
                  {album.tracks?.map((track, index) => (
                    <React.Fragment key={track.id}>
                      {index > 0 && <Divider component="li" />}
                      <ListItem
                        sx={{
                          py: 1.5,
                          px: { xs: 1.5, sm: 2.5 },
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          transition: 'background-color 0.18s ease',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', mb: { xs: 1, sm: 0 }, minWidth: 0 }}>
                          <Typography variant="body2" className="mtl-mono" color="text.secondary" sx={{ width: 32, fontWeight: 600, flexShrink: 0 }}>
                            {String(track.trackNumber || index + 1).padStart(2, '0')}
                          </Typography>
                          <ListItemText
                            primary={track.name}
                            secondary={track.artist !== album.artist && track.artist ? track.artist : null}
                            primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                            secondaryTypographyProps={{ noWrap: true }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: { xs: 4, sm: 0 } }}>
                          {userRatings[track.id] ? (
                            <Button
                              size="small"
                              onClick={() => setReviewTrackModal(track)}
                              sx={{ color: 'secondary.main', minWidth: 0, px: 1, py: 0.35 }}
                            >
                              <StarIcon fontSize="small" />
                              <Typography variant="caption" className="mtl-mono" fontWeight={700} sx={{ ml: 0.4 }}>
                                {userRatings[track.id]}/10
                              </Typography>
                            </Button>
                          ) : (
                            <Tooltip title="Avaliar Faixa">
                              <IconButton size="small" onClick={() => setReviewTrackModal(track)} sx={{ color: 'text.secondary' }}>
                                <StarBorderIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Typography variant="caption" className="mtl-mono" color="text.secondary" sx={{ minWidth: 38, textAlign: 'right' }}>
                            {formatDuration(track.durationMs)}
                          </Typography>

                          <PlayButton
                            track={{ id: track.id, name: track.name, artist: track.artist || album.artist, imageUrl: album.imageUrl, previewUrl: track.previewUrl }}
                            size="small"
                          />

                          <Button
                            variant="outlined"
                            size="small"
                            component={RouterLink}
                            to={`/track/${track.id}`}
                            startIcon={<MusicNoteIcon fontSize="small" />}
                          >
                            Ver
                          </Button>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>

              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Avaliações da Comunidade
              </Typography>
              <FriendsReviews itemType="album" itemId={id} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Modal de Avaliar Faixa Inline */}
      <Dialog open={!!reviewTrackModal} onClose={() => setReviewTrackModal(null)} maxWidth="sm" fullWidth>
        {reviewTrackModal && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant="rounded" src={album.imageUrl} alt={reviewTrackModal.name} sx={{ width: 48, height: 48 }} />
                <Box>
                  <Typography variant="h6" lineHeight={1.2}>{reviewTrackModal.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{reviewTrackModal.artist || album.artist}</Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setReviewTrackModal(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              <ReviewSection
                itemType="track"
                itemId={reviewTrackModal.id}
                itemData={{
                  name: reviewTrackModal.name,
                  imageUrl: album.imageUrl,
                  artist: reviewTrackModal.artist || album.artist,
                }}
                onReviewSaved={() => {
                  fetchTrackRatings(album.tracks);
                  setReviewTrackModal(null);
                }}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default AlbumDetailsPage;
