import React from "react";
import { Box, IconButton, Typography, Avatar, Tooltip, Fade, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { usePlayer } from "../context/PlayerContext";
import { Link } from "react-router-dom";

export default function GlobalPlayer() {
  const { currentTrack, isVisible, closePlayer } = usePlayer();

  if (!isVisible || !currentTrack) return null;

  const embedUrl = `https://open.spotify.com/embed/track/${currentTrack.id}?utm_source=generator&theme=0`;
  const spotifyUrl = currentTrack.externalUrl || `https://open.spotify.com/track/${currentTrack.id}`;

  return (
    <Fade in={isVisible}>
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          bgcolor: "rgba(18, 18, 18, 0.98)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: { xs: 1, sm: 2 },
          py: 1,
        }}
      >
        {/* Capa + info — visivel em telas maiores */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5, minWidth: 0, width: 200, flexShrink: 0 }}>
          <Avatar
            variant="square"
            src={currentTrack.imageUrl}
            sx={{ width: 56, height: 56, borderRadius: 1, boxShadow: 2 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={Link}
              to={`/track/${currentTrack.id}`}
              variant="body2"
              fontWeight="bold"
              noWrap
              sx={{ color: "#fff", textDecoration: "none", "&:hover": { color: "primary.main" }, display: "block", lineHeight: 1.3 }}
            >
              {currentTrack.name}
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" noWrap display="block">
              {currentTrack.artist}
            </Typography>
          </Box>
        </Box>

        {/* Iframe do Spotify — ocupa o espaco central */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <iframe
            src={embedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: "12px", display: "block" }}
            title={`Spotify player - ${currentTrack.name}`}
          />
        </Box>

        {/* Acoes: abrir no Spotify + fechar */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Abrir no Spotify">
            <IconButton
              component="a"
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ color: "#1ED760", "&:hover": { bgcolor: "rgba(30,215,96,0.15)" } }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar player">
            <IconButton
              onClick={closePlayer}
              size="small"
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#fff" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Fade>
  );
}
