import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import NativeAppBridge from './components/NativeAppBridge';
import LoginPage from './pages/LoginPage';
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
import { PlayerProvider } from './context/PlayerContext';
import GlobalPlayer from './components/GlobalPlayer';

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
        <Box component="main" sx={{ flex: 1, pb: { xs: 'calc(150px + env(safe-area-inset-bottom))', md: '108px' } }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/lists/:id" element={<ListDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
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
        </Box>
        <GlobalPlayer />
        <MobileBottomNav onOpenSearch={() => setMobileSearchOpen(true)} />
      </Box>
    </PlayerProvider>
  );
}

export default App;
