import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyReviews } from '../services/reviews';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { getUserFavorites } from '../services/favorites';
import { getFollowers, getFollowing } from '../services/social';
import { useAuth } from '../context/AuthContext';
import { Container, Box, Paper, CircularProgress, Alert } from '@mui/material';

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
import EditProfileModal from '../components/profile/EditProfileModal';

function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [favoriteDetails, setFavoriteDetails] = useState({});

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const getInitialTab = useCallback(() => {
    const tab = searchParams.get('tab');
    if (tab === 'music') return 1;
    if (tab === 'album') return 2;
    if (tab === 'artist') return 3;
    if (tab === 'diary') return 4;
    if (tab === 'lists') return 5;
    if (tab === 'social') return 6;
    if (tab === 'stats') return 7;
    if (tab === 'playlists') return 8;
    if (tab === 'spotify_stats') return 9;
    return 0;
  }, [searchParams]);

  const [tabIndex, setTabIndex] = useState(getInitialTab);

  useEffect(() => {
    setTabIndex(getInitialTab());
  }, [getInitialTab]);

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

  const fetchData = useCallback(async (background = false) => {
    if (!user) return;
    const uid = user.id || user.userId;
    try {
      if (!background) setLoading(true);
      setError('');

      const [myReviews, myFavs, followers, following] = await Promise.all([
        getMyReviews(),
        getUserFavorites(uid),
        getFollowers(uid),
        getFollowing(uid),
      ]);

      setReviews(myReviews || []);
      setFavorites(myFavs || []);
      setFollowersCount((followers || []).length);
      setFollowingCount((following || []).length);

      if (myReviews?.length > 0) await enrichDataWithSpotify(myReviews, false);
      if (myFavs?.length > 0) await enrichDataWithSpotify(myFavs, true);
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
    const map = { 1: 'music', 2: 'album', 3: 'artist', 4: 'diary', 5: 'lists', 6: 'social', 7: 'stats', 8: 'playlists', 9: 'spotify_stats' };
    setSearchParams(map[newValue] ? { tab: map[newValue] } : {});
  };

  const uid = user?.id || user?.userId;

  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <ProfileOverview
            reviews={reviews}
            favorites={favorites}
            favoriteDetails={favoriteDetails}
            itemDetails={itemDetails}
            profileUser={user}
            isOwner
          />
        );
      case 1:
        return <ProfileMediaGrid type="track" reviews={reviews} itemDetails={itemDetails} />;
      case 2:
        return <ProfileMediaGrid type="album" reviews={reviews} itemDetails={itemDetails} />;
      case 3:
        return <ProfileMediaGrid type="artist" reviews={reviews} itemDetails={itemDetails} />;
      case 4:
        return <ProfileDiaryWrapped userId={uid} />;
      case 5:
        return <ProfileListsAndBacklog userId={uid} isOwner />;
      case 6:
        return <ProfileSocial userId={uid} />;
      case 7:
        return <ProfileStatus reviews={reviews} profileUser={user} />;
      case 8:
        return <ProfilePlaylists userId={uid} reviews={reviews} onReviewUpdate={() => fetchData(true)} isOwner />;
      case 9:
        return <ProfileSpotifyStats userId={uid} isOwner />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }} className="mtl-reveal">
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', pb: 5 }}>
        <ProfileHeader
          user={user}
          isOwner
          reviewsCount={reviews.length}
          followersCount={followersCount}
          followingCount={followingCount}
          onEditClick={() => setEditModalOpen(true)}
        />

        <Box sx={{ px: { xs: 2.5, sm: 4 } }}>
          <ProfileTabs value={tabIndex} onChange={handleTabChange} />
          {renderTabContent()}
        </Box>
      </Paper>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        userProfile={{ id: uid, ...user }}
        onProfileUpdate={async () => {
          await refreshUser();
          fetchData(true);
        }}
      />
    </Container>
  );
}

export default ProfilePage;
