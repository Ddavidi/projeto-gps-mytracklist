import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Avatar, Button, CircularProgress, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';
import { getFollowers, getFollowing, followUser, unfollowUser } from '../../services/social';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSocial({ userId }) {
  const { user: currentUser } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  // Armazena quem o utilizador logado segue (para mostrar Seguir/Deixar de Seguir na lista)
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());

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
          const ids = new Set(myFollowingData.map(f => f.followingId));
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
    try {
      if (isFollowing) {
        await unfollowUser(targetId);
        setMyFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetId);
          return newSet;
        });
      } else {
        await followUser(targetId);
        setMyFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.add(targetId);
          return newSet;
        });
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
            // Se for lista de seguidores, o outro utilizador é follower. Se for seguindo, é following.
            const otherUser = isFollowersList ? u.follower : u.following;
            if (!otherUser) return null;
            
            const amIFollowing = myFollowingIds.has(otherUser.id);
            const isMe = currentUser && (currentUser.id === otherUser.id || currentUser.userId === otherUser.id);

            return (
              <ListItem key={u.id} sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 2, boxShadow: 1 }}>
                <ListItemAvatar>
                  <Avatar component={Link} to={`/profile/${otherUser.username}`} sx={{ bgcolor: '#1db954', textDecoration: 'none' }}>
                    {otherUser.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={<Link to={`/profile/${otherUser.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>{otherUser.username}</Link>} 
                  secondary={`${otherUser.name || ''}`}
                />
                {!isMe && currentUser && (
                  <Button 
                    variant={amIFollowing ? "outlined" : "contained"} 
                    size="small"
                    onClick={() => handleToggleFollow(otherUser.id)}
                  >
                    {amIFollowing ? 'Seguindo' : 'Seguir'}
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
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        {renderUserList('Seguindo', following, false)}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        {renderUserList('Seguidores', followers, true)}
      </Grid>
    </Grid>
  );
}
