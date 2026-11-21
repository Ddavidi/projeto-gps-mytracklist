import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Tooltip,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AlbumIcon from '@mui/icons-material/Album';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckIcon from '@mui/icons-material/Check';
import ReviewCard from '../ReviewCard';
import { searchMulti } from '../../services/spotify';
import { addFavorite, removeFavorite, reorderFavorites } from '../../services/favorites';

const MAX_FAVORITES = 5;

const SECTION_META = {
  album: {
    title: 'Álbuns Favoritos',
    singular: 'álbum',
    placeholder: 'Pesquisar álbum no Spotify...',
    emptyHint: 'Escolha até 5 álbuns favoritos e arraste para ordenar.',
    Icon: AlbumIcon,
  },
  artist: {
    title: 'Artistas Favoritos',
    singular: 'artista',
    placeholder: 'Pesquisar artista no Spotify...',
    emptyHint: 'Escolha até 5 artistas favoritos e arraste para ordenar.',
    Icon: PersonIcon,
  },
  track: {
    title: 'Músicas Favoritas',
    singular: 'música',
    placeholder: 'Pesquisar música no Spotify...',
    emptyHint: 'Escolha até 5 músicas favoritas e arraste para ordenar.',
    Icon: MusicNoteIcon,
  },
};

export default function ProfileOverview({
  reviews,
  favorites,
  favoriteDetails,
  itemDetails,
  profileUser,
  isOwner = false,
  onFavoritesChanged,
}) {
  const recentReviews = reviews.slice(0, 5);

  // Estado local otimista para drag & drop suave
  const [localOrder, setLocalOrder] = useState({});
  const [dragState, setDragState] = useState({ type: null, draggedIdx: null, overIdx: null });

  // Modal de busca para adicionar favorito
  const [pickerType, setPickerType] = useState(null); // 'album' | 'artist' | 'track' | null
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const getItemsByType = (type) => {
    const raw = favorites.filter((f) => f.item_type === type).slice(0, MAX_FAVORITES);
    const customOrder = localOrder[type];
    if (customOrder && customOrder.length === raw.length) {
      const map = new Map(raw.map((f) => [f.item_id, f]));
      const ordered = customOrder.map((id) => map.get(id)).filter(Boolean);
      if (ordered.length === raw.length) return ordered;
    }
    return raw;
  };

  const openPicker = (type) => {
    setPickerType(type);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchSpotify = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !pickerType) return;
    setSearching(true);
    try {
      const res = await searchMulti(searchQuery.trim());
      if (pickerType === 'album') {
        setSearchResults((res.albums || []).slice(0, 10));
      } else if (pickerType === 'artist') {
        setSearchResults((res.artists || []).slice(0, 10));
      } else {
        setSearchResults((res.tracks || []).slice(0, 10));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFavorite = async (item) => {
    if (!pickerType) return;
    setBusyId(item.id);
    try {
      await addFavorite(pickerType, item.id);
      setLocalOrder((prev) => ({ ...prev, [pickerType]: undefined }));
      if (onFavoritesChanged) await onFavoritesChanged();
      const updatedCount = getItemsByType(pickerType).length + 1;
      if (updatedCount >= MAX_FAVORITES) {
        setPickerType(null);
      }
    } catch (err) {
      console.error('Erro ao adicionar favorito:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFavorite = async (e, type, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(itemId);
    try {
      await removeFavorite(type, itemId);
      setLocalOrder((prev) => ({ ...prev, [type]: undefined }));
      if (onFavoritesChanged) await onFavoritesChanged();
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    } finally {
      setBusyId(null);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, type, idx) => {
    if (!isOwner) return;
    setDragState({ type, draggedIdx: idx, overIdx: idx });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, type, idx) => {
    e.preventDefault();
    if (!isOwner || dragState.type !== type || dragState.draggedIdx === null) return;
    if (dragState.overIdx !== idx) {
      setDragState((prev) => ({ ...prev, overIdx: idx }));
    }
  };

  const handleDragEnd = async (type) => {
    const { draggedIdx, overIdx, type: dragType } = dragState;
    setDragState({ type: null, draggedIdx: null, overIdx: null });

    if (!isOwner || dragType !== type || draggedIdx === null || overIdx === null || draggedIdx === overIdx) {
      return;
    }

    const current = [...getItemsByType(type)];
    const [moved] = current.splice(draggedIdx, 1);
    current.splice(overIdx, 0, moved);

    const orderedIds = current.map((f) => f.item_id);
    setLocalOrder((prev) => ({ ...prev, [type]: orderedIds }));

    try {
      await reorderFavorites(type, orderedIds);
      if (onFavoritesChanged) await onFavoritesChanged();
    } catch (err) {
      console.error('Erro ao reordenar favoritos:', err);
      setLocalOrder((prev) => ({ ...prev, [type]: undefined }));
    }
  };

  const renderShowcase = (type) => {
    const meta = SECTION_META[type];
    const items = getItemsByType(type);
    const isArtist = type === 'artist';
    const routePrefix = type === 'track' ? 'music' : type;

    if (!isOwner && items.length === 0) return null;

    const slots = isOwner
      ? Array.from({ length: MAX_FAVORITES }, (_, i) => i)
      : items.map((_, i) => i);

    return (
      <Box sx={{ mb: 4.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.75, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {meta.title} ({items.length}/{MAX_FAVORITES})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isOwner ? meta.emptyHint : 'Escolhas essenciais'}
          </Typography>
        </Box>

        <Grid container spacing={1.75}>
          {slots.map((slotIdx) => {
            const fav = items[slotIdx];
            const details = fav ? favoriteDetails[fav.item_id] : null;
            const isDragging = dragState.type === type && dragState.draggedIdx === slotIdx;
            const isOver = dragState.type === type && dragState.overIdx === slotIdx;

            if (fav && details) {
              return (
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={fav.id || fav.item_id}>
                  <Box
                    draggable={isOwner}
                    onDragStart={(e) => handleDragStart(e, type, slotIdx)}
                    onDragOver={(e) => handleDragOver(e, type, slotIdx)}
                    onDragEnd={() => handleDragEnd(type)}
                    sx={{
                      position: 'relative',
                      opacity: isDragging ? 0.45 : 1,
                      transform: isOver && !isDragging ? 'scale(1.03)' : 'none',
                      transition: 'transform 0.15s ease, opacity 0.15s ease',
                      cursor: isOwner ? 'grab' : 'pointer',
                      '&:hover .fav-owner-controls': { opacity: 1 },
                    }}
                  >
                    <Box
                      component={Link}
                      to={`/${routePrefix}/${fav.item_id}`}
                      className="mtl-album-card"
                      sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: isArtist ? '50%' : 2.5,
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: isOver ? 'primary.main' : 'divider',
                          bgcolor: 'action.hover',
                          mb: 1,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {details.imageUrl ? (
                          <Box
                            component="img"
                            src={details.imageUrl}
                            alt={details.name}
                            className="mtl-cover-img"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <meta.Icon color="disabled" sx={{ fontSize: 36 }} />
                        )}

                        <Box
                          className="mtl-mono"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            px: 0.75,
                            py: 0.15,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0,0,0,0.78)',
                            color: 'secondary.main',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          #{slotIdx + 1}
                        </Box>

                        {isOwner && (
                          <Box
                            className="fav-owner-controls"
                            sx={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              display: 'flex',
                              gap: 0.4,
                              opacity: { xs: 1, sm: 0 },
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            <Tooltip title="Arraste para reordenar">
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: 'rgba(0,0,0,0.75)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <DragIndicatorIcon sx={{ fontSize: 15 }} />
                              </Box>
                            </Tooltip>
                            <Tooltip title="Remover dos favoritos">
                              <IconButton
                                size="small"
                                disabled={busyId === fav.item_id}
                                onClick={(e) => handleRemoveFavorite(e, type, fav.item_id)}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  bgcolor: 'rgba(0,0,0,0.75)',
                                  color: '#fff',
                                  '&:hover': { bgcolor: 'error.main' },
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>

                      <Typography variant="body2" fontWeight={700} noWrap align={isArtist ? 'center' : 'left'}>
                        {details.name}
                      </Typography>
                      {details.artist && !isArtist && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {details.artist}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            }

            if (!isOwner) return null;

            return (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={`empty-${type}-${slotIdx}`}>
                <Box
                  onClick={() => openPicker(type)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openPicker(type);
                    }
                  }}
                  sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: isArtist ? '50%' : 2.5,
                    border: '1.5px dashed',
                    borderColor: 'divider',
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    },
                  }}
                >
                  <AddIcon />
                  <Typography variant="caption" fontWeight={700}>
                    Escolher #{slotIdx + 1}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const activePickerMeta = pickerType ? SECTION_META[pickerType] : null;
  const activePickerIds = pickerType ? new Set(getItemsByType(pickerType).map((f) => f.item_id)) : new Set();

  return (
    <Box>
      {/* Vitrines de Favoritos (Álbuns, Artistas e Músicas — até 5 cada com drag & drop) */}
      {renderShowcase('album')}
      {renderShowcase('artist')}
      {renderShowcase('track')}

      {!isOwner && favorites.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Nenhum favorito selecionado ainda.
        </Typography>
      )}

      {/* Últimas Avaliações */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mb: 2 }}>
          Últimas Avaliações
        </Typography>
        {recentReviews.length > 0 ? (
          <Grid container spacing={2.5}>
            {recentReviews.map((review) => {
              const details = itemDetails[review.item_id];
              const enrichedReview = {
                ...review,
                item_name: review.item_name || details?.name,
                item_image_url: review.item_image_url || details?.imageUrl,
                user_username: review.user_username || profileUser?.username,
                user_avatar: review.user_avatar || profileUser?.avatar_url,
              };
              return (
                <Grid size={{ xs: 12, md: 6 }} key={review.id}>
                  <ReviewCard review={enrichedReview} />
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nenhuma avaliação recente.
          </Typography>
        )}
      </Box>

      {/* Modal Popup de Busca de Favoritos */}
      <Dialog
        open={Boolean(pickerType)}
        onClose={() => setPickerType(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3.5 } }}
      >
        {activePickerMeta && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
              <span>Adicionar {activePickerMeta.singular} aos Favoritos</span>
              <IconButton size="small" onClick={() => setPickerType(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
              <Box component="form" onSubmit={handleSearchSpotify} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  autoFocus
                  size="small"
                  placeholder={activePickerMeta.placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" color="primary" disabled={searching} size="small">
                          {searching ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {searching ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : searchResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  {searchQuery.trim()
                    ? 'Pressione Enter ou clique na lupa para pesquisar.'
                    : `Digite o nome de um ${activePickerMeta.singular} para adicionar à sua vitrine (até ${MAX_FAVORITES}).`}
                </Typography>
              ) : (
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {searchResults.map((item) => {
                    const alreadyAdded = activePickerIds.has(item.id);
                    return (
                      <ListItem
                        key={item.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.5,
                          py: 1,
                          borderRadius: 2.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                        }}
                      >
                        <Avatar
                          variant={pickerType === 'artist' ? 'circular' : 'rounded'}
                          src={item.imageUrl}
                          alt={item.name}
                          sx={{ width: 46, height: 46, flexShrink: 0 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.artist || (Array.isArray(item.genres) ? item.genres.slice(0, 2).join(', ') : item.genres || '')}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant={alreadyAdded ? 'outlined' : 'contained'}
                          disabled={alreadyAdded || busyId === item.id}
                          startIcon={alreadyAdded ? <CheckIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                          onClick={() => handleAddFavorite(item)}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {alreadyAdded ? 'Adicionado' : 'Adicionar'}
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
