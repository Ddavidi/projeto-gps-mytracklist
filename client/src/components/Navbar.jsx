import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Avatar, Dialog, IconButton, MenuItem, ListItemIcon, Divider } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CircleIcon from '@mui/icons-material/Circle';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Drawer, List, ListItemText, ListItemButton } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import api from '../services/api';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      api.get('/users/me/notifications').then(res => {
        setNotifications(res.data || []);
      }).catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationsClick = async () => {
    setNotificationsOpen(true);
    handleDropdownClose();
    if (unreadCount > 0) {
      try {
        await api.put('/users/me/notifications/read');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch(err) {
        console.error(err);
      }
    }
  };
  
  const handleDropdownOpen = () => {
    setIsHovering(true);
  };

  const handleDropdownClose = () => {
    setIsHovering(false);
  };

  const handleLogout = async () => {
    setIsHovering(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="sticky" sx={{ bgcolor: '#121212', color: '#fff', boxShadow: '0px 4px 20px rgba(0,0,0,0.5)', zIndex: 1200 }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
          {/* Lado Esquerdo - Logo e Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography
              variant="h5"
              component={Link}
              to="/"
              sx={{
                fontWeight: 900,
                color: 'primary.main',
                textDecoration: 'none',
                letterSpacing: '-0.5px'
              }}
            >
              MyTrackList
            </Typography>

            {/* Links para Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button component={Link} to="/" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Início
              </Button>
              {isAuthenticated && (
                <>
                  <Button component={Link} to="/profile" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>Profile</Button>
                  <Button component={Link} to="/profile?tab=music" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>Music List</Button>
                  <Button component={Link} to="/profile?tab=album" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>Album List</Button>
                  <Button component={Link} to="/profile?tab=artist" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>Artist List</Button>
                  <Button component={Link} to="/search-users" sx={{ color: '#fff', fontWeight: 600, opacity: 0.8, '&:hover': { opacity: 1 } }}>
                    Comunidade
                  </Button>
                </>
              )}
              {isAuthenticated && user?.is_admin && (
                <Button component={Link} to="/admin" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                  Admin
                </Button>
              )}
            </Box>
          </Box>

          {/* Lado Direito - Pesquisa e Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <IconButton onClick={() => setSearchOpen(true)} sx={{ color: '#fff' }}>
              <SearchIcon />
            </IconButton>

            {/* Menu Hambúrguer (Mobile) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton color="inherit" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            </Box>

            {isAuthenticated ? (
              <Box 
                onMouseEnter={handleDropdownOpen} 
                onMouseLeave={handleDropdownClose}
                sx={{ position: 'relative', py: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, cursor: 'pointer' }}
              >
                <Avatar 
                  src={user?.avatar_url} 
                  alt={user?.username} 
                  variant="square"
                  sx={{ width: 40, height: 40, borderRadius: 1.5 }} 
                />
                
                {unreadCount > 0 && (
                  <Box sx={{ 
                    bgcolor: 'error.main', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 20, 
                    height: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {unreadCount}
                  </Box>
                )}
                
                <ArrowDropDownIcon sx={{ color: '#fff', opacity: 0.7 }} />

                {/* Dropdown Menu Customizado no Hover */}
                {isHovering && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      width: 220,
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      boxShadow: '0px 12px 32px rgba(0,0,0,0.3)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      zIndex: 1400
                    }}
                  >
                    <MenuItem onClick={() => { handleDropdownClose(); navigate('/profile'); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                      <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                      <Typography variant="body2" fontWeight="bold">Perfil</Typography>
                    </MenuItem>
                    <MenuItem onClick={handleNotificationsClick} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                      <ListItemIcon>
                        {unreadCount > 0 ? (
                          <Box sx={{ position: 'relative' }}>
                            <NotificationsIcon fontSize="small" />
                            <CircleIcon sx={{ position: 'absolute', top: -2, right: -2, fontSize: 10, color: 'error.main' }} />
                          </Box>
                        ) : (
                          <NotificationsIcon fontSize="small" />
                        )}
                      </ListItemIcon>
                      <Typography variant="body2" fontWeight="bold">Notificações</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => { handleDropdownClose(); navigate('/settings'); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                      <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                      <Typography variant="body2" fontWeight="bold">Configurações</Typography>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main', '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                      <ListItemIcon><ExitToAppIcon fontSize="small" color="inherit" /></ListItemIcon>
                      <Typography variant="body2" fontWeight="bold">Sair</Typography>
                    </MenuItem>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button component={Link} to="/login" sx={{ color: '#fff', fontWeight: 600 }}>
                  Login
                </Button>
                <Button component={Link} to="/register" variant="contained" color="primary" sx={{ borderRadius: 2 }}>
                  Registrar
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer Mobile */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 250, bgcolor: 'background.default' } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
            Menu
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            <ListItemButton component={Link} to="/" onClick={() => setMobileOpen(false)}>
              <ListItemText primary="Início" />
            </ListItemButton>
            {isAuthenticated && (
              <>
                <ListItemButton component={Link} to="/profile" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Profile" />
                </ListItemButton>
                <ListItemButton component={Link} to="/profile?tab=music" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Music List" />
                </ListItemButton>
                <ListItemButton component={Link} to="/profile?tab=album" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Album List" />
                </ListItemButton>
                <ListItemButton component={Link} to="/profile?tab=artist" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Artist List" />
                </ListItemButton>
                <ListItemButton component={Link} to="/search-users" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Comunidade" />
                </ListItemButton>
              </>
            )}
            {isAuthenticated && user?.is_admin && (
              <ListItemButton component={Link} to="/admin" onClick={() => setMobileOpen(false)}>
                <ListItemText primary="Admin" />
              </ListItemButton>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            {isAuthenticated ? (
              <>
                <ListItemButton component={Link} to="/profile" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Perfil" />
                </ListItemButton>
                <ListItemButton onClick={() => { setMobileOpen(false); handleNotificationsClick(); }}>
                  <ListItemIcon>
                    {unreadCount > 0 ? (
                      <Box sx={{ position: 'relative' }}>
                        <NotificationsIcon fontSize="small" />
                        <CircleIcon sx={{ position: 'absolute', top: -2, right: -2, fontSize: 10, color: 'error.main' }} />
                      </Box>
                    ) : (
                      <NotificationsIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary="Notificações" />
                </ListItemButton>
                <ListItemButton component={Link} to="/settings" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Configurações" />
                </ListItemButton>
                <ListItemButton onClick={() => { setMobileOpen(false); handleLogout(); }}>
                  <ListItemIcon><ExitToAppIcon fontSize="small" color="error" /></ListItemIcon>
                  <ListItemText primary="Sair" sx={{ color: 'error.main' }} />
                </ListItemButton>
              </>
            ) : (
              <>
                <ListItemButton component={Link} to="/login" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Login" />
                </ListItemButton>
                <ListItemButton component={Link} to="/register" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Registrar" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
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
            pt: { xs: 2, md: 10 }
          }
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            m: 0,
            width: '100%'
          }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 850 }}>
          <SearchBar onSearch={(q) => { setSearchOpen(false); navigate(`/search?q=${encodeURIComponent(q)}`); }} />
        </Box>
      </Dialog>

      {/* Popover de Notificações */}
      <Dialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, bgcolor: 'background.paper', p: 2 }
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2}>Notificações</Typography>
        <Divider sx={{ mb: 2 }} />
        {notifications.length === 0 ? (
          <Typography color="text.secondary">Nenhuma notificação encontrada.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map(notif => (
              <Box key={notif.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar src={notif.actor_avatar} sx={{ width: 40, height: 40 }} />
                <Box>
                  <Typography variant="body2">
                    <Box component="span" fontWeight="bold">{notif.actor_username}</Box>{' '}
                    {notif.type === 'like' ? 'curtiu sua avaliação.' : 'começou a te seguir.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button onClick={() => setNotificationsOpen(false)}>Fechar</Button>
        </Box>
      </Dialog>
    </>
  );
}

export default Navbar;
