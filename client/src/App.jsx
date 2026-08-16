import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, CircularProgress } from '@mui/material';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchResultsPage from './pages/SearchResultsPage';
import TrackDetailsPage from './pages/TrackDetailsPage';
import AlbumDetailsPage from './pages/AlbumDetailsPage';
import ArtistDetailsPage from './pages/ArtistDetailsPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import UserSearchPage from './pages/UserSearchPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      <Container>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/track/:id" element={<ProtectedRoute><TrackDetailsPage /></ProtectedRoute>} />
        <Route path="/album/:id" element={<ProtectedRoute><AlbumDetailsPage /></ProtectedRoute>} />
        <Route path="/artist/:id" element={<ProtectedRoute><ArtistDetailsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/user/:username" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
        <Route path="/search-users" element={<ProtectedRoute><UserSearchPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </Container>
    </>
  );
}

export default App;