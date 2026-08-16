import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import { usePlayer } from "../context/PlayerContext";

/**
 * Botao de play reutilizavel.
 * @param {{ id, name, artist?, imageUrl, externalUrl?, type? }} track
 *   type pode ser "track" (padrao) | "playlist" | "album"
 */
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
    : isAlbum ? "Tocar album no player"
    : "Ouvir no player";

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={handleClick}
        size={size}
        sx={{
          bgcolor: filled
            ? isActive ? "primary.main" : "rgba(255,255,255,0.15)"
            : "transparent",
          color: filled
            ? isActive ? "#000" : "#fff"
            : isActive ? "primary.main" : "inherit",
          "&:hover": {
            bgcolor: filled ? "primary.main" : "rgba(0,0,0,0.06)",
            color: filled ? "#000" : "primary.main",
            transform: "scale(1.08)",
          },
          transition: "all 0.15s",
          ...sx,
        }}
      >
        <Icon fontSize={size === "small" ? "small" : "medium"} />
      </IconButton>
    </Tooltip>
  );
}
