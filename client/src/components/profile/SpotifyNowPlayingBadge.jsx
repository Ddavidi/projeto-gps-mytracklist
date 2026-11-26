import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import api from '../../services/api';

function formatRelativeTime(iso) {
  if (!iso) return 'recentemente';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'recentemente';
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

export default function SpotifyNowPlayingBadge({ userId, spotifyConnected, hidden = false }) {
  const [playback, setPlayback] = useState(null);

  useEffect(() => {
    if (!userId || !spotifyConnected || hidden) {
      setPlayback(null);
      return;
    }

    let cancelled = false;
    const fetchStatus = () => {
      api
        .get(`/spotify/user/${userId}/now-playing`)
        .then((res) => {
          if (!cancelled && res.data?.track) {
            setPlayback(res.data);
          } else if (!cancelled) {
            setPlayback(null);
          }
        })
        .catch(() => {
          if (!cancelled) setPlayback(null);
        });
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId, spotifyConnected, hidden]);

  if (!playback?.track) return null;

  const isPlaying = playback.status === 'playing';
  const isPaused = playback.status === 'paused';
  const { track } = playback;

  return (
    <Box
      component={Link}
      to={`/music/${track.id}`}
      sx={{
        mt: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        maxWidth: '100%',
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: (theme) =>
          isPlaying
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.text.primary, 0.04),
        border: '1px solid',
        borderColor: isPlaying ? 'primary.main' : 'divider',
        transition: 'border-color 0.2s ease, transform 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Avatar
        variant="rounded"
        src={track.imageUrl}
        alt={track.name}
        sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 1.5 }}
      />

      <Box sx={{ minWidth: 0, maxWidth: { xs: 210, sm: 320 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          {isPlaying ? (
            <GraphicEqIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          ) : isPaused ? (
            <PauseCircleOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          ) : (
            <HistoryIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          )}
          <Typography
            variant="caption"
            fontWeight={700}
            color={isPlaying ? 'primary.main' : 'text.secondary'}
            sx={{ fontSize: '0.68rem', letterSpacing: '0.02em' }}
            noWrap
          >
            {isPlaying
              ? 'Ouvindo agora no Spotify'
              : isPaused
              ? 'Pausado no Spotify'
              : `Ouviu por último · ${formatRelativeTime(playback.playedAt)}`}
          </Typography>
        </Box>

        <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.25 }}>
          {track.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ lineHeight: 1.2 }}>
          {track.artist}
        </Typography>
      </Box>
    </Box>
  );
}
