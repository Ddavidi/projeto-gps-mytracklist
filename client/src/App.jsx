import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Box, Button } from '@mui/material';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Container>
      {/* Menu de Navegação para Teste */}
      <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
        <nav>
          <Button component={Link} to="/" sx={{ mr: 2 }}>
            Início
          </Button>
          <Button component={Link} to="/login">
            Login
          </Button>
        </nav>
      </Box>

      {/* Definição das Rotas */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Container>
  );
}

export default App;