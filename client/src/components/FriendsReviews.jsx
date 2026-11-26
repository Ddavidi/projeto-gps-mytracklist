import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriendsReviews } from '../services/social';
import { getCommunityItemReviews } from '../services/reviews';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Rating,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Paper,
  alpha,
} from '@mui/material';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import StarIcon from '@mui/icons-material/Star';
import { formatDateShort } from '../utils/date';
import { getRatingMeta } from '../utils/ratingColor';

function FriendsReviews({ itemType, itemId }) {
  const { isAuthenticated } = useAuth();
  const [scope, setScope] = useState('community'); // 'community' | 'friends'
  const [communityReviews, setCommunityReviews] = useState([]);
  const [friendsReviews, setFriendsReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId || !itemType) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getCommunityItemReviews(itemType, itemId),
      isAuthenticated ? getFriendsReviews(itemType, itemId) : Promise.resolve([]),
    ])
      .then(([communityData, friendsData]) => {
        if (cancelled) return;
        setCommunityReviews(communityData || []);
        setFriendsReviews(friendsData || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, itemType, itemId]);

  const displayedReviews = scope === 'friends' ? friendsReviews : communityReviews;

  return (
    <Box sx={{ mt: 2, mb: 3 }}>
      {/* Filtro Comunidade vs Amigos */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={scope}
          onChange={(_e, next) => next && setScope(next)}
          color="primary"
        >
          <ToggleButton value="community" sx={{ textTransform: 'none', fontWeight: 700, gap: 0.75, px: 2 }}>
            <PublicOutlinedIcon sx={{ fontSize: 16 }} />
            Comunidade ({communityReviews.length})
          </ToggleButton>
          {isAuthenticated && (
            <ToggleButton value="friends" sx={{ textTransform: 'none', fontWeight: 700, gap: 0.75, px: 2 }}>
              <PeopleOutlineIcon sx={{ fontSize: 16 }} />
              Amigos ({friendsReviews.length})
            </ToggleButton>
          )}
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary">
          {scope === 'friends'
            ? 'Apenas pessoas que você segue'
            : 'Todas as avaliações públicas do MyTrackList'}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : displayedReviews.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {scope === 'friends'
              ? 'Nenhum amigo que você segue avaliou este item ainda.'
              : 'Ainda não há avaliações da comunidade para este item. Seja o primeiro a avaliar!'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayedReviews.map((review) => {
            const avatarSrc = review.author_avatar || review.user_avatar || '';
            const username = review.author_username || review.user_username || 'usuario';
            const displayName = review.author_name || username;

            return (
              <Card key={review.id} variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
                <CardHeader
                  avatar={
                    <Avatar
                      component={Link}
                      to={`/user/${username}`}
                      src={avatarSrc}
                      alt={username}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {username.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flexWrap: 'wrap' }}>
                      <Typography
                        component={Link}
                        to={`/user/${username}`}
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        {displayName}
                      </Typography>
                      {review.author_name && review.author_name !== username && (
                        <Typography
                          component={Link}
                          to={`/user/${username}`}
                          variant="caption"
                          color="text.secondary"
                          sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                          @{username}
                        </Typography>
                      )}
                      {review.is_friend && scope === 'community' && (
                        <Chip
                          size="small"
                          label="Seguindo"
                          variant="outlined"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      )}
                      {review.visibility === 'close_friends' && (
                        <Chip
                          size="small"
                          icon={<StarIcon sx={{ fontSize: 12, color: '#22c55e !important' }} />}
                          label="Close Friends"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: alpha('#16a34a', 0.16),
                            color: '#22c55e',
                          }}
                        />
                      )}
                    </Box>
                  }
                  subheader={formatDateShort(review.createdAt)}
                  action={(() => {
                    const { color: ratingColor, isGold } = getRatingMeta(review.rating);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mr: 1, gap: 1 }}>
                        <Rating
                          value={Number(review.rating) / 2}
                          precision={0.5}
                          readOnly
                          size="small"
                          sx={{
                            '& .MuiRating-iconFilled': {
                              color: ratingColor,
                              ...(isGold && { filter: 'drop-shadow(0 0 5px rgba(245, 197, 24, 0.55))' }),
                            },
                          }}
                        />
                        <Box
                          component="span"
                          className="mtl-mono"
                          sx={{
                            px: 0.9,
                            py: 0.2,
                            borderRadius: 1,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            bgcolor: alpha(ratingColor, isGold ? 0.2 : 0.15),
                            color: ratingColor,
                            border: '1px solid',
                            borderColor: alpha(ratingColor, isGold ? 0.55 : 0.3),
                          }}
                        >
                          {review.rating}/10
                        </Box>
                      </Box>
                    );
                  })()}
                  sx={{ pb: review.review_text ? 0 : 2 }}
                />
                {review.review_text && (
                  <CardContent sx={{ pt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {review.review_text}
                    </Typography>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default FriendsReviews;
