import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Box, Button } from '@mui/material';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
// 1. Importe a nova página de registo
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <Container>
      {/* Menu de Navegação para Teste */}
      <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
        <nav>
          <Button component={Link} to="/" sx={{ mr: 2 }}>
            Início
          </Button>
          <Button component={Link} to="/login" sx={{ mr: 2 }}>
            Login
          </Button>
          {/* Adicione um link para a nova página */}
          <Button component={Link} to="/register">
            Registar
          </Button>
        </nav>
      </Box>

      {/* Definição das Rotas */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* 2. Adicione a nova rota */}
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Container>
  );
}

export default App;