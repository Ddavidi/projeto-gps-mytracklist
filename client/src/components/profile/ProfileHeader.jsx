import React from 'react';
import { Box, Typography, Avatar, Button, Chip, alpha } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import CheckIcon from '@mui/icons-material/Check';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

export default function ProfileHeader({
  user,
  isOwner,
  reviewsCount = 0,
  followersCount = 0,
  followingCount = 0,
  onEditClick,
  onFollowToggle,
  isFollowing,
}) {
  if (!user) return null;

  const genres = Array.isArray(user.favorite_genres) ? user.favorite_genres : [];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Capa Cinematográfica estilo AniList / Musicboard */}
      <Box
        sx={{
          height: { xs: 160, sm: 220, md: 250 },
          position: 'relative',
          overflow: 'hidden',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
          backgroundImage: user.cover_url
            ? `url(${user.cover_url})`
            : (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.28)} 0%, ${alpha(theme.palette.secondary.main, 0.18)} 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (theme) =>
              `linear-gradient(180deg, transparent 35%, ${theme.palette.background.paper} 100%)`,
          }}
        />
      </Box>

      {/* Bloco de Identidade */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          mt: { xs: -6.5, sm: -8 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: { xs: 2, md: 3 },
          }}
        >
          <Avatar
            src={user.avatar_url}
            alt={user.username}
            sx={{
              width: { xs: 104, sm: 132 },
              height: { xs: 104, sm: 132 },
              border: '4px solid',
              borderColor: 'background.paper',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: { xs: '2.4rem', sm: '3rem' },
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {user.username?.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0, pb: { md: 0.75 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
                {user.name || user.username}
              </Typography>
              {user.spotify_connected && (
                <Chip
                  size="small"
                  icon={<GraphicEqIcon sx={{ fontSize: 14 }} />}
                  label="Spotify"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 24, fontSize: '0.72rem' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: user.bio ? 1 : 0 }}>
              @{user.username}
            </Typography>
            {user.bio && (
              <Typography variant="body2" color="text.primary" sx={{ maxWidth: '62ch', lineHeight: 1.55 }}>
                {user.bio}
              </Typography>
            )}
          </Box>

          {/* Contadores e Botão de Ação */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 2.5, sm: 3.5 },
              flexWrap: 'wrap',
              width: { xs: '100%', md: 'auto' },
              justifyContent: { xs: 'space-between', md: 'flex-end' },
              pt: { xs: 1, md: 0 },
              pb: { md: 1 },
            }}
          >
            <Box sx={{ display: 'flex', gap: { xs: 2.5, sm: 3.5 } }}>
              <Box>
                <Typography variant="h6" className="mtl-mono" fontWeight={700} lineHeight={1.1}>
                  {reviewsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avaliações
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" className="mtl-mono" fontWeight={700} lineHeight={1.1}>
                  {followersCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Seguidores
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" className="mtl-mono" fontWeight={700} lineHeight={1.1}>
                  {followingCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Seguindo
                </Typography>
              </Box>
            </Box>

            {isOwner ? (
              <Button variant="outlined" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={onEditClick}>
                Editar perfil
              </Button>
            ) : (
              <Button
                variant={isFollowing ? 'outlined' : 'contained'}
                color="primary"
                startIcon={isFollowing ? <CheckIcon fontSize="small" /> : <PersonAddAlt1OutlinedIcon fontSize="small" />}
                onClick={onFollowToggle}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </Button>
            )}
          </Box>
        </Box>

        {/* Gêneros Favoritos */}
        {genres.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 2.5 }}>
            {genres.map((genre) => (
              <Chip
                key={genre}
                label={genre}
                size="small"
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
