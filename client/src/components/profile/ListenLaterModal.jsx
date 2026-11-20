import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Paper,
  alpha,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Link } from 'react-router-dom';
import {
  getUserListenLater,
  removeListenLater,
  reorderListenLater,
  updateListenLaterVisibility,
} from '../../services/listenLater';

export default function ListenLaterModal({ open, onClose, userId, isOwner = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPublicSetting, setIsPublicSetting] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const dragNode = useRef();

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserListenLater(userId);
      setItems(data.items || []);
      setIsPrivate(Boolean(data.isPrivate));
      setIsPublicSetting(!Boolean(data.isPrivate));
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, userId]);

  const handleToggleVisibility = async (e) => {
    const nextVal = e.target.checked;
    setIsPublicSetting(nextVal);
    setSavingVisibility(true);
    try {
      await updateListenLaterVisibility(nextVal);
    } catch {
      setIsPublicSetting(!nextVal);
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

  // Drag and Drop nativo
  const handleDragStart = (e, index) => {
    if (!isOwner) return;
    setDraggedIndex(index);
    dragNode.current = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (!isOwner || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (!isOwner || draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...items];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(dragOverIndex, 0, movedItem);

    setItems(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      const payload = reordered.map((it, idx) => ({ id: it.id, position: idx + 1 }));
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
        {isOwner && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              mb: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
              border: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isPublicSetting ? <PublicOutlinedIcon color="primary" fontSize="small" /> : <LockOutlinedIcon color="warning" fontSize="small" />}
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {isPublicSetting ? 'Lista Pública no Perfil' : 'Lista Privada (apenas você vê)'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isPublicSetting
                    ? 'Visitantes do seu perfil podem ver o que você planeja escutar'
                    : 'Apenas você pode visualizar este backlog'}
                </Typography>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={isPublicSetting}
                  onChange={handleToggleVisibility}
                  disabled={savingVisibility}
                  color="primary"
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          </Box>
        )}

        {isOwner && items.length > 1 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.75, fontStyle: 'italic' }}>
            💡 Arraste os cards segurando pelo ícone para organizar sua ordem de prioridade de audição.
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={30} />
          </Box>
        ) : isPrivate && !isOwner ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <LockOutlinedIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Esta lista é privada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              O usuário optou por não compartilhar sua fila de audição publicamente.
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              Nenhum item na fila
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isOwner
                ? 'Navegue por álbuns ou faixas e clique no botão "Quero Ouvir" para planejar o que escutar.'
                : 'Este usuário ainda não adicionou nenhum item à sua fila de audição.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map((item, index) => {
              const isBeingDragged = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <Paper
                  key={`${item.item_type}-${item.item_id}`}
                  elevation={0}
                  draggable={isOwner}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: isBeingDragged
                      ? (theme) => alpha(theme.palette.primary.main, 0.08)
                      : isOver
                      ? (theme) => alpha(theme.palette.primary.main, 0.15)
                      : (theme) => alpha(theme.palette.text.primary, 0.025),
                    border: '1px solid',
                    borderColor: isOver ? 'primary.main' : 'divider',
                    cursor: isOwner ? 'grab' : 'default',
                    opacity: isBeingDragged ? 0.4 : 1,
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                    },
                  }}
                >
                  {isOwner && (
                    <Box
                      sx={{
                        color: 'text.secondary',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.25,
                      }}
                      title="Arrastar para reordenar"
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    fontWeight={800}
                    className="mtl-mono"
                    sx={{
                      minWidth: 22,
                      textAlign: 'center',
                      color: 'primary.main',
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      px: 0.6,
                      py: 0.2,
                      borderRadius: 1,
                    }}
                  >
                    #{index + 1}
                  </Typography>

                  <Box
                    component="img"
                    src={item.item_image_url || '/placeholder.png'}
                    alt={item.item_name}
                    sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
                  />

                  <Box
                    component={Link}
                    to={item.item_type === 'album' ? `/album/${item.item_id}` : `/track/${item.item_id}`}
                    onClick={onClose}
                    sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ '&:hover': { color: 'primary.main' } }}>
                      {item.item_name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.item_artist && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.item_artist}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        label={item.item_type === 'album' ? 'Álbum' : 'Música'}
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    </Box>
                  </Box>

                  {isOwner && (
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={() => handleRemove(item.item_type, item.item_id)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                      title="Remover da lista"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

