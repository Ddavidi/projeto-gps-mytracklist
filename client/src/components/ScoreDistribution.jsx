import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { getItemStats } from '../services/reviews';

function ScoreDistribution({ itemType, itemId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (itemId) {
      getItemStats(itemType, itemId).then((data) => {
        if (data) setStats(data);
      });
    }
  }, [itemType, itemId]);

  if (!stats || stats.totalReviews === 0) {
    return (
      <Paper sx={{ p: 2, mt: 2.5, borderRadius: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Ainda não há avaliações da comunidade para este item.
        </Typography>
      </Paper>
    );
  }

  const distribution = stats.distribution || {};
  const maxCount = Math.max(...Object.values(distribution), 1);
  const total = stats.totalReviews;
  const average = Number(stats.averageScore) || 0;
  const scores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Distribuição de Notas
        </Typography>
        <Typography variant="h6" className="mtl-mono" color="primary" fontWeight={800}>
          {average.toFixed(1)}
          <Typography component="span" variant="caption" color="text.secondary">/10</Typography>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 74, gap: 0.5, pt: 2 }}>
        {scores.map((score) => {
          const count = distribution[score] || 0;
          const heightPercent = (count / maxCount) * 100;

          return (
            <Box key={score} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 14,
                  height: `${Math.max(heightPercent, 8)}%`,
                  bgcolor: count > 0 ? 'primary.main' : (theme) => alpha(theme.palette.text.primary, 0.1),
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              <Typography variant="caption" className="mtl-mono" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                {score}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
        Baseado em <Box component="span" className="mtl-mono" color="text.primary" fontWeight={700}>{total}</Box> {total === 1 ? 'avaliação' : 'avaliações'}
      </Typography>
    </Paper>
  );
}

export default ScoreDistribution;
