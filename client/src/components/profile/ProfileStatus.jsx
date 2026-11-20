import React from 'react';
import { Box, Typography, Grid, Paper, alpha } from '@mui/material';
import ProfileBadges from './ProfileBadges';

export default function ProfileStatus({ reviews, profileUser = null }) {
  const getStats = (type) => {
    const items = type === 'all' ? reviews : reviews.filter((r) => r.item_type === type);
    const count = items.length;
    const avg = count > 0 ? items.reduce((acc, r) => acc + Number(r.rating), 0) / count : 0;
    return { count, avg: avg.toFixed(1) };
  };

  const blocks = [
    { label: 'Músicas', ...getStats('track') },
    { label: 'Álbuns', ...getStats('album') },
    { label: 'Artistas', ...getStats('artist') },
  ];

  const allStats = getStats('all');

  return (
    <Box>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), borderColor: (theme) => alpha(theme.palette.primary.main, 0.25) }}>
            <Typography variant="caption" color="primary" fontWeight={700} display="block" gutterBottom>
              Resumo Geral
            </Typography>
            <Typography variant="h3" className="mtl-mono" fontWeight={800}>
              {allStats.count}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              avaliações · média <Box component="span" className="mtl-mono" color="text.primary" fontWeight={700}>{allStats.avg}/10</Box>
            </Typography>
          </Paper>
        </Grid>

        {blocks.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.label}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                {item.label}
              </Typography>
              <Typography variant="h3" className="mtl-mono" fontWeight={800}>
                {item.count}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                média <Box component="span" className="mtl-mono" color="primary.main" fontWeight={700}>{item.avg}</Box>/10
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <ProfileBadges reviews={reviews} user={profileUser} />
    </Box>
  );
}
