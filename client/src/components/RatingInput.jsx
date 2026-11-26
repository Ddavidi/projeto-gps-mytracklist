import React from 'react';
import { Rating, Box, Typography, alpha } from '@mui/material';
import { getRatingMeta } from '../utils/ratingColor';

/**
 * Componente para input de avaliação por estrelas (0-10) com paleta semântica de cores por nota.
 */
function RatingInput({ value, onChange, readOnly = false, size = 'large' }) {
  const muiRatingValue = value !== null && value !== undefined ? value / 2 : null;
  const hasValue = value !== null && value !== undefined;
  const { color, isGold, label } = hasValue ? getRatingMeta(value) : { color: undefined, isGold: false, label: '' };

  const handleChange = (_event, newValue) => {
    if (onChange) {
      onChange(newValue !== null ? newValue * 2 : null);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', my: readOnly ? 0 : 1.5 }}>
      {!readOnly && (
        <Typography component="legend" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          Avaliação (0–10):
        </Typography>
      )}
      <Rating
        name="track-rating"
        value={muiRatingValue}
        onChange={handleChange}
        precision={0.5}
        max={5}
        size={size}
        readOnly={readOnly}
        sx={{
          ...(hasValue && {
            '& .MuiRating-iconFilled': {
              color,
              ...(isGold && { filter: 'drop-shadow(0 0 6px rgba(245, 197, 24, 0.55))' }),
            },
            '& .MuiRating-iconHover': {
              color,
            },
          }),
        }}
      />
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
            bgcolor: alpha(color, isGold ? 0.18 : 0.14),
            border: '1px solid',
            borderColor: alpha(color, isGold ? 0.6 : 0.4),
            ...(isGold && { boxShadow: '0 0 14px rgba(245, 197, 24, 0.25)' }),
          }}
        >
          <Typography variant="subtitle1" className="mtl-mono" fontWeight={800} sx={{ color, lineHeight: 1 }}>
            {value}/10
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default RatingInput;
