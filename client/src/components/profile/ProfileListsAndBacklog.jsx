import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Divider,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkRemoveOutlinedIcon from '@mui/icons-material/BookmarkRemoveOutlined';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import AlbumIcon from '@mui/icons-material/Album';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { getUserLists, createList, deleteList } from '../../services/lists';
import { getUserListenLater, removeListenLater } from '../../services/listenLater';

export default function ProfileListsAndBacklog({ userId, isOwner = false }) {
  const [lists, setLists] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userLists, listenLater] = await Promise.all([
        getUserLists(userId),
        getUserListenLater(userId),
      ]);
      setLists(userLists || []);
      setBacklog(listenLater || []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createList({ title: title.trim(), description: description.trim(), isRanked, isPublic });
      setTitle('');
      setDescription('');
      setCreateOpen(false);
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Apagar esta lista permanentemente?')) return;
    await deleteList(listId);
    loadData();
  };

  const handleRemoveBacklog = async (itemType, itemId) => {
    await removeListenLater(itemType, itemId);
    setBacklog((prev) => prev.filter((i) => !(i.item_type === itemType && i.item_id === itemId)));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Seção 1: Listas Customizadas */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6">Listas Customizadas</Typography>
          <Typography variant="caption" color="text.secondary">
            Rankings temáticos, recomendações e coleções musicais.
          </Typography>
        </Box>
        {isOwner && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nova Lista
          </Button>
        )}
      </Box>

      {lists.length === 0 ? (
        <Paper sx={{ p: 3.5, borderRadius: 3, mb: 4, textAlign: 'center', bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
          <Typography variant="body2" color="text.secondary">
            {isOwner
              ? 'Você ainda não criou nenhuma lista. Monte um "Top 10 Álbuns da Vida" ou uma seleção por vibe!'
              : 'Este usuário ainda não publicou listas.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {lists.map((list) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={list.id}>
              <Paper
                className="mtl-album-card"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box component={Link} to={`/lists/${list.id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                  {/* Colagem de até 4 capas */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 0.5,
                      height: 82,
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
                          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                          backgroundImage: list.preview_covers?.[slot] ? `url(${list.preview_covers[slot]})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {!list.preview_covers?.[slot] && <AlbumIcon sx={{ fontSize: 18, opacity: 0.25 }} />}
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {list.title}
                  </Typography>
                  {list.description && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {list.description}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={`${list.items_count} itens`} variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                    {list.is_ranked && <FormatListNumberedIcon color="primary" sx={{ fontSize: 16 }} />}
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, color: 'text.secondary' }}>
                      <FavoriteIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" className="mtl-mono">{list.likes_count}</Typography>
                    </Box>
                  </Box>
                  {isOwner && (
                    <IconButton size="small" color="error" onClick={() => handleDeleteList(list.id)} aria-label="Apagar lista">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Seção 2: Quero Ouvir (Listen Later) */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6">Quero Ouvir ({backlog.length})</Typography>
        <Typography variant="caption" color="text.secondary">
          Álbuns e faixas salvos na fila para escutar e avaliar depois.
        </Typography>
      </Box>

      {backlog.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum item salvo na fila Quero Ouvir ainda.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {backlog.map((item) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item.id}>
              <Paper className="mtl-album-card" sx={{ p: 1.25, borderRadius: 3, height: '100%' }}>
                <Box
                  component={Link}
                  to={`/${item.item_type}/${item.item_id}`}
                  sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
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
                    {item.item_image_url ? (
                      <Box
                        component="img"
                        src={item.item_image_url}
                        alt={item.item_name}
                        className="mtl-cover-img"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlbumIcon color="disabled" />
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {item.item_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {item.item_artist || (item.item_type === 'album' ? 'Álbum' : 'Música')}
                  </Typography>
                </Box>

                {isOwner && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<BookmarkRemoveOutlinedIcon sx={{ fontSize: 15 }} />}
                      onClick={() => handleRemoveBacklog(item.item_type, item.item_id)}
                      sx={{ fontSize: '0.72rem', color: 'text.secondary', py: 0.2 }}
                    >
                      Remover
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Criar Lista */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Nova Lista Musical</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <TextField
              label="Título da Lista"
              placeholder="Ex: Melhores discos para ouvir à noite"
              required
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Descrição (opcional)"
              multiline
              rows={2}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={isRanked} onChange={(e) => setIsRanked(e.target.checked)} color="primary" />}
              label="Lista ranqueada (1º, 2º, 3º...)"
            />
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} color="primary" />}
              label="Visível para a comunidade"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateOpen(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" disabled={submitting || !title.trim()}>
              {submitting ? 'Criando...' : 'Criar Lista'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

