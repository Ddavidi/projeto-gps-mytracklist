import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getUserReviewsByUsername } from '../services/reviews';
import { getUserFavorites } from '../services/favorites';
import { followUser, unfollowUser, checkFollowStatus, getFollowers, getFollowing } from '../services/social';
import { getMultipleTrackDetails, getMultipleAlbumDetails, getMultipleArtistDetails } from '../services/spotify';
import { Container, Box, Paper, CircularProgress, Alert, Typography, Button, Divider, alpha } from '@mui/material';
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
import ListenLaterModal from '../components/profile/ListenLaterModal';
import TasteMatchCard from '../components/TasteMatchCard';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';

function PublicProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();

  const [targetUser, setTargetUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [itemDetails, setItemDetails] = useState({});
  const [favoriteDetails, setFavoriteDetails] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLoading, setSocialLoading] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const [listenLaterOpen, setListenLaterOpen] = useState(false);

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
        setReviewsCount(response.reviewsCount ?? (response.reviews?.length || 0));

        if (response.user) {
          const [myFavs, followers, following, followStatus] = await Promise.all([
            response.isPrivateLocked ? Promise.resolve([]) : getUserFavorites(response.user.id).catch(() => []),
            getFollowers(response.user.id).catch(() => []),
            getFollowing(response.user.id).catch(() => []),
            currentUser ? checkFollowStatus(response.user.id) : Promise.resolve({ isFollowing: false, isRequested: false }),
          ]);

          setFavorites(myFavs || []);
          setFollowersCount((followers || []).length);
          setFollowingCount((following || []).length);
          setIsFollowing(Boolean(followStatus?.isFollowing));
          setIsRequested(Boolean(followStatus?.isRequested));

          if (!response.isPrivateLocked) {
            if (response.reviews?.length > 0) await enrichDataWithSpotify(response.reviews, false);
            if (myFavs?.length > 0) await enrichDataWithSpotify(myFavs, true);
          }
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
        setIsRequested(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else if (isRequested) {
        await unfollowUser(targetUser.id);
        setIsRequested(false);
      } else {
        const res = await followUser(targetUser.id);
        if (res?.status === 'requested') {
          setIsRequested(true);
        } else {
          setIsFollowing(true);
          setIsRequested(false);
          setFollowersCount((prev) => prev + 1);
        }
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

  const isPrivateAndHidden = Boolean(targetUser?.is_private) && !isOwnProfile && !isFollowing;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }} className="mtl-reveal">
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', pb: 5 }}>
        <ProfileHeader
          user={targetUser}
          isOwner={Boolean(isOwnProfile)}
          reviewsCount={reviewsCount}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          isRequested={isRequested}
          isPrivateLocked={isPrivateAndHidden}
          socialLoading={socialLoading}
          onFollowToggle={handleToggleFollow}
          onOpenListenLater={() => setListenLaterOpen(true)}
        />

        <Box sx={{ px: { xs: 2.5, sm: 4 } }}>
          {isPrivateAndHidden ? (
            <>
              <Divider sx={{ mb: 4 }} />
              <Box sx={{ textAlign: 'center', py: { xs: 5, sm: 7 }, px: 2 }}>
                <Box
                  sx={{
                    width: 82,
                    height: 82,
                    borderRadius: '50%',
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                    border: '2px solid',
                    borderColor: 'divider',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2.5,
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 38, color: 'text.secondary' }} />
                </Box>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Este perfil é privado
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '44ch', mx: 'auto', mb: 3 }}>
                  {isRequested
                    ? `Sua solicitação para seguir @${targetUser.username} foi enviada. Assim que for aprovada, você poderá ver avaliações, tier lists e atividades.`
                    : `Envie uma solicitação para seguir @${targetUser.username} e ver suas avaliações, tier lists, diário musical e atividades.`}
                </Typography>
                <Button
                  variant={isRequested ? 'outlined' : 'contained'}
                  color={isRequested ? 'inherit' : 'primary'}
                  disabled={socialLoading}
                  startIcon={isRequested ? <ScheduleOutlinedIcon /> : <PersonAddAlt1OutlinedIcon />}
                  onClick={handleToggleFollow}
                  sx={{ borderRadius: 2.5, px: 3.5, py: 1.1, fontWeight: 700 }}
                >
                  {isRequested ? 'Solicitação enviada (Cancelar)' : 'Solicitar para seguir'}
                </Button>
              </Box>
            </>
          ) : (
            <>
              {!isOwnProfile && targetUser && (
                <TasteMatchCard targetUserId={targetUser.id} targetUsername={targetUser.username} />
              )}
              <ProfileTabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} />
              {renderTabContent()}
            </>
          )}
        </Box>
      </Paper>

      <ListenLaterModal
        open={listenLaterOpen}
        onClose={() => setListenLaterOpen(false)}
        userId={targetUser?.id}
        isOwner={false}
      />
    </Container>
  );
}

export default PublicProfilePage;
