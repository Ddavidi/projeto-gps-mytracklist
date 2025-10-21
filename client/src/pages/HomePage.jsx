import React from 'react';
import { Typography, Box } from '@mui/material';
import SearchBar from '../components/SearchBar'; // 1. Importe o novo componente

function HomePage() {

  const handleSearch = (query) => {
    // Numa tarefa futura, isto irá redirecionar para a página de resultados.
    // Por agora, apenas exibimos a busca no console para confirmar que funciona.
    console.log('A procurar por:', query);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bem-vindo ao MyTrackList
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Procure e avalie as suas músicas favoritas.
      </Typography>

      {/* 2. Adicione a SearchBar */}
      <SearchBar onSearch={handleSearch} />
    </Box>
  );
}

export default HomePage;