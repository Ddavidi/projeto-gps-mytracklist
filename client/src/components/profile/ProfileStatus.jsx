import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

export default function ProfileStatus({ reviews }) {
  const getStats = (type) => {
    const items = type === 'all' ? reviews : reviews.filter(r => r.item_type === type);
    const count = items.length;
    const avg = count > 0 ? items.reduce((acc, r) => acc + r.rating, 0) / count : 0;
    return { count, avg: avg.toFixed(1) };
  };

  const trackStats = getStats('track');
  const albumStats = getStats('album');
  const artistStats = getStats('artist');

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Total de avaliações</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1"><strong>{trackStats.count}</strong> músicas</Typography>
            <Typography variant="body1"><strong>{albumStats.count}</strong> álbuns</Typography>
            <Typography variant="body1"><strong>{artistStats.count}</strong> artistas</Typography>
          </Box>
        </Paper>
      </Grid>
      
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Média das avaliações</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1"><strong>{trackStats.avg}</strong> / 10 músicas</Typography>
            <Typography variant="body1"><strong>{albumStats.avg}</strong> / 10 álbuns</Typography>
            <Typography variant="body1"><strong>{artistStats.avg}</strong> / 10 artistas</Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
