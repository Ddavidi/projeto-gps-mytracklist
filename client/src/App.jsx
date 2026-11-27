import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import NativeAppBridge from './components/NativeAppBridge';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MobileAuthBridgePage from './pages/MobileAuthBridgePage';
import SearchResultsPage from './pages/SearchResultsPage';
import TrackDetailsPage from './pages/TrackDetailsPage';
import AlbumDetailsPage from './pages/AlbumDetailsPage';
import ArtistDetailsPage from './pages/ArtistDetailsPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import UserSearchPage from './pages/UserSearchPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import ListDetailsPage from './pages/ListDetailsPage';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import GlobalPlayer from './components/GlobalPlayer';
import { BOTTOM_NAV_HEIGHT, PLAYER_HEIGHT, PLAYER_MOBILE_GAP, isBottomNavHidden } from './utils/layout';

/**
 * Espaço reservado no fim da página para que a navegação inferior e o player
 * nunca cubram o conteúdo. Só reserva espaço do player quando ele está aberto.
 */
function useMainBottomPadding() {
  const { isVisible } = usePlayer();
  const { pathname } = useLocation();
  const navSpace = isBottomNavHidden(pathname) ? 0 : BOTTOM_NAV_HEIGHT;
  const playerSpaceMobile = isVisible ? PLAYER_HEIGHT + PLAYER_MOBILE_GAP : 0;
  return {
    xs: `calc(${navSpace + playerSpaceMobile + 24}px + env(safe-area-inset-bottom))`,
    md: `${(isVisible ? PLAYER_HEIGHT : 0) + 28}px`,
  };
}

function MainContent({ children }) {
  const pb = useMainBottomPadding();
  return (
    <Box component="main" sx={{ flex: 1, pb }}>
      {children}
    </Box>
  );
}

function App() {
  const { loading } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <PlayerProvider>
      <NativeAppBridge />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <Navbar
          externalSearchOpen={mobileSearchOpen}
          onExternalSearchClose={() => setMobileSearchOpen(false)}
        />
        <MainContent>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/lists/:id" element={<ListDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/mobile-auth" element={<MobileAuthBridgePage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/track/:id" element={<ProtectedRoute><TrackDetailsPage /></ProtectedRoute>} />
            <Route path="/music/:id" element={<ProtectedRoute><TrackDetailsPage /></ProtectedRoute>} />
            <Route path="/album/:id" element={<ProtectedRoute><AlbumDetailsPage /></ProtectedRoute>} />
            <Route path="/artist/:id" element={<ProtectedRoute><ArtistDetailsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/user/:username" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
            <Route path="/search-users" element={<ProtectedRoute><UserSearchPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </MainContent>
        <GlobalPlayer />
        <MobileBottomNav onOpenSearch={() => setMobileSearchOpen(true)} />
      </Box>
    </PlayerProvider>
  );
}

export default App;
