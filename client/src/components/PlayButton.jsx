import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import { usePlayer } from "../context/PlayerContext";

export default function PlayButton({ track, size = "medium", filled = false, sx = {} }) {
  const { currentContext, playTrack, playPlaylist, playAlbum } = usePlayer();

  const isActive = currentContext?.id === track?.id;
  const isPlaylist = track?.type === "playlist";
  const isAlbum = track?.type === "album";

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!track?.id) return;
    if (isPlaylist) playPlaylist(track);
    else if (isAlbum) playAlbum(track);
    else playTrack(track);
  };

  const Icon = isPlaylist ? QueueMusicIcon : PlayArrowIcon;
  const tooltip = isActive
    ? "Tocando..."
    : isPlaylist ? "Tocar playlist no player"
    : isAlbum ? "Tocar álbum no player"
    : "Ouvir no player";

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={handleClick}
        size={size}
        sx={{
          bgcolor: filled
            ? "primary.main"
            : "transparent",
          color: filled
            ? "primary.contrastText"
            : isActive ? "primary.main" : "inherit",
          boxShadow: filled ? "0 6px 18px rgba(0,0,0,0.35)" : "none",
          "&:hover": {
            bgcolor: filled ? "primary.main" : "action.hover",
            color: filled ? "primary.contrastText" : "primary.main",
            transform: "scale(1.08)",
          },
          transition: "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.18s ease",
          ...sx,
        }}
      >
        <Icon fontSize={size === "small" ? "small" : "medium"} />
      </IconButton>
    </Tooltip>
  );
}
