import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction, alpha } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onOpenSearch }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Esconde na tela de login/cadastro
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const getActiveValue = () => {
    const path = location.pathname;
    const search = location.search;
    if (path === '/') return 'home';
    if (path === '/explore') return 'explore';
    if (path === '/search' || path === '/search-users') return 'search';
    if (path === '/profile' && search.includes('tab=lists')) return 'lists';
    if (path.startsWith('/profile') || path.startsWith('/settings')) return 'profile';
    return false;
  };

  const handleChange = (_event, value) => {
    if (value === 'home') navigate('/');
    else if (value === 'explore') navigate('/explore');
    else if (value === 'search') {
      if (onOpenSearch) onOpenSearch();
      else navigate('/search');
    } else if (value === 'lists') {
      navigate(isAuthenticated ? '/profile?tab=lists' : '/login');
    } else if (value === 'profile') {
      navigate(isAuthenticated ? '/profile' : '/login');
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1250,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.94),
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid',
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={getActiveValue()}
        onChange={handleChange}
        showLabels
        sx={{
          height: 62,
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 0.75,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.68rem',
            fontWeight: 600,
            '&.Mui-selected': {
              fontSize: '0.7rem',
              fontWeight: 700,
            },
          },
        }}
      >
        <BottomNavigationAction label="Início" value="home" icon={<HomeRoundedIcon />} />
        <BottomNavigationAction label="Explorar" value="explore" icon={<ExploreRoundedIcon />} />
        <BottomNavigationAction label="Buscar" value="search" icon={<SearchRoundedIcon />} />
        <BottomNavigationAction label="Listas" value="lists" icon={<FormatListNumberedRoundedIcon />} />
        <BottomNavigationAction label={isAuthenticated ? 'Perfil' : 'Entrar'} value="profile" icon={<PersonRoundedIcon />} />
      </BottomNavigation>
    </Paper>
  );
}
