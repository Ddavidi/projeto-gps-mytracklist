import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  FormControlLabel,
  Switch,
  Paper,
  Snackbar,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AddIcon from '@mui/icons-material/Add';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  getUserLists,
  createList,
  deleteList,
  getListById,
  addItemsBulkToList,
  exportPlaylistToSpotify,
  importSpotifyPlaylistById,
} from '../../services/lists';
import ReviewSection from '../ReviewSection';
import PlayButton from '../PlayButton';

function extractSpotifyPlaylistId(input) {
  const clean = String(input || '').trim();
  const urlMatch = clean.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = clean.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  if (/^[a-zA-Z0-9]{15,30}$/.test(clean)) return clean;
  return null;
}

export default function ProfilePlaylists({ userId, reviews = [], onReviewUpdate, isOwner = false }) {
  // Sub-aba: 'mtl' (Playlists criadas/importadas no MyTrackList) | 'spotify' (Playlists puxadas da conta Spotify)
  const [sourceTab, setSourceTab] = useState('mtl');

  // Playlists do MyTrackList (list_type === 'playlist')
  const [mtlPlaylists, setMtlPlaylists] = useState([]);
  const [mtlLoading, setMtlLoading] = useState(true);

  // Playlists do Spotify
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [spotifyLoading, setSpotifyLoading] = useState(true);
  const [spotifyError, setSpotifyError] = useState(null);

  // Modais de criação / importação por link
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const [importLinkOpen, setImportLinkOpen] = useState(false);
  const [importLinkValue, setImportLinkValue] = useState('');
  const [importingId, setImportingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);

  // Modal de faixas da playlist do Spotify
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  const [selectedTrackForReview, setSelectedTrackForReview] = useState(null);

  // Feedback Snackbar
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success', url: null });
  const showSnack = (message, severity = 'success', url = null) =>
    setSnack({ open: true, message, severity, url });

  const navigate = useNavigate();

  const loadMtlPlaylists = useCallback(async () => {
    if (!userId) return;
    setMtlLoading(true);
    try {
      const lists = await getUserLists(userId);
      setMtlPlaylists((lists || []).filter((l) => l.list_type === 'playlist'));
    } catch {
      setMtlPlaylists([]);
    } finally {
      setMtlLoading(false);
    }
  }, [userId]);

  const loadSpotifyPlaylists = useCallback(async () => {
    if (!userId) return;
    setSpotifyLoading(true);
    setSpotifyError(null);
    try {
      const res = await api.get(`/spotify/user/${userId}/playlists`);
      setSpotifyPlaylists(res.data || []);
    } catch (err) {
      setSpotifyError(err.response?.data?.error || 'Não foi possível carregar as playlists do Spotify.');
    } finally {
      setSpotifyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMtlPlaylists();
    loadSpotifyPlaylists();
  }, [loadMtlPlaylists, loadSpotifyPlaylists]);

  const handleCreateMtlPlaylist = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await createList({
        title: newTitle.trim(),
        description: newDesc.trim(),
        isRanked: false,
        isPublic: newPublic,
        listType: 'playlist',
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      await loadMtlPlaylists();
      if (res?.listId) {
        navigate(`/lists/${res.listId}`);
      }
    } catch (err) {
      showSnack(err.response?.data?.error || 'Erro ao criar playlist.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleImportFromSpotify = async (spotifyPlaylistId, fallbackTitle = 'Playlist Importada') => {
    if (!spotifyPlaylistId || importingId) return;
    setImportingId(spotifyPlaylistId);
    try {
      const spData = await importSpotifyPlaylistById(spotifyPlaylistId);
      const created = await createList({
        title: spData.name || fallbackTitle,
        description: spData.description || 'Importada do Spotify',
        isRanked: false,
        isPublic: true,
        listType: 'playlist',
      });

      const trackItems = (spData.tracks || []).map((t) => ({
        itemId: t.id,
        itemType: 'track',
        itemName: t.name,
        itemArtist: t.artist,
        itemImageUrl: t.imageUrl,
      }));

      if (created?.listId && trackItems.length > 0) {
        await addItemsBulkToList(created.listId, trackItems);
      }

      await loadMtlPlaylists();
      setImportLinkOpen(false);
      setImportLinkValue('');
      setSourceTab('mtl');
      showSnack(`Playlist "${spData.name || fallbackTitle}" importada (${trackItems.length} faixas)!`);
    } catch (err) {
      showSnack(err.response?.data?.error || 'Falha ao importar playlist do Spotify.', 'error');
    } finally {
      setImportingId(null);
    }
  };

  const handleImportByLinkSubmit = async (e) => {
    e.preventDefault();
    const id = extractSpotifyPlaylistId(importLinkValue);
    if (!id) {
      showSnack('Cole um link válido de playlist do Spotify (ex: https://open.spotify.com/playlist/...).', 'warning');
      return;
    }
    await handleImportFromSpotify(id, 'Playlist Importada');
  };

  const handleExportMtlPlaylist = async (e, list) => {
    e.preventDefault();
    e.stopPropagation();
    setExportingId(list.id);
    try {
      const full = await getListById(list.id);
      const trackIds = (full?.items || []).filter((i) => i.item_type === 'track').map((i) => i.item_id);
      if (trackIds.length === 0) {
        showSnack('Adicione pelo menos uma música na playlist antes de exportar.', 'warning');
        return;
      }
      const res = await exportPlaylistToSpotify({
        name: full.title,
        description: full.description || 'Criada no MyTrackList',
        isPublic: full.is_public,
        trackIds,
      });
      await loadSpotifyPlaylists();
      showSnack(`Exportada para seu Spotify (${res.tracksAdded} faixas)!`, 'success', res.externalUrl);
    } catch (err) {
      showSnack(err.response?.data?.error || 'Conecte sua conta Spotify em Configurações para exportar.', 'error');
    } finally {
      setExportingId(null);
    }
  };

  const handleDeleteMtlPlaylist = async (e, listId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Deseja excluir esta playlist do MyTrackList?')) return;
    try {
      await deleteList(listId);
      setMtlPlaylists((prev) => prev.filter((p) => p.id !== listId));
      showSnack('Playlist excluída.', 'info');
    } catch {
      showSnack('Erro ao excluir playlist.', 'error');
    }
  };

  const handleOpenSpotifyPlaylist = async (playlist) => {
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
      {/* Seletor de Origem: Playlists do MyTrackList vs Playlists do Spotify */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sourceTab}
          onChange={(_e, val) => val && setSourceTab(val)}
          color="primary"
        >
          <ToggleButton value="mtl" sx={{ textTransform: 'none', fontWeight: 700, gap: 0.75, px: 2 }}>
            <QueueMusicIcon sx={{ fontSize: 17 }} />
            MyTrackList ({mtlPlaylists.length})
          </ToggleButton>
          <ToggleButton value="spotify" sx={{ textTransform: 'none', fontWeight: 700, gap: 0.75, px: 2 }}>
            <GraphicEqIcon sx={{ fontSize: 17 }} />
            Do Spotify ({spotifyPlaylists.length})
          </ToggleButton>
        </ToggleButtonGroup>

        {isOwner && sourceTab === 'mtl' && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkIcon fontSize="small" />}
              onClick={() => setImportLinkOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Importar do Spotify
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setCreateOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Nova Playlist
            </Button>
          </Box>
        )}
      </Box>

      {/* =============================================== */}
      {/* SUB-ABA 1: PLAYLISTS DO MYTRACKLIST             */}
      {/* =============================================== */}
      {sourceTab === 'mtl' && (
        mtlLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : mtlPlaylists.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <QueueMusicIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {isOwner ? 'Você ainda não criou playlists no MyTrackList' : 'Nenhuma playlist pública criada no MyTrackList'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '48ch', mx: 'auto', mb: isOwner ? 2.5 : 0 }}>
              {isOwner
                ? 'Crie playlists aqui, importe playlists do seu Spotify para editar ou exporte suas playlists direto para o Spotify.'
                : 'Quando este usuário criar playlists públicas no MyTrackList, elas aparecerão aqui.'}
            </Typography>
            {isOwner && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                  Criar primeira playlist
                </Button>
                <Button variant="outlined" size="small" startIcon={<LinkIcon />} onClick={() => setImportLinkOpen(true)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                  Importar link do Spotify
                </Button>
              </Box>
            )}
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {mtlPlaylists.map((list) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={list.id}>
                <Paper
                  component={Link}
                  to={`/lists/${list.id}`}
                  className="mtl-album-card"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 0.5,
                      aspectRatio: '16 / 9',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      mb: 1.5,
                    }}
                  >
                    {[0, 1, 2, 3].map((slot) => (
                      <Box
                        key={slot}
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                          backgroundImage: list.preview_covers?.[slot] ? `url(${list.preview_covers[slot]})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ))}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {list.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, flex: 1 }}>
                    {list.items_count} {list.items_count === 1 ? 'música' : 'músicas'} · {list.is_public ? 'Pública' : 'Privada'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={exportingId === list.id}
                      startIcon={exportingId === list.id ? <CircularProgress size={13} /> : <IosShareIcon sx={{ fontSize: 15 }} />}
                      onClick={(e) => handleExportMtlPlaylist(e, list)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Exportar p/ Spotify
                    </Button>
                    {isOwner && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => handleDeleteMtlPlaylist(e, list.id)}
                        aria-label="Excluir playlist"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* =============================================== */}
      {/* SUB-ABA 2: PLAYLISTS PUXADAS DO SPOTIFY         */}
      {/* =============================================== */}
      {sourceTab === 'spotify' && (
        spotifyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : spotifyError ? (
          <Alert
            severity="info"
            sx={{ mt: 1, borderRadius: 2.5 }}
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
            {spotifyError}
          </Alert>
        ) : spotifyPlaylists.length === 0 ? (
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>
            Nenhuma playlist encontrada na conta do Spotify.
          </Typography>
        ) : (
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            {spotifyPlaylists.map((playlist) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={playlist.id}>
                <Box
                  onClick={() => handleOpenSpotifyPlaylist(playlist)}
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
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.25 }}>
                    {playlist.tracksTotal} faixas
                  </Typography>

                  {isOwner && (
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      disabled={importingId === playlist.id}
                      startIcon={importingId === playlist.id ? <CircularProgress size={13} /> : <DownloadOutlinedIcon sx={{ fontSize: 15 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportFromSpotify(playlist.id, playlist.name);
                      }}
                      sx={{ mt: 'auto', borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}
                    >
                      {importingId === playlist.id ? 'Importando...' : 'Importar p/ Site'}
                    </Button>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* Modal Criar Nova Playlist no MyTrackList */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3.5 } }}>
        <Box component="form" onSubmit={handleCreateMtlPlaylist}>
          <DialogTitle sx={{ fontWeight: 800 }}>Nova Playlist no MyTrackList</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
            <TextField
              label="Nome da Playlist"
              required
              autoFocus
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Rock para treinar, Clássicos 2000..."
            />
            <TextField
              label="Descrição (opcional)"
              multiline
              rows={2}
              fullWidth
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={newPublic} onChange={(e) => setNewPublic(e.target.checked)} color="primary" />}
              label="Visível para outros usuários"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateOpen(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" disabled={creating || !newTitle.trim()}>
              {creating ? 'Criando...' : 'Criar Playlist'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Modal Importar Playlist por Link do Spotify */}
      <Dialog open={importLinkOpen} onClose={() => setImportLinkOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3.5 } }}>
        <Box component="form" onSubmit={handleImportByLinkSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>Importar Playlist do Spotify</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
            <Typography variant="body2" color="text.secondary">
              Cole o link de uma playlist do Spotify para trazer as faixas para suas Playlists do MyTrackList.
            </Typography>
            <TextField
              label="Link ou ID da Playlist do Spotify"
              required
              autoFocus
              fullWidth
              value={importLinkValue}
              onChange={(e) => setImportLinkValue(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setImportLinkOpen(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" disabled={Boolean(importingId) || !importLinkValue.trim()}>
              {importingId ? 'Importando...' : 'Importar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Modal Faixas da Playlist do Spotify */}
      <Dialog open={Boolean(selectedPlaylist)} onClose={() => setSelectedPlaylist(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3.5 } }}>
        {selectedPlaylist && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} noWrap>{selectedPlaylist.name}</Typography>
                <Typography variant="caption" color="text.secondary">Playlist do Spotify · {selectedPlaylist.tracksTotal} faixas</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isOwner && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={importingId === selectedPlaylist.id}
                    startIcon={<DownloadOutlinedIcon fontSize="small" />}
                    onClick={() => handleImportFromSpotify(selectedPlaylist.id, selectedPlaylist.name)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Importar
                  </Button>
                )}
                <IconButton onClick={() => setSelectedPlaylist(null)} size="small">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {tracksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : tracksError ? (
                <Alert severity="error">{tracksError}</Alert>
              ) : (
                <List disablePadding>
                  {playlistTracks.map((track) => {
                    const userRev = reviews.find((r) => r.item_id === track.id && r.item_type === 'track');
                    return (
                      <ListItem
                        key={track.id}
                        sx={{ px: 1, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
                        secondaryAction={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <PlayButton
                              track={{ type: 'track', id: track.id, name: track.name, imageUrl: track.imageUrl, previewUrl: track.previewUrl }}
                              size="small"
                            />
                            <IconButton
                              size="small"
                              color={userRev ? 'secondary' : 'default'}
                              onClick={() => setSelectedTrackForReview(track)}
                              title={userRev ? `Sua nota: ${userRev.rating}/10` : 'Avaliar faixa'}
                            >
                              <StarIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={track.imageUrl}
                            onClick={() => navigate(`/music/${track.id}`)}
                            sx={{ width: 42, height: 42, cursor: 'pointer' }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              onClick={() => navigate(`/music/${track.id}`)}
                              sx={{ cursor: 'pointer', maxWidth: { xs: 150, sm: 260 }, '&:hover': { color: 'primary.main' } }}
                            >
                              {track.name}
                            </Typography>
                          }
                          secondary={track.artist}
                          secondaryTypographyProps={{ noWrap: true, sx: { maxWidth: { xs: 150, sm: 260 } } }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Modal Avaliar Faixa da Playlist */}
      <Dialog open={Boolean(selectedTrackForReview)} onClose={() => setSelectedTrackForReview(null)} maxWidth="sm" fullWidth>
        {selectedTrackForReview && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar variant="rounded" src={selectedTrackForReview.imageUrl} sx={{ width: 44, height: 44 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{selectedTrackForReview.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedTrackForReview.artist}</Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setSelectedTrackForReview(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <ReviewSection
                itemType="track"
                itemId={selectedTrackForReview.id}
                defaultEditing
                itemData={{
                  name: selectedTrackForReview.name,
                  imageUrl: selectedTrackForReview.imageUrl,
                  artist: selectedTrackForReview.artist,
                }}
                onReviewSaved={() => {
                  setSelectedTrackForReview(null);
                  if (onReviewUpdate) onReviewUpdate();
                }}
              />
            </DialogContent>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 96 }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          action={
            snack.url ? (
              <Button
                component="a"
                href={snack.url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                color="inherit"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ fontWeight: 700 }}
              >
                Abrir
              </Button>
            ) : null
          }
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
