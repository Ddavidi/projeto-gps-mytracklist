import React, { useState } from "react";
import {
  Box, IconButton, Typography, Slider, Avatar, Tooltip, Fade, LinearProgress
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { usePlayer } from "../context/PlayerContext";
import { Link } from "react-router-dom";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function GlobalPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, volume, isVisible, togglePlayPause, seek, changeVolume, closePlayer } = usePlayer();
  const [showVolume, setShowVolume] = useState(false);

  if (!isVisible || !currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Fade in={isVisible}>
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          bgcolor: "rgba(18, 18, 18, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Barra de progresso no topo do player */}
        <Box
          sx={{ position: "absolute", top: 0, left: 0, right: 0, cursor: "pointer", height: 3, "&:hover": { height: 5, transition: "height 0.15s" }, transition: "height 0.15s" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio * duration);
          }}
        >
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: "100%",
              borderRadius: 0,
              bgcolor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 0 },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", px: { xs: 1.5, md: 3 }, py: 1.5, gap: { xs: 1.5, md: 3 } }}>
          {/* Info da música (esquerda) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                variant="square"
                src={currentTrack.imageUrl}
                sx={{ width: 48, height: 48, borderRadius: 1, boxShadow: 2 }}
              />
              {isPlaying && (
                <Box
                  sx={{
                    position: "absolute", inset: 0, borderRadius: 1,
                    bgcolor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <GraphicEqIcon sx={{ fontSize: 20, color: "primary.main" }} />
                </Box>
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight="bold"
                noWrap
                sx={{ color: "#fff", lineHeight: 1.2 }}
              >
                {currentTrack.name}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)" noWrap display="block">
                {currentTrack.artist}
              </Typography>
            </Box>

            <Tooltip title="Ver detalhes">
              <IconButton
                component={Link}
                to={`/track/${currentTrack.id}`}
                size="small"
                sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "primary.main" }, ml: 0.5, display: { xs: "none", sm: "flex" } }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Controles (centro) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                onClick={togglePlayPause}
                sx={{
                  bgcolor: "primary.main",
                  color: "#000",
                  width: 40,
                  height: 40,
                  "&:hover": { bgcolor: "primary.light", transform: "scale(1.05)" },
                  transition: "all 0.15s"
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: 140, sm: 200, md: 280 } }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", minWidth: 32, textAlign: "right" }}>
                {formatTime(currentTime)}
              </Typography>
              <Slider
                size="small"
                value={currentTime}
                min={0}
                max={duration || 30}
                onChange={(_, v) => seek(v)}
                sx={{
                  color: "primary.main",
                  height: 3,
                  padding: "8px 0",
                  "& .MuiSlider-thumb": {
                    width: 10, height: 10,
                    transition: "opacity 0.2s",
                    opacity: 0,
                    "&:hover": { opacity: 1 },
                  },
                  "&:hover .MuiSlider-thumb": { opacity: 1 },
                  "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              />
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", minWidth: 32 }}>
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          {/* Volume + Fechar (direita) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, justifyContent: "flex-end" }}>
            {/* Chip "Preview" */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                bgcolor: "rgba(255,255,255,0.07)",
                borderRadius: 1,
                px: 1,
                py: 0.3,
              }}
            >
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: 1 }}>
                PREVIEW 30s
              </Typography>
            </Box>

            {/* Controle de volume */}
            <Box
              sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1, position: "relative" }}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <IconButton
                size="small"
                sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#fff" } }}
              >
                {volume === 0 ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
              </IconButton>
              <Fade in={showVolume}>
                <Slider
                  size="small"
                  value={volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(_, v) => changeVolume(v)}
                  sx={{
                    color: "#fff",
                    width: 80,
                    height: 3,
                    "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                />
              </Fade>
            </Box>

            <IconButton
              onClick={closePlayer}
              size="small"
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#fff" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}
