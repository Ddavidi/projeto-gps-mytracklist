import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Typography,
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import { checkListenLater, addListenLater, removeListenLater } from '../services/listenLater';
import { getUserFavorites, addFavorite, removeFavorite } from '../services/favorites';
import { getUserLists, createList, addItemToList } from '../services/lists';

export default function MediaActionBar({ itemType, itemId, itemName, itemArtist = '', itemImageUrl = '' }) {
  const { user, isAuthenticated } = useAuth();
  const uid = user?.id || user?.userId;

  const [inListenLater, setInListenLater] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [busyLater, setBusyLater] = useState(false);
  const [busyFav, setBusyFav] = useState(false);

  const [listModalOpen, setListModalOpen] = useState(false);
  const [myLists, setMyLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const notify = (message, severity = 'success') => setSnack({ open: true, message, severity });

  useEffect(() => {
    if (!isAuthenticated || !uid || !itemId) return;
    checkListenLater(itemType, itemId).then(setInListenLater).catch(() => {});
    getUserFavorites(uid)
      .then((favs) => setIsFav((favs || []).some((f) => f.item_type === itemType && f.item_id === itemId)))
      .catch(() => {});
  }, [isAuthenticated, uid, itemType, itemId]);

  const handleToggleListenLater = async () => {
    if (!isAuthenticated) return;
    setBusyLater(true);
    try {
      if (inListenLater) {
        await removeListenLater(itemType, itemId);
        setInListenLater(false);
        notify('Removido de Quero Ouvir');
      } else {
        await addListenLater({ itemId, itemType, itemName, itemArtist, itemImageUrl });
        setInListenLater(true);
        notify('Salvo em Quero Ouvir');
      }
    } catch {
      notify('Erro ao atualizar Quero Ouvir', 'error');
    } finally {
      setBusyLater(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return;
    setBusyFav(true);
    try {
      if (isFav) {
        await removeFavorite(itemType, itemId);
        setIsFav(false);
        notify('Removido dos Favoritos do Perfil');
      } else {
        await addFavorite(itemType, itemId);
        setIsFav(true);
        notify(itemType === 'album' ? 'Adicionado aos Álbuns Favoritos (Top 5)!' : 'Adicionado aos Favoritos!');
      }
    } catch (err) {
      notify(err.response?.data?.error || 'Erro ao atualizar favoritos', 'error');
    } finally {
      setBusyFav(false);
    }
  };

  const handleOpenLists = async () => {
    setListModalOpen(true);
    setLoadingLists(true);
    try {
      const lists = await getUserLists(uid);
      const expectedType = ['album', 'track', 'artist'].includes(itemType) ? itemType : 'album';
      // Não misturar álbum, música e artista nas listas personalizadas
      const filtered = (lists || []).filter((l) => (l.list_type || 'album') === expectedType);
      setMyLists(filtered);
    } catch {
      notify('Erro ao carregar suas listas', 'error');
    } finally {
      setLoadingLists(false);
    }
  };

  const handleAddToExistingList = async (listId, listTitle) => {
    try {
      await addItemToList(listId, { itemId, itemType, itemName, itemArtist, itemImageUrl });
      notify(`Adicionado à lista "${listTitle}"`);
      setListModalOpen(false);
    } catch (err) {
      notify(err.response?.data?.error || 'Não foi possível adicionar à lista', 'error');
    }
  };

  const handleQuickCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    setCreatingList(true);
    const expectedType = ['album', 'track', 'artist'].includes(itemType) ? itemType : 'album';
    const typeLabel = expectedType === 'track' ? 'músicas' : expectedType === 'artist' ? 'artistas' : 'álbuns';
    try {
      const res = await createList({
        title: newListTitle.trim(),
        description: '',
        isRanked: true,
        isPublic: true,
        listType: expectedType,
      });
      if (res?.listId) {
        await addItemToList(res.listId, { itemId, itemType, itemName, itemArtist, itemImageUrl });
        notify(`Lista de ${typeLabel} criada com sucesso!`);
        setNewListTitle('');
        setListModalOpen(false);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'Falha ao criar lista', 'error');
    } finally {
      setCreatingList(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 3 }}>
        <Button
          variant={inListenLater ? 'contained' : 'outlined'}
          size="small"
          startIcon={inListenLater ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
          onClick={handleToggleListenLater}
          disabled={busyLater}
        >
          {inListenLater ? 'Em Quero Ouvir' : 'Quero Ouvir'}
        </Button>

        <Button
          variant={isFav ? 'contained' : 'outlined'}
          color={isFav ? 'secondary' : 'primary'}
          size="small"
          startIcon={isFav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          onClick={handleToggleFavorite}
          disabled={busyFav}
        >
          {isFav ? 'Favoritado' : itemType === 'album' ? 'Favoritar (Top 5)' : 'Favoritar'}
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<PlaylistAddIcon fontSize="small" />}
          onClick={handleOpenLists}
        >
          Adicionar à Lista
        </Button>
      </Box>

      <Dialog open={listModalOpen} onClose={() => setListModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Salvar em uma Lista</Typography>
          <IconButton size="small" onClick={() => setListModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingLists ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={26} />
            </Box>
          ) : myLists.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Você ainda não criou nenhuma lista. Crie sua primeira abaixo!
            </Typography>
          ) : (
            <List disablePadding sx={{ mb: 2 }}>
              {myLists.map((list) => (
                <ListItemButton
                  key={list.id}
                  onClick={() => handleAddToExistingList(list.id, list.title)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemText
                    primary={list.title}
                    secondary={`${list.items_count} ${list.items_count === 1 ? 'item' : 'itens'}${list.is_ranked ? ' · Ranqueada' : ''}`}
                    primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
            Criar nova lista rapidamente
          </Typography>
          <Box component="form" onSubmit={handleQuickCreateAndAdd} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ex: Top 10 Álbuns da Vida"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
            />
            <Button type="submit" variant="contained" size="small" disabled={creatingList || !newListTitle.trim()}>
              <AddIcon fontSize="small" />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 96 }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}

