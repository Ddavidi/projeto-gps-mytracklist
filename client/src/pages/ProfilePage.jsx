import React, { useState, useEffect, useCallback } from 'react';
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
  const [tabIndex, setTabIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
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