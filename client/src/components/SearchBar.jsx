import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Paper, 
  InputBase, 
  IconButton, 
  Box, 
  Grid, 
  Typography, 
  Avatar, 
  CircularProgress, 
  ClickAwayListener,
  Divider,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import { searchMulti } from '../services/spotify';

function SearchBar({ onSearch, placeholder = "Pesquise por músicas, álbuns ou artistas..." }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tracks: [], albums: [], artists: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  // Debounced live search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setResults({ tracks: [], albums: [], artists: [] });
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchMulti(query.trim());
        setResults(res || { tracks: [], albums: [], artists: [] });
      } catch (err) {
        console.error('Erro na busca ao vivo:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setOpen(false);
    if (onSearch) {
      onSearch(query.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectTrack = (id) => {
    setOpen(false);
    navigate(`/music/${id}`);
  };

  const handleSelectAlbum = (id) => {
    setOpen(false);
    navigate(`/album/${id}`);
  };

  const handleSelectArtist = (id) => {
    setOpen(false);
    navigate(`/artist/${id}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ tracks: [], albums: [], artists: [] });
    setOpen(false);
  };

  const hasResults = 
    (results.tracks && results.tracks.length > 0) ||
    (results.albums && results.albums.length > 0) ||
    (results.artists && results.artists.length > 0);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 850 }}>
        {/* Input Bar */}
        <Paper
          component="form"
          onSubmit={handleSubmit}
          elevation={3}
          sx={{
            p: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 3,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: open ? 'primary.main' : 'divider',
            transition: 'all 0.2s ease-in-out',
            boxShadow: open ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
          <InputBase
            sx={{ ml: 1, flex: 1, fontSize: '1rem' }}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2 && hasResults) setOpen(true);
            }}
          />
          {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
          {query && (
            <IconButton size="small" onClick={handleClear} sx={{ p: '4px', mr: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton type="submit" color="primary" sx={{ p: '8px' }}>
            <SearchIcon />
          </IconButton>
        </Paper>

        {/* AniList-Style 3-Column Overlay Dropdown */}
        {open && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 1300,
              maxHeight: '480px',
              overflowY: 'auto',
              borderRadius: 3,
              p: 2,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            }}
          >
            {loading && !hasResults ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !hasResults ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                Nenhum resultado encontrado para "{query}".
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {/* Column 1: Músicas */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
                    <MusicNoteIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                      MÚSICAS
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <List disablePadding>
                    {results.tracks?.slice(0, 5).map((track) => (
                      <ListItemButton
                        key={track.id}
                        onClick={() => handleSelectTrack(track.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          p: 0.8,
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 46 }}>
                          <Avatar
                            variant="square"
                            src={track.imageUrl}
                            alt={track.name}
                            sx={{ width: 38, height: 38, borderRadius: 1.5 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={track.name}
                          secondary={track.artist}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                    {(!results.tracks || results.tracks.length === 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Nenhuma música
                      </Typography>
                    )}
                  </List>
                </Grid>

                {/* Column 2: Álbuns */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
                    <AlbumIcon color="secondary" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                      ÁLBUNS
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <List disablePadding>
                    {results.albums?.slice(0, 5).map((album) => (
                      <ListItemButton
                        key={album.id}
                        onClick={() => handleSelectAlbum(album.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          p: 0.8,
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 46 }}>
                          <Avatar
                            variant="square"
                            src={album.imageUrl}
                            alt={album.name}
                            sx={{ width: 38, height: 38, borderRadius: 1.5 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={album.name}
                          secondary={`${album.artist} ${album.releaseDate ? `• ${album.releaseDate}` : ''}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                    {(!results.albums || results.albums.length === 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Nenhum álbum
                      </Typography>
                    )}
                  </List>
                </Grid>

                {/* Column 3: Artistas */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
                    <PersonIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                      ARTISTAS
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <List disablePadding>
                    {results.artists?.slice(0, 5).map((artist) => (
                      <ListItemButton
                        key={artist.id}
                        onClick={() => handleSelectArtist(artist.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          p: 0.8,
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 46 }}>
                          <Avatar
                            src={artist.imageUrl}
                            alt={artist.name}
                            sx={{ width: 38, height: 38 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={artist.name}
                          secondary={artist.genres || 'Artista'}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                    {(!results.artists || results.artists.length === 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Nenhum artista
                      </Typography>
                    )}
                  </List>
                </Grid>
              </Grid>
            )}

            {/* Bottom bar with view all link */}
            {hasResults && (
              <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography 
                  variant="caption" 
                  color="primary" 
                  sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  onClick={handleSubmit}
                >
                  Ver todos os resultados para "{query}" →
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}

export default SearchBar;
