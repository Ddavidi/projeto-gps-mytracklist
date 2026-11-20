import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Paper,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import StarIcon from '@mui/icons-material/Star';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AlbumIcon from '@mui/icons-material/Album';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import { Link } from 'react-router-dom';
import {
  getUserListenLater,
  removeListenLater,
  reorderListenLater,
  updateListenLaterVisibility,
} from '../../services/listenLater';

const SECTIONS = [
  { key: 'album', label: 'Álbuns', icon: AlbumIcon, pathPrefix: '/album/' },
  { key: 'track', label: 'Músicas', icon: MusicNoteIcon, pathPrefix: '/track/' },
  { key: 'artist', label: 'Artistas', icon: PersonIcon, pathPrefix: '/artist/' },
];

export default function ListenLaterModal({ open, onClose, userId, isOwner = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrivateForVisitor, setIsPrivateForVisitor] = useState(false);
  const [visibility, setVisibility] = useState('public'); // 'public' | 'close_friends' | 'private'
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Todas as categorias começam contraídas por padrão
  const [expanded, setExpanded] = useState({ album: false, track: false, artist: false });

  // Estado de Drag & Drop por categoria
  const [dragState, setDragState] = useState({ section: null, draggedIdx: null, overIdx: null });

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserListenLater(userId);
      setItems(data.items || []);
      setIsPrivateForVisitor(Boolean(data.isPrivate));
      setVisibility(data.visibility || 'public');
    } catch {
      // fallback seguro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setExpanded({ album: false, track: false, artist: false });
      loadItems();
    }
  }, [open, userId]);

  const handleVisibilityChange = async (e, nextVal) => {
    if (!nextVal || nextVal === visibility) return;
    const prev = visibility;
    setVisibility(nextVal);
    setSavingVisibility(true);
    try {
      await updateListenLaterVisibility(nextVal);
    } catch {
      setVisibility(prev);
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleRemove = async (itemType, itemId) => {
    try {
      await removeListenLater(itemType, itemId);
      setItems((prev) => prev.filter((i) => !(i.item_type === itemType && i.item_id === itemId)));
    } catch (err) {
      console.error('Erro ao remover de Quero Ouvir:', err);
    }
  };

  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Drag & Drop dentro de cada categoria
  const handleDragStart = (e, sectionKey, idx) => {
    if (!isOwner) return;
    setDragState({ section: sectionKey, draggedIdx: idx, overIdx: idx });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, sectionKey, idx) => {
    e.preventDefault();
    if (!isOwner || dragState.section !== sectionKey || dragState.draggedIdx === null) return;
    if (dragState.overIdx !== idx) {
      setDragState((prev) => ({ ...prev, overIdx: idx }));
    }
  };

  const handleDragEnd = async (sectionKey) => {
    const { draggedIdx, overIdx, section } = dragState;
    setDragState({ section: null, draggedIdx: null, overIdx: null });

    if (!isOwner || section !== sectionKey || draggedIdx === null || overIdx === null || draggedIdx === overIdx) {
      return;
    }

    const sectionItems = items.filter((i) => i.item_type === sectionKey);
    const otherItems = items.filter((i) => i.item_type !== sectionKey);
    const [moved] = sectionItems.splice(draggedIdx, 1);
    sectionItems.splice(overIdx, 0, moved);

    const combined = [...sectionItems, ...otherItems];
    setItems(combined);

    try {
      const payload = combined.map((it, idx) => ({ id: it.id, position: idx + 1 }));
      await reorderListenLater(payload);
    } catch (err) {
      console.error('Falha ao persistir reordenação:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3.5, p: 0.5 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Quero Ouvir ({items.length})
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {/* Controle de Visibilidade (Pública | Close Friends | Privada) */}
        {isOwner && (
          <Box
            sx={{
              p: 1.75,
              mb: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
              Quem pode ver sua lista Quero Ouvir?
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              fullWidth
              value={visibility}
              onChange={handleVisibilityChange}
              disabled={savingVisibility}
            >
              <ToggleButton value="public" sx={{ textTransform: 'none', gap: 0.6 }}>
                <PublicOutlinedIcon sx={{ fontSize: 16 }} /> Pública
              </ToggleButton>
              <ToggleButton
                value="close_friends"
                sx={{
                  textTransform: 'none',
                  gap: 0.6,
                  '&.Mui-selected': {
                    bgcolor: alpha('#16a34a', 0.2),
                    color: '#22c55e',
                    borderColor: alpha('#22c55e', 0.5),
                  },
                }}
              >
                <StarIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Close Friends
              </ToggleButton>
              <ToggleButton
                value="private"
                sx={{
                  textTransform: 'none',
                  gap: 0.6,
                  '&.Mui-selected': {
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                    color: 'warning.main',
                  },
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 16 }} /> Privada
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={30} />
          </Box>
        ) : isPrivateForVisitor && !isOwner ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <LockOutlinedIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {visibility === 'close_friends' ? 'Exclusivo para Close Friends' : 'Esta lista é privada'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {visibility === 'close_friends'
                ? 'Apenas amigos na lista Close Friends deste perfil podem visualizar esta fila.'
                : 'O usuário optou por manter sua fila de audição privada.'}
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              Nenhum item na fila
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isOwner
                ? 'Navegue por álbuns, músicas ou artistas e clique em "Quero Ouvir" para salvar aqui.'
                : 'Este usuário ainda não adicionou itens à sua fila de audição.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {SECTIONS.map(({ key, label, icon: SectionIcon, pathPrefix }) => {
              const sectionItems = items.filter((i) => i.item_type === key);
              const isOpen = expanded[key];

              return (
                <Paper
                  key={key}
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: isOpen ? 'primary.main' : 'divider',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Cabeçalho expansível da categoria */}
                  <Box
                    onClick={() => toggleSection(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSection(key);
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      bgcolor: (theme) => alpha(theme.palette.text.primary, isOpen ? 0.05 : 0.02),
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <SectionIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {label}
                      </Typography>
                      <Chip
                        size="small"
                        label={sectionItems.length}
                        sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </Box>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                      {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Lista contraída / expandida */}
                  <Collapse in={isOpen}>
                    <Box sx={{ p: 1.5, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {sectionItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, px: 1 }}>
                          Nenhum item salvo em {label.toLowerCase()}.
                        </Typography>
                      ) : (
                        <>
                          {isOwner && sectionItems.length > 1 && (
                            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontStyle: 'italic' }}>
                              Arraste os cards para alterar a ordem de prioridade.
                            </Typography>
                          )}
                          {sectionItems.map((item, idx) => {
                            const isDragging = dragState.section === key && dragState.draggedIdx === idx;
                            const isOver = dragState.section === key && dragState.overIdx === idx;

                            return (
                              <Paper
                                key={`${item.item_type}-${item.item_id}`}
                                elevation={0}
                                draggable={isOwner}
                                onDragStart={(e) => handleDragStart(e, key, idx)}
                                onDragOver={(e) => handleDragOver(e, key, idx)}
                                onDragEnd={() => handleDragEnd(key)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.25,
                                  p: 1,
                                  borderRadius: 2,
                                  bgcolor: isOver
                                    ? (theme) => alpha(theme.palette.primary.main, 0.14)
                                    : (theme) => alpha(theme.palette.text.primary, 0.025),
                                  border: '1px solid',
                                  borderColor: isOver ? 'primary.main' : 'divider',
                                  cursor: isOwner ? 'grab' : 'default',
                                  opacity: isDragging ? 0.45 : 1,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isOwner && (
                                  <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                    <DragIndicatorIcon fontSize="small" />
                                  </Box>
                                )}

                                <Typography
                                  variant="caption"
                                  fontWeight={800}
                                  className="mtl-mono"
                                  sx={{
                                    minWidth: 24,
                                    textAlign: 'center',
                                    color: 'primary.main',
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                    px: 0.5,
                                    py: 0.2,
                                    borderRadius: 1,
                                  }}
                                >
                                  #{idx + 1}
                                </Typography>

                                <Box
                                  component="img"
                                  src={item.item_image_url || '/placeholder.png'}
                                  alt={item.item_name}
                                  sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: key === 'artist' ? '50%' : 1.5,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />

                                <Box
                                  component={Link}
                                  to={`${pathPrefix}${item.item_id}`}
                                  onClick={onClose}
                                  sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                                >
                                  <Typography variant="body2" fontWeight={700} noWrap sx={{ '&:hover': { color: 'primary.main' } }}>
                                    {item.item_name}
                                  </Typography>
                                  {item.item_artist && (
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                      {item.item_artist}
                                    </Typography>
                                  )}
                                </Box>

                                {isOwner && (
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemove(item.item_type, item.item_id)}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                    title="Remover"
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Paper>
                            );
                          })}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
