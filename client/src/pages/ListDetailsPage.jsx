import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { getListById, updateList, addItemToList, removeItemFromList, toggleLikeList } from '../services/lists';
import { searchMulti } from '../services/spotify';
import { useAuth } from '../context/AuthContext';

export default function ListDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const uid = user?.id || user?.userId;

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRanked, setEditRanked] = useState(true);
  const [editPublic, setEditPublic] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditDialog = () => {
    if (!list) return;
    setEditTitle(list.title || '');
    setEditDescription(list.description || '');
    setEditRanked(Boolean(list.is_ranked));
    setEditPublic(Boolean(list.is_public));
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !list) return;
    setSavingEdit(true);
    try {
      await updateList(list.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        isRanked: editRanked,
        isPublic: editPublic,
      });
      setEditOpen(false);
      loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar lista.');
    } finally {
      setSavingEdit(false);
    }
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getListById(id);
      setList(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível carregar esta lista.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleToggleLike = async () => {
    if (!isAuthenticated || !list) return;
    const res = await toggleLikeList(list.id);
    setList((prev) => ({
      ...prev,
      is_liked: res.liked,
      likes_count: prev.likes_count + (res.liked ? 1 : -1),
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchMulti(query.trim());
      const targetType = list?.list_type || 'album';
      let filtered = [];
      if (targetType === 'album') {
        filtered = (res.albums || []).slice(0, 6).map((a) => ({ itemId: a.id, itemType: 'album', itemName: a.name, itemArtist: a.artist, itemImageUrl: a.imageUrl }));
      } else if (targetType === 'track') {
        filtered = (res.tracks || []).slice(0, 6).map((t) => ({ itemId: t.id, itemType: 'track', itemName: t.name, itemArtist: t.artist, itemImageUrl: t.imageUrl }));
      } else if (targetType === 'artist') {
        filtered = (res.artists || []).slice(0, 6).map((ar) => ({ itemId: ar.id, itemType: 'artist', itemName: ar.name, itemArtist: ar.genres?.slice(0, 2).join(', ') || 'Artista', itemImageUrl: ar.imageUrl }));
      }
      setSearchResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  const handleAddItem = async (item) => {
    try {
      await addItemToList(list.id, item);
      setSearchResults([]);
      setQuery('');
      loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar item.');
    }
  };

  const handleRemoveItem = async (itemRowId) => {
    await removeItemFromList(list.id, itemRowId);
    loadList();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !list) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Lista não encontrada.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Voltar</Button>
      </Container>
    );
  }

  const isOwner = uid && list.user_id === uid;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }} className="mtl-reveal">
      <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate(-1)} sx={{ mb: 2, color: 'text.secondary' }}>
        Voltar
      </Button>

      <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={
                  list.list_type === 'track'
                    ? '🎵 Lista de Músicas'
                    : list.list_type === 'artist'
                    ? '🎤 Lista de Artistas'
                    : '💿 Lista de Álbuns'
                }
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              {list.is_ranked && <Chip size="small" label="Ranqueada" variant="outlined" />}
              {!list.is_public && <Chip size="small" label="Privada" variant="outlined" />}
            </Box>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', sm: '2.3rem' }, mb: 1 }}>
              {list.title}
            </Typography>
            {list.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {list.description}
              </Typography>
            )}
            <Box
              component={Link}
              to={`/user/${list.author_username}`}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <Avatar src={list.author_avatar} sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                {list.author_username?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" fontWeight={600}>@{list.author_username}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOwner && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={openEditDialog}
                sx={{ borderRadius: 2 }}
              >
                Editar
              </Button>
            )}
            <Button
              variant={list.is_liked ? 'contained' : 'outlined'}
              color={list.is_liked ? 'error' : 'inherit'}
              startIcon={list.is_liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
              onClick={handleToggleLike}
              disabled={!isAuthenticated}
            >
              <Box component="span" className="mtl-mono">{list.likes_count}</Box>
            </Button>
          </Box>
        </Box>

        {/* Adicionar itens diretamente (se dono) */}
        {isOwner && (
          <Box sx={{ mt: 3.5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Adicionar {list.list_type === 'track' ? 'música' : list.list_type === 'artist' ? 'artista' : 'álbum'} à lista
            </Typography>
            <Box component="form" onSubmit={handleSearch}>
              <TextField
                fullWidth
                size="small"
                placeholder="Pesquisar no Spotify para adicionar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" size="small" color="primary" disabled={searching}>
                        {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {searchResults.length > 0 && (
              <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
                {searchResults.map((res) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={`${res.itemType}-${res.itemId}`}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Avatar variant="rounded" src={res.itemImageUrl} sx={{ width: 42, height: 42 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{res.itemName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {res.itemType === 'album' ? 'Álbum' : 'Música'} · {res.itemArtist}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="primary" onClick={() => handleAddItem(res)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Itens da Lista */}
      {list.items?.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Esta lista ainda não tem nenhum item.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          {list.items.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <Divider />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: { xs: 2, sm: 3 },
                  py: 1.75,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {list.is_ranked && (
                  <Typography
                    variant="h6"
                    className="mtl-mono"
                    fontWeight={800}
                    color={idx < 3 ? 'primary.main' : 'text.secondary'}
                    sx={{ minWidth: 32 }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </Typography>
                )}
                <Avatar
                  component={Link}
                  to={`/${item.item_type}/${item.item_id}`}
                  variant="rounded"
                  src={item.item_image_url}
                  sx={{ width: 56, height: 56 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component={Link}
                    to={`/${item.item_type}/${item.item_id}`}
                    variant="subtitle1"
                    fontWeight={700}
                    noWrap
                    sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block' }}
                  >
                    {item.item_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {item.item_artist || (item.item_type === 'album' ? 'Álbum' : 'Música')}
                  </Typography>
                </Box>

                {isOwner && (
                  <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)} aria-label="Remover item">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </React.Fragment>
          ))}
        </Paper>
      )}
      {/* Modal Editar Tier List */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3.5 } }}>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogTitle sx={{ fontWeight: 800 }}>Editar Tier List</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
            <TextField
              label="Título"
              required
              fullWidth
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextField
              label="Descrição (opcional)"
              multiline
              rows={2}
              fullWidth
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={editRanked} onChange={(e) => setEditRanked(e.target.checked)} color="primary" />}
              label="Lista ranqueada (1º, 2º, 3º...)"
            />
            <FormControlLabel
              control={<Switch checked={editPublic} onChange={(e) => setEditPublic(e.target.checked)} color="primary" />}
              label="Pública para a comunidade"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setEditOpen(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" disabled={savingEdit || !editTitle.trim()}>
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
}

