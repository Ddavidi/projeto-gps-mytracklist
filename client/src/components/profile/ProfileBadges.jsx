import React from 'react';
import { Box, Typography, Grid, Paper, alpha } from '@mui/material';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import RepeatIcon from '@mui/icons-material/Repeat';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';

export default function ProfileBadges({ reviews = [], user = null }) {
  const albumCount = reviews.filter((r) => r.item_type === 'album').length;
  const writtenCount = reviews.filter((r) => r.review_text && r.review_text.trim().length >= 20).length;
  const relistenCount = reviews.filter((r) => r.is_relisten).length;
  const genresCount = Array.isArray(user?.favorite_genres) ? user.favorite_genres.length : 0;

  const badges = [
    {
      id: 'first-rating',
      title: 'Primeira Nota',
      desc: 'Avaliou seu primeiro item no MyTrackList',
      unlocked: reviews.length >= 1,
      icon: StarOutlineIcon,
    },
    {
      id: 'album-lover',
      title: 'Ouvinte de Discos',
      desc: 'Avaliou 5 ou mais álbuns completos',
      unlocked: albumCount >= 5,
      icon: AlbumOutlinedIcon,
    },
    {
      id: 'critic',
      title: 'Crítico Ativo',
      desc: 'Escreveu 5 ou mais reviews detalhadas',
      unlocked: writtenCount >= 5,
      icon: EditNoteIcon,
    },
    {
      id: 'collector',
      title: 'Estante Cheia',
      desc: 'Atingiu 25 avaliações registradas',
      unlocked: reviews.length >= 25,
      icon: WorkspacePremiumOutlinedIcon,
    },
    {
      id: 'eclectic',
      title: 'Gosto Eclético',
      desc: 'Definiu 5 ou mais gêneros favoritos',
      unlocked: genresCount >= 5,
      icon: ExploreOutlinedIcon,
    },
    {
      id: 'spotify-sync',
      title: 'Sincronizado',
      desc: 'Conectou sua conta do Spotify',
      unlocked: Boolean(user?.spotify_connected),
      icon: GraphicEqIcon,
    },
    {
      id: 'relisten',
      title: 'Fiel aos Clássicos',
      desc: 'Registrou uma re-audição no Diário',
      unlocked: relistenCount >= 1,
      icon: RepeatIcon,
    },
    {
      id: 'perfection',
      title: 'Clássico 10/10',
      desc: 'Concedeu uma nota máxima de 10/10',
      unlocked: reviews.some((r) => Number(r.rating) === 10),
      icon: EmojiEventsOutlinedIcon,
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
        <Typography variant="h6">Conquistas</Typography>
        <Typography variant="caption" className="mtl-mono" color="text.secondary">
          {unlockedCount} / {badges.length} desbloqueadas
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={badge.id}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  opacity: badge.unlocked ? 1 : 0.42,
                  bgcolor: badge.unlocked
                    ? (theme) => alpha(theme.palette.primary.main, 0.07)
                    : (theme) => alpha(theme.palette.text.primary, 0.02),
                  borderColor: badge.unlocked
                    ? (theme) => alpha(theme.palette.primary.main, 0.3)
                    : 'divider',
                  height: '100%',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: badge.unlocked ? 'primary.main' : 'action.hover',
                    color: badge.unlocked ? 'primary.contrastText' : 'text.secondary',
                    mb: 1.5,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {badge.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {badge.desc}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

