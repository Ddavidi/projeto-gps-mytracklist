import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Avatar,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Drawer,
  List,
  ListItemText,
  ListItemButton,
  Badge,
  Tooltip,
  alpha,
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import api from '../services/api';
import { formatDateTime } from '../utils/date';

function VinylMark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 28 28"
      sx={{
        width: 26,
        height: 26,
        flexShrink: 0,
        transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        '.mtl-brand:hover &': { transform: 'rotate(90deg)' },
      }}
    >
      <circle cx="14" cy="14" r="13" fill="currentColor" opacity="0.16" />
      <circle cx="14" cy="14" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="7.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="14" cy="14" r="3.2" fill="currentColor" />
    </Box>
  );
}

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/users/me/notifications')
        .then((res) => setNotifications(res.data || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Atalho global Ctrl+K / Cmd+K para busca rápida
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationsClick = async () => {
    setNotificationsOpen(true);
    setMenuAnchor(null);
    if (unreadCount > 0) {
      try {
        await api.put('/users/me/notifications/read');
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogout = async () => {
    setMenuAnchor(null);
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Início', to: '/', show: true },
    { label: 'Explorar', to: '/explore', show: true },
    { label: 'Perfil', to: '/profile', show: isAuthenticated },
    { label: 'Listas', to: '/profile?tab=lists', show: isAuthenticated },
    { label: 'Diário', to: '/profile?tab=diary', show: isAuthenticated },
    { label: 'Comunidade', to: '/search-users', show: isAuthenticated },
    { label: 'Admin', to: '/admin', show: isAuthenticated && user?.is_admin },
  ].filter((item) => item.show);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    if (to.includes('?')) return `${location.pathname}${location.search}` === to;
    return location.pathname === to && !location.search;
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.86),
          backdropFilter: 'blur(14px)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ maxWidth: 1240, width: '100%', mx: 'auto', minHeight: 68, px: { xs: 2, md: 3 }, gap: 2 }}>
          {/* Marca */}
          <Box
            component={Link}
            to="/"
            className="mtl-brand"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.1,
              color: 'primary.main',
              textDecoration: 'none',
              mr: { md: 2 },
            }}
          >
            <VinylMark />
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'text.primary',
                fontSize: '1.25rem',
              }}
            >
              MyTrackList
            </Typography>
          </Box>

          {/* Links Desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Button
                  key={item.to}
                  component={Link}
                  to={item.to}
                  size="small"
                  sx={{
                    px: 1.5,
                    py: 0.85,
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    fontWeight: active ? 700 : 500,
                    '&:hover': {
                      color: 'text.primary',
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

          {/* Ações Direita */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Botão de Busca */}
            <Button
              onClick={() => setSearchOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<SearchIcon fontSize="small" />}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: 'text.secondary',
                borderColor: 'divider',
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                px: 1.5,
                py: 0.7,
                minWidth: { sm: 170, lg: 220 },
                justifyContent: 'space-between',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'text.primary',
                },
              }}
            >
              <Typography variant="body2" color="inherit" sx={{ fontSize: '0.82rem' }}>
                Buscar música...
              </Typography>
              <Box
                component="kbd"
                className="mtl-mono"
                sx={{
                  ml: 2,
                  px: 0.7,
                  py: 0.15,
                  fontSize: '0.68rem',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                }}
              >
                Ctrl K
              </Box>
            </Button>

            <IconButton
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
              sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'text.primary' }}
            >
              <SearchIcon />
            </IconButton>

            {isAuthenticated && (
              <>
                <Tooltip title="Notificações">
                  <IconButton
                    onClick={handleNotificationsClick}
                    aria-label="Notificações"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    <Badge badgeContent={unreadCount} color="error" max={9}>
                      <NotificationsNoneIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* Avatar + Menu Desktop */}
                <Button
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    alignItems: 'center',
                    gap: 1,
                    pl: 0.75,
                    pr: 1,
                    py: 0.5,
                    borderRadius: 99,
                    border: '1px solid',
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Avatar
                    src={user?.avatar_url}
                    alt={user?.username}
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 110 }} noWrap>
                    {user?.username}
                  </Typography>
                  <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Button>

                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{ sx: { mt: 1, minWidth: 210, borderRadius: 2.5 } }}
                >
                  <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }}>
                    <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
                    Meu Perfil
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); navigate('/settings?tab=appearance'); }}>
                    <ListItemIcon><PaletteOutlinedIcon fontSize="small" /></ListItemIcon>
                    Paletas de Cores
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); navigate('/settings'); }}>
                    <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
                    Configurações
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                    Sair
                  </MenuItem>
                </Menu>
              </>
            )}

            {!isAuthenticated && (
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                <Button component={Link} to="/login" color="inherit" size="small">
                  Entrar
                </Button>
                <Button component={Link} to="/register" variant="contained" size="small">
                  Criar conta
                </Button>
              </Box>
            )}

            {/* Menu Hambúrguer Mobile */}
            <IconButton
              color="inherit"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <Badge variant="dot" color="error" invisible={unreadCount === 0}>
                <MenuIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer Mobile */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280, bgcolor: 'background.paper', p: 2 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            MyTrackList
          </Typography>
          <IconButton onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {isAuthenticated && user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
            <Avatar src={user.avatar_url} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
              {user.username?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>{user.name || user.username}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>@{user.username}</Typography>
            </Box>
          </Box>
        )}

        <List disablePadding>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={isActive(item.to)}
              onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 1.5 }} />

        {isAuthenticated ? (
          <List disablePadding>
            <ListItemButton onClick={() => { setMobileOpen(false); handleNotificationsClick(); }} sx={{ borderRadius: 2 }}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsNoneIcon fontSize="small" />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Notificações" />
            </ListItemButton>
            <ListItemButton component={Link} to="/settings?tab=appearance" onClick={() => setMobileOpen(false)} sx={{ borderRadius: 2 }}>
              <ListItemIcon><PaletteOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Paletas de Cores" />
            </ListItemButton>
            <ListItemButton component={Link} to="/settings" onClick={() => setMobileOpen(false)} sx={{ borderRadius: 2 }}>
              <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Configurações" />
            </ListItemButton>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItemButton>
          </List>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button component={Link} to="/login" variant="outlined" fullWidth onClick={() => setMobileOpen(false)}>
              Entrar
            </Button>
            <Button component={Link} to="/register" variant="contained" fullWidth onClick={() => setMobileOpen(false)}>
              Criar conta
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Overlay de Pesquisa Global */}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            pt: { xs: 2, md: 9 },
          },
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            m: 0,
            width: '100%',
          },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 850, mx: 'auto' }}>
          <SearchBar onSearch={(q) => { setSearchOpen(false); navigate(`/search?q=${encodeURIComponent(q)}`); }} />
        </Box>
      </Dialog>

      {/* Dialog de Notificações */}
      <Dialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Notificações</Typography>
            <IconButton size="small" onClick={() => setNotificationsOpen(false)} aria-label="Fechar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nenhuma notificação por enquanto.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto' }}>
              {notifications.map((notif) => (
                <Box
                  key={notif.id}
                  component={Link}
                  to={`/user/${notif.actor_username}`}
                  onClick={() => setNotificationsOpen(false)}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Avatar src={notif.actor_avatar} sx={{ width: 40, height: 40 }}>
                    {notif.actor_username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">
                      <Box component="span" fontWeight={700}>{notif.actor_username}</Box>{' '}
                      {notif.type === 'like' ? 'curtiu sua avaliação.' : 'começou a te seguir.'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(notif.created_at)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
}

export default Navbar;
