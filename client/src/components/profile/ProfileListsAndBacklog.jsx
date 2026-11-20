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
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  Chip,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import AlbumIcon from '@mui/icons-material/Album';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { getUserLists, createList, deleteList } from '../../services/lists';

export default function ProfileListsAndBacklog({ userId, isOwner = false }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listType, setListType] = useState('album'); // 'album' | 'track'
  const [isRanked, setIsRanked] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const userLists = await getUserLists(userId);
      setLists(userLists || []);
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
      await createList({
        title: title.trim(),
        description: description.trim(),
        isRanked,
        isPublic,
        listType,
      });
      setTitle('');
      setDescription('');
      setListType('album');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Tier Lists & Coleções
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Rankings de álbuns ou músicas com posições e avaliações personalizadas.
          </Typography>
        </Box>
        {isOwner && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nova Tier List
          </Button>
        )}
      </Box>

      {lists.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
          <Typography variant="body1" fontWeight={600} gutterBottom>
            Nenhuma Tier List criada ainda
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isOwner
              ? 'Crie sua primeira lista para organizar seu Top 10 de Álbuns ou Melhores Músicas da Vida!'
              : 'Este usuário ainda não publicou listas.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {lists.map((list) => {
            const isTrackList = list.list_type === 'track';
            const isArtistList = list.list_type === 'artist';

            return (
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
                        height: 86,
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
                          {!list.preview_covers?.[slot] && (
                            isTrackList ? (
                              <MusicNoteIcon sx={{ fontSize: 18, opacity: 0.25 }} />
                            ) : isArtistList ? (
                              <PersonIcon sx={{ fontSize: 18, opacity: 0.25 }} />
                            ) : (
                              <AlbumIcon sx={{ fontSize: 18, opacity: 0.25 }} />
                            )
                          )}
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={
                          isTrackList ? (
                            <MusicNoteIcon sx={{ fontSize: 13 }} />
                          ) : isArtistList ? (
                            <PersonIcon sx={{ fontSize: 13 }} />
                          ) : (
                            <AlbumIcon sx={{ fontSize: 13 }} />
                          )
                        }
                        label={isTrackList ? 'Músicas' : isArtistList ? 'Artistas' : 'Álbuns'}
                        color="primary"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                      />
                      {list.is_ranked && (
                        <Chip size="small" label="Ranqueada" sx={{ height: 22, fontSize: '0.68rem' }} />
                      )}
                      {!list.is_public && (
                        <Chip size="small" label="Privada" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.68rem' }} />
                      )}
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

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {list.items_count} {list.items_count === 1 ? 'item' : 'itens'}
                      </Typography>
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
            );
          })}
        </Grid>
      )}

      {/* Modal Criar Tier List / Lista com seleção obrigatória de tipo */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3.5 } }}>
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>Nova Tier List / Lista</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
            <TextField
              label="Título da Lista"
              placeholder="Ex: Top 10 Álbuns da Minha Vida"
              required
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Escolha do Tipo de Lista: Álbuns OU Músicas (sem misturar) */}
            <FormControl component="fieldset" sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03), border: '1px solid', borderColor: 'divider' }}>
              <FormLabel component="legend" sx={{ fontSize: '0.78rem', fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                Formato dos itens da lista (não misturados):
              </FormLabel>
              <RadioGroup
                row
                value={listType}
                onChange={(e) => setListType(e.target.value)}
              >
                <FormControlLabel
                  value="album"
                  control={<Radio size="small" color="primary" />}
                  label={<Typography variant="body2" fontWeight={600}>💿 Álbuns</Typography>}
                />
                <FormControlLabel
                  value="track"
                  control={<Radio size="small" color="primary" />}
                  label={<Typography variant="body2" fontWeight={600}>🎵 Músicas</Typography>}
                />
                <FormControlLabel
                  value="artist"
                  control={<Radio size="small" color="primary" />}
                  label={<Typography variant="body2" fontWeight={600}>🎤 Artistas</Typography>}
                />
              </RadioGroup>
            </FormControl>

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
              label="Lista ranqueada com posições (1º, 2º, 3º...)"
            />
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} color="primary" />}
              label="Pública para a comunidade"
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
