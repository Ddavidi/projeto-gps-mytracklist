import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { usePlayer } from "../context/PlayerContext";

/**
 * Botao de play reutilizavel para qualquer lugar do site.
 * @param {{ id, name, artist, imageUrl, previewUrl, externalUrl }} track
 * @param {string} size - "small" | "medium" | "large"
 * @param {boolean} filled - se true, usa fundo colorido
 */
export default function PlayButton({ track, size = "medium", filled = false, sx = {} }) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();

  const isCurrentTrack = currentTrack?.id === track?.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  const hasPreview = !!track?.previewUrl;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    playTrack(track);
  };

  const handleOpenSpotify = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = track?.externalUrl || `https://open.spotify.com/track/${track?.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!hasPreview) {
    return (
      <Tooltip title="Abrir no Spotify">
        <IconButton
          onClick={handleOpenSpotify}
          size={size}
          sx={{
            bgcolor: filled ? "rgba(30, 215, 96, 0.15)" : "transparent",
            color: filled ? "#1ED760" : "rgba(30, 215, 96, 0.7)",
            "&:hover": {
              bgcolor: "rgba(30, 215, 96, 0.25)",
              color: "#1ED760",
              transform: "scale(1.1)",
            },
            transition: "all 0.15s",
            ...sx,
          }}
        >
          <OpenInNewIcon fontSize={size === "small" ? "small" : "medium"} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={isCurrentlyPlaying ? "Pausar" : "Ouvir preview"}>
      <IconButton
        onClick={handleClick}
        size={size}
        sx={{
          bgcolor: filled
            ? isCurrentlyPlaying ? "primary.main" : "rgba(255,255,255,0.15)"
            : "transparent",
          color: filled
            ? isCurrentlyPlaying ? "#000" : "#fff"
            : isCurrentlyPlaying ? "primary.main" : "inherit",
          "&:hover": {
            bgcolor: filled ? "primary.main" : "rgba(0,0,0,0.04)",
            color: filled ? "#000" : "primary.main",
            transform: "scale(1.1)",
          },
          transition: "all 0.15s",
          ...sx,
        }}
      >
        {isCurrentlyPlaying ? (
          <PauseIcon fontSize={size === "small" ? "small" : "medium"} />
        ) : (
          <PlayArrowIcon fontSize={size === "small" ? "small" : "medium"} />
        )}
      </IconButton>
    </Tooltip>
  );
}
