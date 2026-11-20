import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, LinearProgress, Chip, Grid, Avatar, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { getCompatibility } from '../services/social';

export default function TasteMatchCard({ targetUserId, targetUsername }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!targetUserId) return;
    getCompatibility(targetUserId)
      .then(setData)
      .catch(() => {});
  }, [targetUserId]);

  if (!data || (data.score === null && data.commonCount === 0 && (!data.sharedGenres || data.sharedGenres.length === 0))) {
    return null;
  }

  return (
    <Paper
      sx={{
        p: { xs: 2.5, sm: 3 },
        mb: 3,
        borderRadius: 3.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Afinidade Musical com @{targetUsername}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.commonCount > 0
              ? `${data.commonCount} ${data.commonCount === 1 ? 'item avaliado' : 'itens avaliados'} em comum`
              : 'Baseado nos gêneros musicais favoritos de vocês'}
          </Typography>
        </Box>
        {data.score !== null && (
          <Typography variant="h4" className="mtl-mono" color="primary" fontWeight={800}>
            {data.score}%
          </Typography>
        )}
      </Box>

      {data.score !== null && (
        <LinearProgress
          variant="determinate"
          value={data.score}
          sx={{
            height: 7,
            borderRadius: 99,
            mb: 2,
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
            '& .MuiLinearProgress-bar': { borderRadius: 99 },
          }}
        />
      )}

      {data.sharedGenres?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: data.lovedByBoth?.length || data.disagreements?.length ? 2.5 : 0 }}>
          {data.sharedGenres.map((genre) => (
            <Chip key={genre} size="small" label={genre} color="primary" variant="outlined" />
          ))}
        </Box>
      )}

      {(data.lovedByBoth?.length > 0 || data.disagreements?.length > 0) && (
        <Grid container spacing={2.5}>
          {data.lovedByBoth?.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                <FavoriteIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="caption" fontWeight={700}>Vocês dois amaram</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.lovedByBoth.map((item) => (
                  <Box
                    key={`${item.item_type}-${item.item_id}`}
                    component={Link}
                    to={`/${item.item_type}/${item.item_id}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                  >
                    <Avatar variant="rounded" src={item.item_image_url} sx={{ width: 36, height: 36 }} />
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                      {item.item_name}
                    </Typography>
                    <Typography variant="caption" className="mtl-mono" color="primary" fontWeight={700}>
                      {item.my_rating} · {item.their_rating}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          )}

          {data.disagreements?.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                <CompareArrowsIcon color="secondary" sx={{ fontSize: 16 }} />
                <Typography variant="caption" fontWeight={700}>Onde vocês discordam</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.disagreements.map((item) => (
                  <Box
                    key={`${item.item_type}-${item.item_id}`}
                    component={Link}
                    to={`/${item.item_type}/${item.item_id}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                  >
                    <Avatar variant="rounded" src={item.item_image_url} sx={{ width: 36, height: 36 }} />
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                      {item.item_name}
                    </Typography>
                    <Typography variant="caption" className="mtl-mono" color="secondary" fontWeight={700}>
                      Você {item.my_rating} · @{targetUsername} {item.their_rating}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Paper>
  );
}

