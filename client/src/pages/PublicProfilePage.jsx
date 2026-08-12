import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getUserReviewsByUsername } from '../services/reviews';
import { getUserFavorites } from '../services/favorites';
import { followUser, unfollowUser, checkIsFollowing, getFollowers, getFollowing } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { Container, Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ProfileOverview from '../components/profile/ProfileOverview';
import ProfileMediaGrid from '../components/profile/ProfileMediaGrid';
import ProfileSocial from '../components/profile/ProfileSocial';
import ProfileStatus from '../components/profile/ProfileStatus';
import ProfilePlaylists from '../components/profile/ProfilePlaylists';
import ProfileSpotifyStats from '../components/profile/ProfileSpotifyStats';

function PublicProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  
  const [targetUser, setTargetUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [favoriteDetails, setFavoriteDetails] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados Sociais
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLoading, setSocialLoading] = useState(false);

  // Aba ativa
  const [tabIndex, setTabIndex] = useState(0);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getUserReviewsByUsername(username);
        setTargetUser(response.user);
        setReviews(response.reviews || []);

        if (response.user) {
          const [myFavs, followers, following, followingStatus] = await Promise.all([
            getUserFavorites(response.user.id),
            getFollowers(response.user.id),
            getFollowing(response.user.id),
            currentUser ? checkIsFollowing(response.user.id) : Promise.resolve(false)
          ]);

          setFavorites(myFavs || []);
          setFollowersCount(followers.length);
          setFollowingCount(following.length);
          setIsFollowing(followingStatus);

          if (response.reviews && response.reviews.length > 0) {
            await enrichDataWithSpotify(response.reviews, false);
          }
          if (myFavs && myFavs.length > 0) {
            await enrichDataWithSpotify(myFavs, true);
          }
        }

      } catch (err) {
        if (err.response?.status === 404) {
          setError('Utilizador não encontrado.');
        } else {
          setError('Falha ao carregar perfil.');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, enrichDataWithSpotify, currentUser]);

  const handleToggleFollow = async () => {
    if (!targetUser) return;
    setSocialLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(targetUser.id);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await followUser(targetUser.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

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
        return <ProfileSocial userId={targetUser?.id} />;
      case 5:
        return <ProfileStatus reviews={reviews} />;
      case 6:
        return <ProfilePlaylists userId={targetUser?.id} />;
      case 7:
        return <ProfileSpotifyStats userId={targetUser?.id} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, overflow: 'hidden', mt: 4, pb: 4 }}>
        <ProfileHeader 
          user={targetUser} 
          isOwner={false}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          onFollowToggle={handleToggleFollow}
        />
        
        <Box sx={{ px: 4 }}>
          <ProfileTabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} />
          {renderTabContent()}
        </Box>
      </Box>
    </Container>
  );
}

export default PublicProfilePage;