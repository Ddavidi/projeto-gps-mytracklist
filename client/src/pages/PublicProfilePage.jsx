import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getUserReviewsByUsername } from '../services/reviews';
import { getUserFavorites } from '../services/favorites';
import { followUser, unfollowUser, checkIsFollowing, getFollowers, getFollowing } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { Container, Box, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ProfileOverview from '../components/profile/ProfileOverview';
import ProfileMediaGrid from '../components/profile/ProfileMediaGrid';
import ProfileSocial from '../components/profile/ProfileSocial';
import ProfileStatus from '../components/profile/ProfileStatus';
import ProfilePlaylists from '../components/profile/ProfilePlaylists';
import ProfileSpotifyStats from '../components/profile/ProfileSpotifyStats';
import ProfileDiaryWrapped from '../components/profile/ProfileDiaryWrapped';
import ProfileListsAndBacklog from '../components/profile/ProfileListsAndBacklog';
import TasteMatchCard from '../components/TasteMatchCard';

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

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLoading, setSocialLoading] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);

  const enrichDataWithSpotify = useCallback(async (items, isFavorites = false) => {
    const trackIds = [...new Set(items.filter((i) => i.item_type === 'track').map((i) => i.item_id))];
    const albumIds = [...new Set(items.filter((i) => i.item_type === 'album').map((i) => i.item_id))];
    const artistIds = [...new Set(items.filter((i) => i.item_type === 'artist').map((i) => i.item_id))];

    const [tracks, albums, artists] = await Promise.all([
      getMultipleTrackDetails(trackIds).catch(() => ({})),
      getMultipleAlbumDetails(albumIds).catch(() => ({})),
      getMultipleArtistDetails(artistIds).catch(() => ({})),
    ]);

    const details = { ...tracks, ...albums, ...artists };
    if (isFavorites) setFavoriteDetails(details);
    else setItemDetails(details);
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
            currentUser ? checkIsFollowing(response.user.id) : Promise.resolve(false),
          ]);

          setFavorites(myFavs || []);
          setFollowersCount((followers || []).length);
          setFollowingCount((following || []).length);
          setIsFollowing(followingStatus);

          if (response.reviews?.length > 0) await enrichDataWithSpotify(response.reviews, false);
          if (myFavs?.length > 0) await enrichDataWithSpotify(myFavs, true);
        }
      } catch (err) {
        if (err.response?.status === 404) setError('Utilizador não encontrado.');
        else setError('Falha ao carregar perfil.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, enrichDataWithSpotify, currentUser]);

  const handleToggleFollow = async () => {
    if (!targetUser || socialLoading) return;
    setSocialLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(targetUser.id);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await followUser(targetUser.id);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
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

  const isOwnProfile = currentUser && targetUser && (currentUser.id === targetUser.id || currentUser.userId === targetUser.id);

  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <ProfileOverview
            reviews={reviews}
            favorites={favorites}
            favoriteDetails={favoriteDetails}
            itemDetails={itemDetails}
            profileUser={targetUser}
          />
        );
      case 1:
        return <ProfileMediaGrid type="track" reviews={reviews} itemDetails={itemDetails} />;
      case 2:
        return <ProfileMediaGrid type="album" reviews={reviews} itemDetails={itemDetails} />;
      case 3:
        return <ProfileMediaGrid type="artist" reviews={reviews} itemDetails={itemDetails} />;
      case 4:
        return <ProfileDiaryWrapped userId={targetUser?.id} />;
      case 5:
        return <ProfileListsAndBacklog userId={targetUser?.id} isOwner={isOwnProfile} />;
      case 6:
        return <ProfileSocial userId={targetUser?.id} />;
      case 7:
        return <ProfileStatus reviews={reviews} profileUser={targetUser} />;
      case 8:
        return <ProfilePlaylists userId={targetUser?.id} isOwner={isOwnProfile} />;
      case 9:
        return <ProfileSpotifyStats userId={targetUser?.id} isOwner={isOwnProfile} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }} className="mtl-reveal">
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', pb: 5 }}>
        <ProfileHeader
          user={targetUser}
          isOwner={false}
          reviewsCount={reviews.length}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          onFollowToggle={handleToggleFollow}
        />

        <Box sx={{ px: { xs: 2.5, sm: 4 } }}>
          {!isOwnProfile && targetUser && (
            <TasteMatchCard targetUserId={targetUser.id} targetUsername={targetUser.username} />
          )}
          <ProfileTabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} />
          {renderTabContent()}
        </Box>
      </Paper>
    </Container>
  );
}

export default PublicProfilePage;
