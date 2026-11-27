import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  InputAdornment,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Link } from 'react-router-dom';
import ImageCropperModal from './ImageCropperModal';
import { uploadAvatar, uploadCover } from '../../services/userService';
import { getUserFavorites, addFavorite, removeFavorite } from '../../services/favorites';
import {
  searchMulti,
  getMultipleTrackDetails,
  getMultipleAlbumDetails,
  getMultipleArtistDetails,
} from '../../services/spotify';

const FAV_CATEGORIES = [
  { key: 'track', label: 'Músicas', placeholder: 'Pesquisar músicas no Spotify...', icon: MusicNoteIcon },
  { key: 'album', label: 'Álbuns', placeholder: 'Pesquisar álbuns no Spotify...', icon: AlbumIcon },
  { key: 'artist', label: 'Artistas', placeholder: 'Pesquisar artistas no Spotify...', icon: PersonOutlineIcon },
];

export default function EditProfileModal({ open, onClose, userProfile, onProfileUpdate }) {
  const [section, setSection] = useState('visual'); // 'visual' | 'favorites'
  const [favCategory, setFavCategory] = useState('album'); // 'track' | 'album' | 'artist'

  // Upload e Cropper
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropType, setCropType] = useState(null);
  const [cropFile, setCropFile] = useState(null);

  // Favoritos
  const [favorites, setFavorites] = useState([]);
  const [favoriteDetails, setFavoriteDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], artists: [] });
  const [searching, setSearching] = useState(false);

  const [snack, setSnack] = useState({ open: false, text: '', severity: 'success' });
  const notify = (text, severity = 'success') => setSnack({ open: true, text, severity });

  useEffect(() => {
    if (open && userProfile?.id) {
      fetchFavorites();
    }
  }, [open, userProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults({ tracks: [], albums: [], artists: [] });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFavorites = async () => {
    try {
      const data = await getUserFavorites(userProfile.id);
      setFavorites(data || []);
      enrichFavoritesWithSpotify(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const enrichFavoritesWithSpotify = async (favs) => {
    const trackIds = favs.filter((f) => f.item_type === 'track').map((f) => f.item_id);
    const albumIds = favs.filter((f) => f.item_type === 'album').map((f) => f.item_id);
    const artistIds = favs.filter((f) => f.item_type === 'artist').map((f) => f.item_id);

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds).catch(() => ({})),
      getMultipleAlbumDetails(albumIds).catch(() => ({})),
      getMultipleArtistDetails(artistIds).catch(() => ({})),
    ]);

    setFavoriteDetails({ ...tracks, ...albums, ...artists });
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const results = await searchMulti(searchQuery.trim());
      setSearchResults(results || { tracks: [], albums: [], artists: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleFileSelect = (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = null;
    setCropFile(file);
    setCropType(type);
    setCropperOpen(true);
  };

  const handleCropDone = async (croppedFile) => {
    setCropperOpen(false);
    if (cropType === 'avatar') {
      setAvatarUploading(true);
      try {
        const res = await uploadAvatar(croppedFile);
        if (res.success) {
          if (onProfileUpdate) onProfileUpdate();
          notify('Foto de perfil atualizada!');
        }
      } catch (err) {
        notify(err.response?.data?.error || 'Erro ao enviar foto de perfil.', 'error');
      } finally {
        setAvatarUploading(false);
      }
    } else if (cropType === 'cover') {
      setCoverUploading(true);
      try {
        const res = await uploadCover(croppedFile);
        if (res.success) {
          if (onProfileUpdate) onProfileUpdate();
          notify('Foto de capa atualizada!');
        }
      } catch (err) {
        notify(err.response?.data?.error || 'Erro ao enviar foto de capa.', 'error');
      } finally {
        setCoverUploading(false);
      }
    }
  };

  const handleAddFavorite = async (itemType, item) => {
    const currentFavs = favorites.filter((f) => f.item_type === itemType);
    if (currentFavs.length >= 5) {
      notify('Você já atingiu o limite de 5 favoritos nesta categoria.', 'warning');
      return;
    }
    setFavoriteDetails((prev) => ({ ...prev, [item.id]: item }));
    try {
      await addFavorite(itemType, item.id);
      await fetchFavorites();
      if (onProfileUpdate) onProfileUpdate();
      notify(`"${item.name}" adicionado aos favoritos!`);
    } catch (err) {
      notify(err.response?.data?.error || 'Erro ao favoritar.', 'error');
    }
  };

  const handleRemoveFavorite = async (itemType, itemId) => {
    try {
      await removeFavorite(itemType, itemId);
      await fetchFavorites();
      if (onProfileUpdate) onProfileUpdate();
      notify('Removido dos favoritos.');
    } catch {
      notify('Erro ao remover favorito.', 'error');
    }
  };

  const activeCategoryMeta = FAV_CATEGORIES.find((c) => c.key === favCategory) || FAV_CATEGORIES[0];
  const myFavs = favorites.filter((f) => f.item_type === favCategory);
  const results =
    favCategory === 'track'
      ? searchResults.tracks || []
      : favCategory === 'album'
      ? searchResults.albums || []
      : searchResults.artists || [];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none',
          },
        }}
      >
        {/* Cabeçalho Editorial */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            pt: 2.75,
            pb: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Editar Perfil
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Personalize sua foto, capa e os destaques musicais exibidos no seu perfil.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Fechar"
            sx={{
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { color: 'text.primary', borderColor: 'text.secondary' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Navegação em Pílulas */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 0.5,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
              border: '1px solid',
              borderColor: 'divider',
              gap: 0.5,
            }}
          >
            {[
              { id: 'visual', label: 'Foto & Capa' },
              { id: 'favorites', label: 'Favoritos do Perfil' },
            ].map((item) => {
              const active = section === item.id;
              return (
                <Button
                  key={item.id}
                  size="small"
                  onClick={() => setSection(item.id)}
                  sx={{
                    px: 2,
                    py: 0.7,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? 'primary.main' : 'transparent',
                    color: active ? 'primary.contrastText' : 'text.secondary',
                    '&:hover': {
                      bgcolor: active ? 'primary.main' : (theme) => alpha(theme.palette.text.primary, 0.06),
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Conteúdo */}
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, minHeight: 380 }}>
          {section === 'visual' ? (
            <Box>
              {/* Preview Interativo de Capa + Avatar */}
              <Box
                sx={{
                  borderRadius: 3.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                }}
              >
                {/* Capa clicável */}
                <Box
                  sx={{
                    height: { xs: 150, sm: 195 },
                    position: 'relative',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                    backgroundImage: userProfile?.cover_url
                      ? `url(${userProfile.cover_url})`
                      : (theme) =>
                          `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.secondary.main, 0.18)} 100%)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.48) 100%)',
                    }}
                  />
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    id="cover-upload-input"
                    type="file"
                    onChange={(e) => handleFileSelect(e, 'cover')}
                  />
                  <label htmlFor="cover-upload-input">
                    <Button
                      component="span"
                      size="small"
                      variant="contained"
                      disabled={coverUploading}
                      startIcon={coverUploading ? <CircularProgress size={15} color="inherit" /> : <PhotoCameraOutlinedIcon fontSize="small" />}
                      sx={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: 'rgba(15, 17, 21, 0.78)',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        '&:hover': { bgcolor: 'rgba(15, 17, 21, 0.94)' },
                      }}
                    >
                      {coverUploading ? 'Enviando...' : 'Alterar Capa'}
                    </Button>
                  </label>
                </Box>

                {/* Avatar sobreposto + Info */}
                <Box
                  sx={{
                    px: { xs: 2.5, sm: 3.5 },
                    pb: 3,
                    mt: -6.5,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'flex-end' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        src={userProfile?.avatar_url}
                        sx={{
                          width: 104,
                          height: 104,
                          border: '4px solid',
                          borderColor: 'background.paper',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          fontSize: '2.4rem',
                          fontWeight: 800,
                        }}
                      >
                        {userProfile?.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        id="avatar-upload-input"
                        type="file"
                        onChange={(e) => handleFileSelect(e, 'avatar')}
                      />
                      <label htmlFor="avatar-upload-input">
                        <IconButton
                          component="span"
                          size="small"
                          disabled={avatarUploading}
                          sx={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            border: '2px solid',
                            borderColor: 'background.paper',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                          title="Alterar foto de perfil"
                        >
                          {avatarUploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraOutlinedIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </label>
                    </Box>

                    <Box sx={{ pb: 0.5 }}>
                      <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                        {userProfile?.name || userProfile?.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{userProfile?.username}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    component={Link}
                    to="/settings"
                    onClick={onClose}
                    size="small"
                    variant="outlined"
                    startIcon={<SettingsOutlinedIcon fontSize="small" />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Editar bio, gêneros e privacidade
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  • Foto de perfil recomendada: 400 × 400 px (quadrada)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Capa recomendada: 1500 × 500 px (panorâmica)
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              {/* Seletor de Categoria dos Favoritos */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {FAV_CATEGORIES.map(({ key, label, icon: CatIcon }) => {
                    const active = favCategory === key;
                    const count = favorites.filter((f) => f.item_type === key).length;
                    return (
                      <Button
                        key={key}
                        size="small"
                        variant={active ? 'contained' : 'outlined'}
                        startIcon={<CatIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setFavCategory(key)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          borderColor: active ? 'primary.main' : 'divider',
                        }}
                      >
                        {label} ({count}/5)
                      </Button>
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Os favoritos aparecem em destaque na Visão Geral do seu perfil.
                </Typography>
              </Box>

              {/* Grid 2 colunas: Slots Selecionados + Busca */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2.5,
                  alignItems: 'start',
                }}
              >
                {/* Coluna Esquerda: Meus Favoritos */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.025),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Selecionados ({myFavs.length}/5)
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {myFavs.length === 0 ? (
                      <Box
                        sx={{
                          py: 4,
                          px: 2,
                          textAlign: 'center',
                          borderRadius: 2,
                          border: '1px dashed',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Nenhum item selecionado em {activeCategoryMeta.label.toLowerCase()}.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Use a busca ao lado para montar seu Top 5.
                        </Typography>
                      </Box>
                    ) : (
                      myFavs.map((fav, idx) => {
                        const details = favoriteDetails[fav.item_id];
                        if (!details) return null;
                        return (
                          <Box
                            key={fav.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              p: 1,
                              borderRadius: 2,
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography
                              variant="caption"
                              className="mtl-mono"
                              fontWeight={800}
                              color="primary"
                              sx={{ width: 22, textAlign: 'center' }}
                            >
                              #{idx + 1}
                            </Typography>
                            <Avatar
                              src={details.imageUrl || ''}
                              variant={favCategory === 'artist' ? 'circular' : 'rounded'}
                              sx={{ width: 40, height: 40 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>
                                {details.name}
                              </Typography>
                              {details.artist && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  {details.artist}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFavorite(favCategory, fav.item_id)}
                              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                              title="Remover"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>

                {/* Coluna Direita: Busca */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.025),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                    Adicionar {activeCategoryMeta.label}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={activeCategoryMeta.placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searching ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : null,
                    }}
                  />

                  <Box sx={{ mt: 1.5, maxHeight: 270, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {searchQuery.trim().length < 2 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center', display: 'block' }}>
                        Digite pelo menos 2 caracteres para pesquisar.
                      </Typography>
                    ) : !searching && results.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center', display: 'block' }}>
                        Nenhum resultado encontrado para "{searchQuery}".
                      </Typography>
                    ) : (
                      results.slice(0, 8).map((item) => {
                        const isFavorited = myFavs.some((f) => f.item_id === item.id);
                        return (
                          <Box
                            key={item.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              p: 0.85,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Avatar
                              src={item.imageUrl || ''}
                              variant={favCategory === 'artist' ? 'circular' : 'rounded'}
                              sx={{ width: 38, height: 38 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>
                                {item.name}
                              </Typography>
                              {item.artist && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  {item.artist}
                                </Typography>
                              )}
                            </Box>
                            <Button
                              size="small"
                              variant={isFavorited ? 'outlined' : 'contained'}
                              disabled={isFavorited || myFavs.length >= 5}
                              onClick={() => handleAddFavorite(favCategory, item)}
                              startIcon={isFavorited ? <CheckIcon sx={{ fontSize: 14 }} /> : <AddIcon sx={{ fontSize: 14 }} />}
                              sx={{ borderRadius: 2, textTransform: 'none', minWidth: 0, px: 1.25, fontWeight: 700, fontSize: '0.74rem' }}
                            >
                              {isFavorited ? 'Salvo' : 'Adicionar'}
                            </Button>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Rodapé */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 1.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none' }}>
            Concluir
          </Button>
        </Box>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 96 }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ borderRadius: 2 }}>
          {snack.text}
        </Alert>
      </Snackbar>

      <ImageCropperModal
        open={cropperOpen}
        imageFile={cropFile}
        aspect={cropType === 'avatar' ? 1 : 3}
        onClose={() => setCropperOpen(false)}
        onCropDone={handleCropDone}
      />
    </>
  );
}
