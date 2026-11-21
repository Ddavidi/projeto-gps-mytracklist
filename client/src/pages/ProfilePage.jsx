import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyReviews } from '../services/reviews';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { getUserFavorites } from '../services/favorites';
import { getFollowers, getFollowing, getFollowRequests, acceptFollowRequest, rejectFollowRequest } from '../services/social';
import { useAuth } from '../context/AuthContext';
import { Container, Box, Paper, CircularProgress, Alert, Typography, Avatar, Button, Chip, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

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
import ListenLaterModal from '../components/profile/ListenLaterModal';
import EditProfileModal from '../components/profile/EditProfileModal';

function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [favoriteDetails, setFavoriteDetails] = useState({});

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followRequests, setFollowRequests] = useState([]);
  const [reqBusyId, setReqBusyId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [listenLaterOpen, setListenLaterOpen] = useState(false);
  const [socialSubTab, setSocialSubTab] = useState('followers');

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

      const [myReviews, myFavs, followers, following, requests] = await Promise.all([
        getMyReviews(),
        getUserFavorites(uid),
        getFollowers(uid),
        getFollowing(uid),
        getFollowRequests().catch(() => []),
      ]);

      setReviews(myReviews || []);
      setFavorites(myFavs || []);
      setFollowersCount((followers || []).length);
      setFollowingCount((following || []).length);
      setFollowRequests(requests || []);

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

  // Atualização automática em segundo plano (curtidas, comentários, solicitações)
  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 20000);
    const onFocus = () => fetchData(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, fetchData]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  const handleAcceptRequest = async (requesterId) => {
    setReqBusyId(requesterId);
    try {
      await acceptFollowRequest(requesterId);
      setFollowRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
      setFollowersCount((prev) => prev + 1);
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err);
    } finally {
      setReqBusyId(null);
    }
  };

  const handleRejectRequest = async (requesterId) => {
    setReqBusyId(requesterId);
    try {
      await rejectFollowRequest(requesterId);
      setFollowRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err);
    } finally {
      setReqBusyId(null);
    }
  };

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
            onFavoritesChanged={() => fetchData(true)}
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
        return (
          <ProfileSocial
            userId={uid}
            isOwner
            initialSubTab={socialSubTab}
            followRequests={followRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            reqBusyId={reqBusyId}
          />
        );
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
          onOpenListenLater={() => setListenLaterOpen(true)}
          onFollowersClick={() => {
            setSocialSubTab('followers');
            handleTabChange(null, 6);
          }}
          onFollowingClick={() => {
            setSocialSubTab('following');
            handleTabChange(null, 6);
          }}
        />

        <Box sx={{ px: { xs: 2.5, sm: 4 } }}>
          {followRequests.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonAddAlt1OutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Solicitações para seguir você
                  </Typography>
                  <Chip size="small" label={followRequests.length} color="primary" sx={{ fontWeight: 700, height: 22 }} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Ao aprovar, a pessoa passa a seguir você e ver seu perfil privado.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {followRequests.map((req) => (
                  <Box
                    key={req.requester_id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box
                      component={Link}
                      to={`/user/${req.username}`}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
                    >
                      <Avatar src={req.avatar_url} sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
                        {req.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {req.name || req.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          @{req.username}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={reqBusyId === req.requester_id}
                        startIcon={<CheckIcon fontSize="small" />}
                        onClick={() => handleAcceptRequest(req.requester_id)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={reqBusyId === req.requester_id}
                        startIcon={<CloseIcon fontSize="small" />}
                        onClick={() => handleRejectRequest(req.requester_id)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Recusar
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          <ProfileTabs value={tabIndex} onChange={handleTabChange} />
          {renderTabContent()}
        </Box>
      </Paper>

      <ListenLaterModal
        open={listenLaterOpen}
        onClose={() => setListenLaterOpen(false)}
        userId={uid}
        isOwner={true}
      />

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
