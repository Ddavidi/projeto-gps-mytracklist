import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { usePlayer } from "../context/PlayerContext";

/**
 * Botao de play reutilizavel para qualquer lugar do site.
 * Abre o Spotify Embed no player global do rodape.
 * Se nao tiver id, abre o link externo no Spotify.
 * @param {{ id, name, artist, imageUrl, previewUrl, externalUrl }} track
 * @param {string} size - "small" | "medium" | "large"
 * @param {boolean} filled - se true, usa fundo colorido
 */
export default function PlayButton({ track, size = "medium", filled = false, sx = {} }) {
  const { currentTrack, playTrack } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track?.id;

  const handlePlay = (e) => {
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

  // Se nao tem ID nao conseguimos nem embedar
  if (!track?.id) {
    return (
      <Tooltip title="Abrir no Spotify">
        <IconButton
          onClick={handleOpenSpotify}
          size={size}
          sx={{
            color: "rgba(30, 215, 96, 0.7)",
            "&:hover": { color: "#1ED760", transform: "scale(1.1)" },
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
    <Tooltip title={isCurrentTrack ? "Tocando no player..." : "Ouvir no player"}>
      <IconButton
        onClick={handlePlay}
        size={size}
        sx={{
          bgcolor: filled
            ? isCurrentTrack ? "primary.main" : "rgba(255,255,255,0.15)"
            : "transparent",
          color: filled
            ? isCurrentTrack ? "#000" : "#fff"
            : isCurrentTrack ? "primary.main" : "inherit",
          "&:hover": {
            bgcolor: filled ? "primary.main" : "rgba(0,0,0,0.04)",
            color: filled ? "#000" : "primary.main",
            transform: "scale(1.1)",
          },
          transition: "all 0.15s",
          ...sx,
        }}
      >
        <PlayArrowIcon fontSize={size === "small" ? "small" : "medium"} />
      </IconButton>
    </Tooltip>
  );
}
