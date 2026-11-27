import React, { useRef, useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import { getRatingMeta } from '../utils/ratingColor';

const STAR_COUNT = 5;
const MAX_SCORE = 10;
const ICON_SIZES = { small: 18, medium: 26, large: 34 };

const clampScore = (n) => Math.min(MAX_SCORE, Math.max(0, n));

/**
 * Componente de avaliação por estrelas (0-10, meia estrela = 1 ponto) com paleta semântica por nota.
 *
 * Implementação própria (no lugar do <Rating> do MUI) porque, em telas de toque, o estado interno
 * de hover/focus do MUI ficava dessincronizado do valor real: a estrela exibida não batia com a
 * nota salva e tocar de novo numa nota às vezes apagava a avaliação.
 * Aqui o valor exibido é sempre o valor controlado (ou a prévia enquanto o dedo/mouse está sobre as estrelas).
 */
function RatingInput({ value, onChange, readOnly = false, size = 'large' }) {
  const starsRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const pointerActive = useRef(false);

  const hasValue = value !== null && value !== undefined && !Number.isNaN(Number(value));
  const numericValue = hasValue ? clampScore(Number(value)) : null;
  const interactive = !readOnly && typeof onChange === 'function';

  const displayed = preview !== null ? preview : numericValue;
  const { color, isGold } = displayed !== null ? getRatingMeta(displayed) : { color: undefined, isGold: false };
  const chipMeta = hasValue ? getRatingMeta(numericValue) : null;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.large;

  const scoreFromClientX = (clientX) => {
    const rect = starsRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const ratio = (clientX - rect.left) / rect.width;
    // Cada meia estrela vale 1 ponto; tocar em qualquer parte da meia estrela seleciona aquela nota.
    return Math.min(MAX_SCORE, Math.max(1, Math.ceil(ratio * MAX_SCORE)));
  };

  const commit = (score) => {
    if (score === null || score === numericValue) return;
    onChange(score);
  };

  const handlePointerDown = (event) => {
    if (!interactive || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerActive.current = true;
    // Mantém o arraste funcionando mesmo se o dedo sair da área das estrelas.
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* noop */ }
    setPreview(scoreFromClientX(event.clientX));
  };

  const handlePointerMove = (event) => {
    if (!interactive) return;
    // Mouse: prévia ao passar por cima. Toque/caneta: só enquanto o dedo está pressionado (arrastar).
    if (event.pointerType === 'mouse' || pointerActive.current) {
      setPreview(scoreFromClientX(event.clientX));
    }
  };

  const handlePointerUp = (event) => {
    if (!interactive || !pointerActive.current) return;
    pointerActive.current = false;
    commit(scoreFromClientX(event.clientX));
    if (event.pointerType !== 'mouse') setPreview(null);
  };

  const resetPointer = () => {
    pointerActive.current = false;
    setPreview(null);
  };

  const handleKeyDown = (event) => {
    if (!interactive) return;
    const current = numericValue ?? 0;
    let next = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clampScore(Math.floor(current) + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clampScore(Math.ceil(current) - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = MAX_SCORE;
        break;
      default:
        if (/^[0-9]$/.test(event.key)) next = Number(event.key);
    }
    if (next === null) return;
    event.preventDefault();
    if (next !== numericValue) onChange(next);
  };

  const ariaLabel = hasValue ? `Nota ${numericValue} de ${MAX_SCORE}` : 'Sem nota';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', my: readOnly ? 0 : 1.5 }}>
      {!readOnly && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          Toque ou arraste nas estrelas
        </Typography>
      )}
      <Box
        ref={starsRef}
        {...(interactive
          ? {
              role: 'slider',
              tabIndex: 0,
              'aria-label': 'Avaliação de 0 a 10',
              'aria-valuemin': 0,
              'aria-valuemax': MAX_SCORE,
              'aria-valuenow': numericValue ?? undefined,
              'aria-valuetext': ariaLabel,
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              onPointerCancel: resetPointer,
              onPointerLeave: resetPointer,
              onKeyDown: handleKeyDown,
            }
          : { role: 'img', 'aria-label': ariaLabel })}
        data-score={displayed ?? ''}
        sx={{
          display: 'inline-flex',
          lineHeight: 0,
          cursor: interactive ? 'pointer' : 'default',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          // Permite rolar a página na vertical, mas o arraste horizontal fica com as estrelas.
          touchAction: interactive ? 'pan-y' : 'auto',
          borderRadius: 1,
          outline: 'none',
          '&:focus-visible': { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` },
        }}
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const fill = displayed === null ? 0 : Math.min(1, Math.max(0, displayed / 2 - i));
          return (
            <Box
              key={i}
              aria-hidden
              sx={{ position: 'relative', width: iconSize, height: iconSize, flexShrink: 0, pointerEvents: 'none' }}
            >
              <StarOutlineRoundedIcon sx={{ fontSize: iconSize, color: 'action.disabled', position: 'absolute', inset: 0 }} />
              {fill > 0 && (
                <Box sx={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                  <StarRoundedIcon
                    sx={{
                      fontSize: iconSize,
                      color,
                      display: 'block',
                      ...(isGold && { filter: 'drop-shadow(0 0 6px rgba(245, 197, 24, 0.55))' }),
                    }}
                  />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {hasValue && size !== 'small' && (
        <Box
          sx={{
            mt: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.85,
            px: 1.4,
            py: 0.35,
            borderRadius: 99,
            bgcolor: alpha(chipMeta.color, chipMeta.isGold ? 0.18 : 0.14),
            border: '1px solid',
            borderColor: alpha(chipMeta.color, chipMeta.isGold ? 0.6 : 0.4),
            ...(chipMeta.isGold && { boxShadow: '0 0 14px rgba(245, 197, 24, 0.25)' }),
          }}
        >
          <Typography variant="subtitle1" className="mtl-mono" fontWeight={800} sx={{ color: chipMeta.color, lineHeight: 1 }}>
            {numericValue}/10
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default RatingInput;
