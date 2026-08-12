import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

const TAB_INDEX_MAP = {
  0: 'overview',
  1: 'tracks',
  2: 'albums',
  3: 'artists',
  4: 'social',
  5: 'status',
  6: 'playlists',
  7: 'spotify_stats'
};

export default function ProfileTabs({ value, onChange }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs 
        value={value} 
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: '#1db954',
            height: 3,
            borderRadius: '3px 3px 0 0'
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: '#1db954',
              fontWeight: 'bold',
            }
          }
        }}
      >
        <Tab label="Perfil" />
        <Tab label="Músicas" />
        <Tab label="Álbum" />
        <Tab label="Artistas" />
        <Tab label="Social" />
        <Tab label="Estatísticas" />
        <Tab label="Playlists" />
        <Tab label="Spotify Stats" />
      </Tabs>
    </Box>
  );
}
