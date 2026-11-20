import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import ReviewSection from '../ReviewSection';
import PlayButton from '../PlayButton';

export default function ProfilePlaylists({ userId, reviews = [], onReviewUpdate, isOwner = false }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  const [selectedTrackForReview, setSelectedTrackForReview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/spotify/user/${userId}/playlists`);
        setPlaylists(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Não foi possível carregar as playlists do Spotify.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchPlaylists();
  }, [userId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  if (error) {
    return (
      <Alert
        severity="info"
        sx={{ mt: 2, borderRadius: 2.5 }}
        action={
          isOwner ? (
            <Button
              component={Link}
              to="/settings?tab=connections"
              color="inherit"
              size="small"
              startIcon={<SettingsOutlinedIcon fontSize="small" />}
            >
              Conexões
            </Button>
          ) : null
        }
      >
        {error}
      </Alert>
    );
  }

  if (playlists.length === 0) {
    return <Typography sx={{ mt: 2, color: 'text.secondary' }}>Nenhuma playlist encontrada.</Typography>;
  }

  const handleOpenPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist);
    setTracksLoading(true);
    setTracksError(null);
    try {
      const res = await api.get(`/spotify/user/${userId}/playlists/${playlist.id}/tracks`);
      setPlaylistTracks(res.data || []);
    } catch (err) {
      setTracksError(err.response?.data?.error || 'Erro ao carregar músicas da playlist.');
    } finally {
      setTracksLoading(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        {playlists.map((playlist) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={playlist.id}>
            <Box
              onClick={() => handleOpenPlaylist(playlist)}
              className="mtl-album-card"
              sx={{
                cursor: 'pointer',
                p: 1.5,
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': { borderColor: 'primary.main' },
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
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {playlist.imageUrl ? (
                  <Box
                    component="img"
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="mtl-cover-img"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <QueueMusicIcon color="disabled" fontSize="large" />
                )}

                <Box
                  className="mtl-hover-play"
                  sx={{ position: 'absolute', right: 8, bottom: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PlayButton
                    track={{ type: 'playlist', id: playlist.id, name: playlist.name, imageUrl: playlist.imageUrl, externalUrl: playlist.externalUrl }}
                    size="small"
                    filled
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {playlist.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {playlist.tracksTotal} músicas · {playlist.owner}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Dialog de Músicas da Playlist */}
      <Dialog open={!!selectedPlaylist} onClose={() => setSelectedPlaylist(null)} maxWidth="md" fullWidth>
        {selectedPlaylist && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6">{selectedPlaylist.name}</Typography>
                <PlayButton
                  track={{ type: 'playlist', id: selectedPlaylist.id, name: selectedPlaylist.name, imageUrl: selectedPlaylist.imageUrl, externalUrl: selectedPlaylist.externalUrl }}
                  size="small"
                  filled
                />
              </Box>
              <IconButton onClick={() => setSelectedPlaylist(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {tracksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : tracksError ? (
                <Box sx={{ p: 3 }}><Alert severity="error">{tracksError}</Alert></Box>
              ) : playlistTracks.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 3 }}>Esta playlist não possui faixas acessíveis.</Typography>
              ) : (
                <List disablePadding>
                  {playlistTracks.map((track, i) => {
                    const userReview = reviews.find((r) => r.item_id === track.id && r.item_type === 'track');
                    const hasRated = !!userReview;

                    return (
                      <ListItem
                        key={track.id + i}
                        sx={{
                          px: { xs: 2, sm: 3 },
                          py: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar variant="rounded" src={track.imageUrl} sx={{ width: 48, height: 48, mr: 1.5 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>
                                {track.name}
                              </Typography>
                              {hasRated && (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: 'secondary.main', gap: 0.3 }}>
                                  <StarIcon sx={{ fontSize: 14 }} />
                                  <Typography variant="caption" className="mtl-mono" fontWeight={700}>{userReview.rating}</Typography>
                                </Box>
                              )}
                            </Box>
                          }
                          secondary={track.artist}
                          sx={{ m: 0, mr: 1 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PlayButton
                            track={{ id: track.id, name: track.name, artist: track.artist, imageUrl: track.imageUrl, previewUrl: track.previewUrl }}
                            size="small"
                          />
                          <Button
                            variant={hasRated ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setSelectedTrackForReview(track)}
                          >
                            {hasRated ? 'Editar' : 'Avaliar'}
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            onClick={() => navigate(`/track/${track.id}`)}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                          >
                            Detalhes
                          </Button>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Dialog para Avaliação Rápida */}
      <Dialog open={!!selectedTrackForReview} onClose={() => setSelectedTrackForReview(null)} maxWidth="xs" fullWidth>
        {selectedTrackForReview && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Typography variant="h6">Avaliar Música</Typography>
              <IconButton onClick={() => setSelectedTrackForReview(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
                <Avatar variant="rounded" src={selectedTrackForReview.imageUrl} sx={{ width: 68, height: 68, mr: 2 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>{selectedTrackForReview.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{selectedTrackForReview.artist}</Typography>
                </Box>
              </Box>

              <ReviewSection
                itemType="track"
                itemId={selectedTrackForReview.id}
                itemData={{
                  name: selectedTrackForReview.name,
                  imageUrl: selectedTrackForReview.imageUrl,
                  previewUrl: selectedTrackForReview.previewUrl,
                }}
                onReviewSaved={() => {
                  if (onReviewUpdate) onReviewUpdate();
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="text" onClick={() => navigate(`/track/${selectedTrackForReview.id}`)}>
                  Ver página completa da música
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
