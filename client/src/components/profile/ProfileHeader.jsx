import React from 'react';
import { Box, Typography, Avatar, Button } from '@mui/material';

export default function ProfileHeader({ user, isOwner, followersCount, followingCount, onEditClick, onFollowToggle, isFollowing }) {
  if (!user) return null;

  return (
    <Box sx={{ mb: 4 }}>
      {/* Capa */}
      <Box sx={{ 
        height: 200, 
        bgcolor: 'grey.800',
        backgroundImage: user.cover_url ? `url(${user.cover_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '8px 8px 0 0',
        position: 'relative'
      }} />

      {/* Info container */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', px: 4, pb: 2, mt: -7, position: 'relative' }}>
        {/* Avatar gigante */}
        <Avatar 
          src={user.avatar_url} 
          sx={{ 
            width: 140, 
            height: 140, 
            border: '4px solid #242424', 
            bgcolor: '#1db954',
            fontSize: '3rem'
          }}
        >
          {user.username?.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ ml: 3, pb: 1, flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {user.name || user.username}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            @{user.username}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, pb: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{followingCount || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Seguindo</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{followersCount || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Seguidores</Typography>
          </Box>
          
          <Box sx={{ ml: 2 }}>
            {isOwner ? (
              <Button variant="outlined" sx={{ borderRadius: 20 }} onClick={onEditClick}>
                Editar
              </Button>
            ) : (
              <Button 
                variant={isFollowing ? "outlined" : "contained"} 
                color="primary" 
                sx={{ borderRadius: 20 }} 
                onClick={onFollowToggle}
              >
                {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
