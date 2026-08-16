import React, { useRef, useEffect } from "react";
import { Box, IconButton, Tooltip, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { usePlayer } from "../context/PlayerContext";

export default function GlobalPlayer() {
  const { currentContext, isVisible, closePlayer } = usePlayer();
  const iframeRef = useRef(null);

  // Ao mudar de musica/contexto, tenta forcar o autoplay via postMessage
  useEffect(() => {
    if (!isVisible || !currentContext) return;
    const timer = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage({ command: "play" }, "*");
      } catch (_) {}
    }, 800);
    return () => clearTimeout(timer);
  }, [currentContext?.id, isVisible]);

  if (!isVisible || !currentContext) return null;

  const { type, id, externalUrl } = currentContext;
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0&autoplay=1`;
  const spotifyUrl = externalUrl || `https://open.spotify.com/${type}/${id}`;

  return (
    <Fade in={isVisible}>
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          bgcolor: "#000",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Iframe ocupa todo o espaco disponivel */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <iframe
            ref={iframeRef}
            key={`${type}-${id}`}
            src={embedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ display: "block" }}
            title="Spotify Player"
          />
        </Box>

        {/* Acoes fora do iframe */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.25,
            bgcolor: "#121212",
            height: 80,
            px: 0.5,
            flexShrink: 0,
          }}
        >
          <Tooltip title="Abrir no Spotify" placement="left">
            <IconButton
              component="a"
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ color: "#1ED760", "&:hover": { bgcolor: "rgba(30,215,96,0.15)" }, p: 0.75 }}
            >
              <OpenInNewIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar" placement="left">
            <IconButton
              onClick={closePlayer}
              size="small"
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#fff" }, p: 0.75 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Fade>
  );
}
