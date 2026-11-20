import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Avatar, Button, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Paper, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { getFollowers, getFollowing, followUser, unfollowUser } from '../../services/social';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSocial({
  userId,
  isOwner = false,
  followRequests = [],
  onAcceptRequest,
  onRejectRequest,
  reqBusyId = null,
}) {
  const { user: currentUser } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  // Armazena quem o utilizador logado segue ou solicitou seguir
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());
  const [myRequestedIds, setMyRequestedIds] = useState(new Set());

  useEffect(() => {
    if (!userId) return;

    const fetchSocialData = async () => {
      setLoading(true);
      try {
        const [followersData, followingData] = await Promise.all([
          getFollowers(userId),
          getFollowing(userId)
        ]);
        setFollowers(followersData || []);
        setFollowing(followingData || []);

        if (currentUser) {
          const myFollowingData = await getFollowing(currentUser.id || currentUser.userId);
          const ids = new Set(myFollowingData.map(f => f.id));
          setMyFollowingIds(ids);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialData();
  }, [userId, currentUser]);

  const handleToggleFollow = async (targetId) => {
    const isFollowing = myFollowingIds.has(targetId);
    const isRequested = myRequestedIds.has(targetId);
    try {
      if (isFollowing || isRequested) {
        await unfollowUser(targetId);
        setMyFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetId);
          return newSet;
        });
        setMyRequestedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetId);
          return newSet;
        });
      } else {
        const res = await followUser(targetId);
        if (res?.status === 'requested') {
          setMyRequestedIds(prev => {
            const newSet = new Set(prev);
            newSet.add(targetId);
            return newSet;
          });
        } else {
          setMyFollowingIds(prev => {
            const newSet = new Set(prev);
            newSet.add(targetId);
            return newSet;
          });
        }
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir', err);
    }
  };

  const renderUserList = (title, usersList, isFollowersList) => (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>{title} ({usersList.length})</Typography>
      {usersList.length === 0 ? (
        <Typography color="text.secondary">Nenhum utilizador encontrado.</Typography>
      ) : (
        <List>
          {usersList.map(u => {
            const otherUser = u;
            if (!otherUser) return null;
            
            const amIFollowing = myFollowingIds.has(otherUser.id);
            const amIRequested = myRequestedIds.has(otherUser.id);
            const isMe = currentUser && (currentUser.id === otherUser.id || currentUser.userId === otherUser.id);

            return (
              <ListItem key={u.id} sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 2, boxShadow: 1 }}>
                <ListItemAvatar>
                  <Avatar component={Link} to={`/user/${otherUser.username}`} src={otherUser.user_avatar} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', textDecoration: 'none' }}>
                    {otherUser.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={<Link to={`/user/${otherUser.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>{otherUser.username}</Link>} 
                  secondary={`${otherUser.name || ''}`}
                />
                {!isMe && currentUser && (
                  <Button 
                    variant={amIFollowing || amIRequested ? "outlined" : "contained"} 
                    size="small"
                    onClick={() => handleToggleFollow(otherUser.id)}
                  >
                    {amIFollowing ? 'Seguindo' : amIRequested ? 'Solicitado' : 'Seguir'}
                  </Button>
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {isOwner && followRequests.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Solicitações pendentes ({followRequests.length})
          </Typography>
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {followRequests.map((req) => (
              <Paper
                key={req.requester_id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  component={Link}
                  to={`/user/${req.username}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}
                >
                  <Avatar src={req.avatar_url} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    {req.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{req.username}</Typography>
                    {req.name && <Typography variant="caption" color="text.secondary">{req.name}</Typography>}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={reqBusyId === req.requester_id}
                    startIcon={<CheckIcon fontSize="small" />}
                    onClick={async () => {
                      if (onAcceptRequest) {
                        await onAcceptRequest(req.requester_id);
                        setFollowers((prev) => [
                          {
                            id: req.requester_id,
                            username: req.username,
                            name: req.name,
                            user_avatar: req.avatar_url,
                          },
                          ...prev.filter((f) => f.id !== req.requester_id),
                        ]);
                      }
                    }}
                  >
                    Aceitar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    disabled={reqBusyId === req.requester_id}
                    startIcon={<CloseIcon fontSize="small" />}
                    onClick={() => onRejectRequest && onRejectRequest(req.requester_id)}
                  >
                    Recusar
                  </Button>
                </Box>
              </Paper>
            ))}
          </List>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          {renderUserList('Seguindo', following, false)}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {renderUserList('Seguidores', followers, true)}
        </Grid>
      </Grid>
    </Box>
  );
}
