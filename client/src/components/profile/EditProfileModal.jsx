import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageCropperModal from './ImageCropperModal';
import { uploadAvatar, uploadCover } from '../../services/userService';
import { getUserFavorites, addFavorite, removeFavorite } from '../../services/favorites';
import { searchMulti, getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../../services/spotify';
import { useAuth } from '../../context/AuthContext';

export default function EditProfileModal({ open, onClose, userProfile, onProfileUpdate }) {
  const { user, login } = useAuth();
  
  const [tab, setTab] = useState(0); // 0 = Info, 1 = Favoritos
  const [favTab, setFavTab] = useState(0); // 0 = Tracks, 1 = Albums, 2 = Artists
  
  // Imagens e Cropper
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropType, setCropType] = useState(null); // 'avatar' ou 'cover'
  const [cropFile, setCropFile] = useState(null);

  // Favoritos
  const [favorites, setFavorites] = useState([]);
  const [favoriteDetails, setFavoriteDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], artists: [] });
  const [searching, setSearching] = useState(false);
  
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open && userProfile) {
      fetchFavorites();
    }
  }, [open, userProfile]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch();
      } else {
        setSearchResults({ tracks: [], albums: [], artists: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchFavorites = async () => {
    try {
      const data = await getUserFavorites(userProfile.id);
      setFavorites(data);
      enrichFavoritesWithSpotify(data);
    } catch (err) {
      console.error(err);
    }
  };

  const enrichFavoritesWithSpotify = async (favs) => {
    const trackIds = favs.filter(f => f.item_type === 'track').map(f => f.item_id);
    const albumIds = favs.filter(f => f.item_type === 'album').map(f => f.item_id);
    const artistIds = favs.filter(f => f.item_type === 'artist').map(f => f.item_id);

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds),
      getMultipleAlbumDetails(albumIds),
      getMultipleArtistDetails(artistIds)
    ]);
    
    setFavoriteDetails({ ...tracks, ...albums, ...artists });
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const results = await searchMulti(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleFileSelect = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null; // reset input
    setCropFile(file);
    setCropType(type);
    setCropperOpen(true);
  };

  const performAvatarUpload = async (file) => {
    setAvatarUploading(true);
    try {
      const res = await uploadAvatar(file);
      if (res.success) {
        // Atualizar user context e local
        const updatedUser = { ...user, avatar_url: res.url };
        // We only have `login` in context to update token? Actually `user` context might not have set function directly.
        // For now, call onProfileUpdate to refresh parent data
        if (onProfileUpdate) onProfileUpdate();
        setMessage('Avatar atualizado!');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao fazer upload');
    } finally {
      setAvatarUploading(false);
    }
  };

  const performCoverUpload = async (file) => {
    setCoverUploading(true);
    try {
      const res = await uploadCover(file);
      if (res.success) {
        if (onProfileUpdate) onProfileUpdate();
        setMessage('Capa atualizada!');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao fazer upload');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCropDone = async (croppedFile) => {
    setCropperOpen(false);
    if (cropType === 'avatar') {
      await performAvatarUpload(croppedFile);
    } else if (cropType === 'cover') {
      await performCoverUpload(croppedFile);
    }
  };

  const handleAddFavorite = async (itemType, item) => {
    const currentFavs = favorites.filter(f => f.item_type === itemType);
    if (currentFavs.length >= 5) {
      setMessage(`Limite de 5 favoritos para ${itemType} alcançado.`);
      return;
    }
    
    // Optimistic UI
    setFavoriteDetails(prev => ({ ...prev, [item.id]: item }));
    try {
      await addFavorite(itemType, item.id);
      fetchFavorites();
      setMessage('Adicionado aos favoritos!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao favoritar');
    }
  };

  const handleRemoveFavorite = async (itemType, itemId) => {
    try {
      await removeFavorite(itemType, itemId);
      fetchFavorites();
      setMessage('Removido dos favoritos.');
    } catch (err) {
      setMessage('Erro ao remover favorito');
    }
  };

  const renderFavoritesTab = () => {
    const currentType = favTab === 0 ? 'track' : favTab === 1 ? 'album' : 'artist';
    const myFavs = favorites.filter(f => f.item_type === currentType);
    const results = currentType === 'track' ? searchResults.tracks : currentType === 'album' ? searchResults.albums : searchResults.artists;

    return (
      <Box sx={{ mt: 2 }}>
        <Tabs value={favTab} onChange={(e, val) => setFavTab(val)} centered>
          <Tab label="Músicas" />
          <Tab label="Álbuns" />
          <Tab label="Artistas" />
        </Tabs>

        <Box sx={{ mt: 3, display: 'flex', gap: 4 }}>
          {/* Seção Meus Favoritos (Máx 5) */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">Meus Favoritos ({myFavs.length}/5)</Typography>
            <List>
              {myFavs.map(fav => {
                const details = favoriteDetails[fav.item_id];
                if (!details) return null;
                const imgUrl = details.imageUrl || '';
                return (
                  <ListItem key={fav.id}>
                    <ListItemAvatar>
                      <Avatar src={imgUrl} variant={currentType === 'artist' ? 'circular' : 'square'} />
                    </ListItemAvatar>
                    <ListItemText primary={details.name} secondary={details.artist || ''} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemoveFavorite(currentType, fav.item_id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {/* Seção Buscar */}
          <Box sx={{ flex: 1 }}>
            <TextField 
              fullWidth 
              size="small" 
              label={`Buscar ${currentType}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching ? <CircularProgress size={24} sx={{ mt: 2 }} /> : (
              <List sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
                {results.slice(0, 10).map(item => {
                  const imgUrl = item.imageUrl || '';
                  const isFavorited = myFavs.some(f => f.item_id === item.id);
                  return (
                    <ListItem key={item.id}>
                      <ListItemAvatar>
                        <Avatar src={imgUrl} variant={currentType === 'artist' ? 'circular' : 'square'} />
                      </ListItemAvatar>
                      <ListItemText primary={item.name} secondary={item.artist || ''} />
                      <ListItemSecondaryAction>
                        <Button 
                          variant="contained" 
                          size="small" 
                          disabled={isFavorited}
                          onClick={() => handleAddFavorite(currentType, item)}
                        >
                          {isFavorited ? 'Adicionado' : 'Add'}
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Editar Perfil</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(e, val) => setTab(val)}>
          <Tab label="Informações Gerais" />
          <Tab label="Favoritos (Top 5)" />
        </Tabs>
      </Box>

      <DialogContent>
        {tab === 0 && (
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Foto de Capa</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Tamanho recomendado: 1500 x 500 pixels. A imagem será centralizada.
            </Typography>
            <Box sx={{ 
              height: 150, 
              width: '100%', 
              bgcolor: 'grey.800', 
              backgroundImage: `url(${userProfile?.cover_url || ''})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              borderRadius: 1,
              mb: 4
            }}>
              <input accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} id="cover-upload" type="file" onChange={(e) => handleFileSelect(e, 'cover')} />
              <label htmlFor="cover-upload">
                <IconButton color="primary" component="span" sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'background.paper' }}>
                  {coverUploading ? <CircularProgress size={24} /> : <PhotoCamera />}
                </IconButton>
              </label>
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Avatar</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Tamanho recomendado: 400 x 400 pixels (1:1).
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Avatar src={userProfile?.avatar_url} sx={{ width: 80, height: 80, bgcolor: '#1db954' }}>
                {userProfile?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <input accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} id="avatar-upload" type="file" onChange={(e) => handleFileSelect(e, 'avatar')} />
              <label htmlFor="avatar-upload">
                <Button variant="outlined" component="span" startIcon={avatarUploading ? <CircularProgress size={20} /> : <PhotoCamera />}>
                  Alterar Avatar
                </Button>
              </label>
            </Box>

            {/* Campos de texto seriam adicionados aqui no futuro */}
            <Typography variant="body2" color="text.secondary">A alteração de nome de utilizador ou biografia pode ser configurada aqui futuramente.</Typography>
          </Box>
        )}

        {tab === 1 && renderFavoritesTab()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>

      <Snackbar open={!!message} autoHideDuration={3000} onClose={() => setMessage('')}>
        <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>
      </Snackbar>

      <ImageCropperModal 
        open={cropperOpen}
        imageFile={cropFile}
        aspect={cropType === 'avatar' ? 1 : 3}
        onClose={() => setCropperOpen(false)}
        onCropDone={handleCropDone}
      />
    </Dialog>
  );
}
