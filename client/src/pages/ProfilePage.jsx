import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyReviews } from '../services/reviews';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { getUserFavorites } from '../services/favorites';
import { getFollowers, getFollowing } from '../services/social';
import { useAuth } from '../context/AuthContext';
import { Container, Box, CircularProgress, Alert } from '@mui/material';

import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ProfileOverview from '../components/profile/ProfileOverview';
import ProfileMediaGrid from '../components/profile/ProfileMediaGrid';
import ProfileSocial from '../components/profile/ProfileSocial';
import ProfileStatus from '../components/profile/ProfileStatus';
import ProfilePlaylists from '../components/profile/ProfilePlaylists';
import ProfileSpotifyStats from '../components/profile/ProfileSpotifyStats';
import EditProfileModal from '../components/profile/EditProfileModal';

function ProfilePage() {
  const { user, login } = useAuth(); // We need a way to refresh the user from backend if possible, or just use the token.
  
  // Data states
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [favoriteDetails, setFavoriteDetails] = useState({});
  
  // Social stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI states
  const [searchParams, setSearchParams] = useSearchParams();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    if (tab === 'music') return 1;
    if (tab === 'album') return 2;
    if (tab === 'artist') return 3;
    if (tab === 'playlists') return 6;
    if (tab === 'spotify_stats') return 7;
    return 0;
  };
  const [tabIndex, setTabIndex] = useState(getInitialTab());

  // Watch for URL changes if user clicks Navbar links while already on Profile
  useEffect(() => {
    setTabIndex(getInitialTab());
  }, [searchParams]);

  const enrichDataWithSpotify = useCallback(async (items, isFavorites = false) => {
    const trackIds = [...new Set(items.filter(i => i.item_type === 'track').map(i => i.item_id))];
    const albumIds = [...new Set(items.filter(i => i.item_type === 'album').map(i => i.item_id))];
    const artistIds = [...new Set(items.filter(i => i.item_type === 'artist').map(i => i.item_id))];

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds),
      getMultipleAlbumDetails(albumIds),
      getMultipleArtistDetails(artistIds),
    ]);

    const details = { ...tracks, ...albums, ...artists };
    
    if (isFavorites) {
      setFavoriteDetails(details);
    } else {
      setItemDetails(details);
    }
  }, []);

  const fetchData = useCallback(async (background = false) => {
    if (!user) return;
    try {
      if (!background) setLoading(true);
      setError('');

      const [myReviews, myFavs, followers, following] = await Promise.all([
        getMyReviews(),
        getUserFavorites(user.id || user.userId),
        getFollowers(user.id || user.userId),
        getFollowing(user.id || user.userId)
      ]);

      setReviews(myReviews);
      setFavorites(myFavs);
      setFollowersCount(followers.length);
      setFollowingCount(following.length);

      if (myReviews.length > 0) {
        await enrichDataWithSpotify(myReviews, false);
      }
      if (myFavs.length > 0) {
        await enrichDataWithSpotify(myFavs, true);
      }
    } catch (err) {
      setError('Falha ao carregar o seu perfil.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, enrichDataWithSpotify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    if (newValue === 0) setSearchParams({});
    if (newValue === 1) setSearchParams({ tab: 'music' });
    if (newValue === 2) setSearchParams({ tab: 'album' });
    if (newValue === 3) setSearchParams({ tab: 'artist' });
    if (newValue === 6) setSearchParams({ tab: 'playlists' });
    if (newValue === 7) setSearchParams({ tab: 'spotify_stats' });
  };

  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return <ProfileOverview reviews={reviews} favorites={favorites} favoriteDetails={favoriteDetails} itemDetails={itemDetails} />;
      case 1:
        return <ProfileMediaGrid type="track" reviews={reviews} itemDetails={itemDetails} />;
      case 2:
        return <ProfileMediaGrid type="album" reviews={reviews} itemDetails={itemDetails} />;
      case 3:
        return <ProfileMediaGrid type="artist" reviews={reviews} itemDetails={itemDetails} />;
      case 4:
        return <ProfileSocial userId={user?.id || user?.userId} />;
      case 5:
        return <ProfileStatus reviews={reviews} />;
      case 6:
        return <ProfilePlaylists userId={user?.id || user?.userId} reviews={reviews} onReviewUpdate={() => fetchData(true)} />;
      case 7:
        return <ProfileSpotifyStats userId={user?.id || user?.userId} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, overflow: 'hidden', mt: 4, pb: 4 }}>
        <ProfileHeader 
          user={user} 
          isOwner={true}
          followersCount={followersCount}
          followingCount={followingCount}
          onEditClick={() => setEditModalOpen(true)}
        />
        
        <Box sx={{ px: 4 }}>
          <ProfileTabs value={tabIndex} onChange={handleTabChange} />
          {renderTabContent()}
        </Box>
      </Box>

      {/* Modal de Edição */}
      <EditProfileModal 
        open={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        userProfile={{ id: user?.id || user?.userId, ...user }}
        onProfileUpdate={() => {
          // Apenas recarrega os dados pra pegar as novas fotos se estiverem no context, 
          // mas na real o ideal seria atualizar o token. Como workaround recarregamos a pag ou atualizamos state local.
          window.location.reload(); 
        }}
      />
    </Container>
  );
}

export default ProfilePage;