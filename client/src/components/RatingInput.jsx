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
 *
 * A nota 0 tem um botão próprio à esquerda das estrelas (nas estrelas a menor nota é 1).
 * As notas extremas brilham: dourado no 10, vermelho no 0.
 */
function RatingInput({ value, onChange, readOnly = false, size = 'large' }) {
  const starsRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const pointerActive = useRef(false);

  const hasValue = value !== null && value !== undefined && !Number.isNaN(Number(value));
  const numericValue = hasValue ? clampScore(Number(value)) : null;
  const interactive = !readOnly && typeof onChange === 'function';

  const displayed = preview !== null ? preview : numericValue;
  const meta = displayed !== null ? getRatingMeta(displayed) : null;
  const color = meta?.color;
  const isZeroShown = Boolean(meta?.isZero);
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
          Toque no 0 ou nas estrelas
        </Typography>
      )}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {interactive && (
        <Box
          component="button"
          type="button"
          aria-label="Dar nota 0"
          aria-pressed={numericValue === 0}
          onClick={() => {
            setPreview(null);
            if (numericValue !== 0) onChange(0);
          }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setPreview(0)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setPreview(null)}
          className="mtl-mono"
          sx={(theme) => {
            const zero = getRatingMeta(0);
            const active = isZeroShown;
            return {
              width: iconSize,
              height: iconSize,
              p: 0,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: active ? zero.color : theme.palette.action.disabled,
              bgcolor: active ? alpha(zero.color, 0.16) : 'transparent',
              color: active ? zero.color : theme.palette.text.secondary,
              fontWeight: 800,
              fontSize: Math.round(iconSize * 0.45),
              lineHeight: 1,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 0.2s ease',
              boxShadow: active ? `0 0 12px ${zero.glow(0.55)}, inset 0 0 6px ${zero.glow(0.25)}` : 'none',
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            };
          }}
        >
          0
        </Box>
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
              <StarOutlineRoundedIcon
                sx={{
                  fontSize: iconSize,
                  position: 'absolute',
                  inset: 0,
                  color: isZeroShown ? alpha(meta.color, 0.75) : 'action.disabled',
                  transition: 'color 0.2s ease, filter 0.2s ease',
                  ...(isZeroShown && { filter: `drop-shadow(0 0 5px ${meta.glow(0.45)})` }),
                }}
              />
              {fill > 0 && (
                <Box sx={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                  <StarRoundedIcon
                    sx={{
                      fontSize: iconSize,
                      color,
                      display: 'block',
                      ...(meta?.isGold && { filter: `drop-shadow(0 0 6px ${meta.glow(0.55)})` }),
                    }}
                  />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
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
            bgcolor: alpha(chipMeta.color, chipMeta.isHighlight ? 0.18 : 0.14),
            border: '1px solid',
            borderColor: alpha(chipMeta.color, chipMeta.isHighlight ? 0.6 : 0.4),
            ...(chipMeta.isHighlight && { boxShadow: `0 0 14px ${chipMeta.glow(0.3)}` }),
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
