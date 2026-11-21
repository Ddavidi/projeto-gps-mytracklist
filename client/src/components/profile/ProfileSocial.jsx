import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { getFollowers, getFollowing, followUser, unfollowUser } from '../../services/social';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSocial({
  userId,
  isOwner = false,
  initialSubTab = 'followers',
  followRequests = [],
  onAcceptRequest,
  onRejectRequest,
  reqBusyId = null,
}) {
  const { user: currentUser } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState(initialSubTab); // 'followers' | 'following'
  const [searchQuery, setSearchQuery] = useState('');

  // Armazena quem o utilizador logado segue ou solicitou seguir
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());
  const [myRequestedIds, setMyRequestedIds] = useState(new Set());

  useEffect(() => {
    setActiveFilter(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (!userId) return;

    const fetchSocialData = async () => {
      setLoading(true);
      try {
        const [followersData, followingData] = await Promise.all([
          getFollowers(userId),
          getFollowing(userId),
        ]);
        setFollowers(followersData || []);
        setFollowing(followingData || []);

        if (currentUser) {
          const myFollowingData = await getFollowing(currentUser.id || currentUser.userId);
          const ids = new Set((myFollowingData || []).map((f) => f.id));
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
        setMyFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        setMyRequestedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        const res = await followUser(targetId);
        if (res?.status === 'requested') {
          setMyRequestedIds((prev) => {
            const next = new Set(prev);
            next.add(targetId);
            return next;
          });
        } else {
          setMyFollowingIds((prev) => {
            const next = new Set(prev);
            next.add(targetId);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir', err);
    }
  };

  const activeList = activeFilter === 'followers' ? followers : following;

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Solicitações pendentes (apenas dono) */}
      {isOwner && followRequests.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
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
                  <Avatar
                    src={req.avatar_url || req.user_avatar}
                    sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}
                  >
                    {req.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      @{req.username}
                    </Typography>
                    {req.name && (
                      <Typography variant="caption" color="text.secondary">
                        {req.name}
                      </Typography>
                    )}
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
                    onClick={() => onRejectRequest && onRejectRequest(req.requester_id)}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Recusar
                  </Button>
                </Box>
              </Paper>
            ))}
          </List>
        </Box>
      )}

      {/* Barra de Filtro (Seguidores / Seguindo) + Busca estilo Instagram */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 2.5,
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={activeFilter}
          onChange={(_e, val) => {
            if (val) setActiveFilter(val);
          }}
        >
          <ToggleButton value="followers" sx={{ px: 2.5, textTransform: 'none', fontWeight: 700 }}>
            Seguidores ({followers.length})
          </ToggleButton>
          <ToggleButton value="following" sx={{ px: 2.5, textTransform: 'none', fontWeight: 700 }}>
            Seguindo ({following.length})
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          size="small"
          placeholder={
            activeFilter === 'followers'
              ? 'Buscar nos seguidores...'
              : 'Buscar em quem segue...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* Lista Filtrada */}
      {filteredList.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <PeopleOutlineIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" variant="body2">
            {searchQuery
              ? `Nenhum usuário encontrado para "${searchQuery}".`
              : activeFilter === 'followers'
              ? 'Nenhum seguidor ainda.'
              : 'Não está seguindo ninguém ainda.'}
          </Typography>
        </Paper>
      ) : (
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredList.map((u) => {
            if (!u) return null;
            const amIFollowing = myFollowingIds.has(u.id);
            const amIRequested = myRequestedIds.has(u.id);
            const isMe =
              currentUser && (currentUser.id === u.id || currentUser.userId === u.id);

            return (
              <ListItem
                key={u.id}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.025),
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  px: 2,
                  py: 1.25,
                }}
                secondaryAction={
                  !isMe && currentUser ? (
                    <Button
                      variant={amIFollowing || amIRequested ? 'outlined' : 'contained'}
                      color={amIRequested ? 'inherit' : 'primary'}
                      size="small"
                      onClick={() => handleToggleFollow(u.id)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      {amIFollowing ? 'Seguindo' : amIRequested ? 'Solicitado' : 'Seguir'}
                    </Button>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar
                    component={Link}
                    to={`/user/${u.username}`}
                    src={u.user_avatar || u.avatar_url}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {u.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      component={Link}
                      to={`/user/${u.username}`}
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{
                        textDecoration: 'none',
                        color: 'text.primary',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      @{u.username}
                    </Typography>
                  }
                  secondary={u.name || ''}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}
