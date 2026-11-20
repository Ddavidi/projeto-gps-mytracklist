import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  IconButton,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import { useThemeMode } from '../context/ThemeContext';

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '...';
  }
  return lines;
}

export default function ShareCardModal({ open, onClose, review }) {
  const { palette } = useThemeMode();
  const canvasRef = useRef(null);
  const [format, setFormat] = useState('story'); // story (9:16) | square (1:1)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !review) return;
    setReady(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = 1080;
    const height = format === 'story' ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const drawCard = (coverImg) => {
      // Fundo baseado na paleta ativa
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, width, height);

      // Halo suave com cor primária
      const grad = ctx.createRadialGradient(width * 0.8, height * 0.15, 40, width * 0.5, height * 0.35, width * 0.9);
      grad.addColorStop(0, `${palette.primary}38`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Painel central
      const pad = 76;
      const cardX = pad;
      const cardY = format === 'story' ? 180 : 68;
      const cardW = width - pad * 2;
      const cardH = height - cardY * 2;

      ctx.fillStyle = palette.surface;
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 36);
      ctx.fill();
      ctx.stroke();

      // Cabeçalho marca
      ctx.fillStyle = palette.primary;
      ctx.font = '800 38px "Bricolage Grotesque", sans-serif';
      ctx.fillText('MyTrackList', cardX + 56, cardY + 86);

      ctx.fillStyle = palette.textMuted;
      ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
      const authorLabel = `@${review.user_username || review.author_username || 'usuario'}`;
      const authorW = ctx.measureText(authorLabel).width;
      ctx.fillText(authorLabel, cardX + cardW - 56 - authorW, cardY + 84);

      // Capa
      const coverSize = format === 'story' ? 560 : 340;
      const coverX = format === 'story' ? (width - coverSize) / 2 : cardX + 56;
      const coverY = cardY + 145;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(coverX, coverY, coverSize, coverSize, 26);
      ctx.clip();
      if (coverImg) {
        ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
      } else {
        ctx.fillStyle = palette.elevated;
        ctx.fillRect(coverX, coverY, coverSize, coverSize);
      }
      ctx.restore();

      // Título e Nota
      const infoX = format === 'story' ? cardX + 56 : coverX + coverSize + 44;
      const infoW = format === 'story' ? cardW - 112 : cardX + cardW - 56 - infoX;
      let cursorY = format === 'story' ? coverY + coverSize + 76 : coverY + 54;

      ctx.fillStyle = palette.text;
      ctx.font = '800 46px "Bricolage Grotesque", sans-serif';
      const titleLines = wrapText(ctx, review.item_name || 'Álbum', infoW, 2);
      for (const line of titleLines) {
        ctx.fillText(line, infoX, cursorY);
        cursorY += 56;
      }

      // Badge da Nota
      cursorY += 16;
      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.roundRect(infoX, cursorY - 38, 184, 62, 16);
      ctx.fill();
      ctx.fillStyle = palette.primaryContrast;
      ctx.font = '700 36px "JetBrains Mono", monospace';
      ctx.fillText(`${review.rating} / 10`, infoX + 26, cursorY + 4);

      // Texto da review
      const textStartY = format === 'story' ? cursorY + 86 : Math.max(cursorY + 74, coverY + coverSize + 64);
      const textX = cardX + 56;
      const textMaxW = cardW - 112;

      if (review.review_text && !review.has_spoiler) {
        ctx.fillStyle = palette.text;
        ctx.font = '500 32px "Plus Jakarta Sans", sans-serif';
        const lines = wrapText(ctx, `"${review.review_text}"`, textMaxW, format === 'story' ? 6 : 3);
        let y = textStartY;
        for (const line of lines) {
          ctx.fillText(line, textX, y);
          y += 46;
        }
      }

      // Vibes
      const vibes = Array.isArray(review.vibe_tags) ? review.vibe_tags.slice(0, 3) : [];
      if (vibes.length > 0) {
        let vx = cardX + 56;
        const vy = cardY + cardH - 125;
        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        for (const vibe of vibes) {
          const w = ctx.measureText(vibe).width + 36;
          ctx.fillStyle = palette.elevated;
          ctx.beginPath();
          ctx.roundRect(vx, vy - 30, w, 46, 23);
          ctx.fill();
          ctx.fillStyle = palette.secondary;
          ctx.fillText(vibe, vx + 18, vy);
          vx += w + 14;
        }
      }

      // Rodapé
      ctx.fillStyle = palette.textMuted;
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('projeto-gps-mytracklist.vercel.app', cardX + 56, cardY + cardH - 44);
      setReady(true);
    };

    if (review.item_image_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => drawCard(img);
      img.onerror = () => drawCard(null);
      img.src = review.item_image_url;
    } else {
      drawCard(null);
    }
  }, [open, review, format, palette]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `mytracklist-${(review?.item_name || 'review').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (navigator.share && navigator.canShare) {
      canvas.toBlob(async (blob) => {
        if (!blob) return handleDownload();
        const file = new File([blob], 'mytracklist-review.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${review?.item_name} — ${review?.rating}/10 no MyTrackList`,
            });
            return;
          } catch {
            // usuário cancelou
          }
        } else {
          handleDownload();
        }
      });
    } else {
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Compartilhar Card</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={format}
          onChange={(e, val) => val && setFormat(val)}
          color="primary"
        >
          <ToggleButton value="story">Stories (9:16)</ToggleButton>
          <ToggleButton value="square">Quadrado (1:1)</ToggleButton>
        </ToggleButtonGroup>

        <Box
          sx={{
            width: '100%',
            maxWidth: format === 'story' ? 240 : 320,
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={!ready}>
          Baixar PNG
        </Button>
        <Button variant="contained" startIcon={<ShareIcon />} onClick={handleNativeShare} disabled={!ready}>
          Compartilhar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

