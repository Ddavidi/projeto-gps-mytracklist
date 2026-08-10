import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getItemStats } from '../services/reviews';

function ScoreDistribution({ itemType, itemId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (itemId) {
      getItemStats(itemType, itemId).then(data => {
        if (data) setStats(data);
      });
    }
  }, [itemType, itemId]);

  if (!stats || stats.totalReviews === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">Ainda não há avaliações para este item.</Typography>
      </Box>
    );
  }

  // Encontra o valor máximo para escalar as barras
  const distribution = stats.distribution || {};
  const maxCount = Math.max(...Object.values(distribution), 1);
  const total = stats.totalReviews;
  const average = stats.averageScore;

  // Notas de 0 a 10
  const scores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Score Distribution
      </Typography>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, gap: 0.5 }}>
          {scores.map(score => {
            const count = distribution[score] || 0;
            const heightPercent = (count / maxCount) * 100;
            
            // Cores do AniList (do vermelho ao verde)
            let color = '#4caf50';
            if (score <= 3) color = '#f44336';
            else if (score <= 6) color = '#ffeb3b';
            else if (score <= 8) color = '#8bc34a';

            return (
              <Box key={score} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', position: 'absolute', top: -20, display: count > 0 ? 'block' : 'none' }}>
                  {count}
                </Typography>
                <Box 
                  sx={{ 
                    width: '100%', 
                    maxWidth: 16,
                    height: `${Math.max(heightPercent, 5)}%`, 
                    bgcolor: color, 
                    borderRadius: '4px 4px 0 0',
                    opacity: count > 0 ? 1 : 0.2,
                    transition: 'height 0.3s'
                  }} 
                />
                <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                  {score}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">Média: <Typography component="span" fontWeight="bold" color="text.primary">{average.toFixed(1)}/10</Typography></Typography>
          <Typography variant="body2" color="text.secondary">Avaliações: <Typography component="span" fontWeight="bold" color="text.primary">{total}</Typography></Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default ScoreDistribution;
