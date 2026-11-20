import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

export default function ProfileTabs({ value, onChange }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3.5 }}>
      <Tabs
        value={value}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
              fontWeight: 700,
            },
          },
        }}
      >
        <Tab label="Visão Geral" />
        <Tab label="Músicas" />
        <Tab label="Álbuns" />
        <Tab label="Artistas" />
        <Tab label="Diário & Wrapped" />
        <Tab label="Listas & Quero Ouvir" />
        <Tab label="Social" />
        <Tab label="Estatísticas" />
        <Tab label="Playlists" />
        <Tab label="Spotify Stats" />
      </Tabs>
    </Box>
  );
}
