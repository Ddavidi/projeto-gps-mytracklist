import React, { useState, useEffect, useRef } from "react";
import {
  Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  List, ListItemButton, ListItemAvatar, Avatar, ListItemText, CircularProgress,
  Typography, Snackbar, Alert, Divider, alpha, Menu, MenuItem, ListItemIcon,
  useMediaQuery
} from "@mui/material";
import { useLocation } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { BOTTOM_NAV_HEIGHT, PLAYER_HEIGHT, PLAYER_MOBILE_GAP, isBottomNavHidden } from "../utils/layout";

export default function GlobalPlayer() {
  const { currentContext, isVisible, closePlayer } = usePlayer();
  const { isAuthenticated } = useAuth();

  const embedRef = useRef(null);
  const [controller, setController] = useState(null);

  const [saved, setSaved] = useState(false);
  const [savingLoad, setSavingLoad] = useState(false);

  const [playlistModal, setPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState(null);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const showSnack = (message, severity = "success") => setSnack({ open: true, message, severity });

  const isTrack = currentContext?.type === "track";

  // No celular o player vira um "mini player" flutuante: acima da navegação inferior
  // (ou no rodapé, em telas sem ela) e com as ações secundárias num menu.
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const isCompact = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const { pathname } = useLocation();
  const navOffset = isBottomNavHidden(pathname) ? 0 : BOTTOM_NAV_HEIGHT;
  const [moreAnchor, setMoreAnchor] = useState(null);
  const closeMore = () => setMoreAnchor(null);

  useEffect(() => {
    if (!isVisible) setMoreAnchor(null);
  }, [isVisible]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      const element = embedRef.current;
      if (!element) return;

      IFrameAPI.createController(
        element,
        { width: '100%', height: '80', uri: '', theme: '0' },
        (ctrl) => setController(ctrl)
      );
    };

    return () => {
      if (script.parentNode) document.body.removeChild(script);
      delete window.onSpotifyIframeApiReady;
    };
  }, []);

  useEffect(() => {
    if (controller) {
      if (currentContext) {
        const uri = `spotify:${currentContext.type}:${currentContext.id}`;
        controller.loadUri(uri);
        setTimeout(() => {
          controller.play();
        }, 500);
      } else {
        controller.pause();
      }
    }
  }, [currentContext, controller]);

  useEffect(() => {
    if (!isAuthenticated || !isTrack || !currentContext?.id) { setSaved(false); return; }
    api.get(`/spotify/me/saved-tracks/contains?id=${currentContext.id}`)
      .then((r) => setSaved(Boolean(r.data.saved)))
      .catch(() => setSaved(false));
  }, [currentContext?.id, isAuthenticated, isTrack]);

  const handleToggleSave = async () => {
    if (!isAuthenticated) { showSnack("Conecte sua conta Spotify para salvar músicas.", "warning"); return; }
    if (!isTrack) return;
    setSavingLoad(true);
    try {
      if (saved) {
        await api.delete("/spotify/me/saved-tracks", { data: { trackId: currentContext.id } });
        setSaved(false);
        showSnack("Removido das Músicas Curtidas");
      } else {
        await api.put("/spotify/me/saved-tracks", { trackId: currentContext.id });
        setSaved(true);
        showSnack("Salvo nas Músicas Curtidas");
      }
    } catch (e) {
      showSnack(e.response?.data?.error || "Erro ao salvar música.", "error");
    } finally {
      setSavingLoad(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!isAuthenticated) { showSnack("Conecte sua conta Spotify para usar a fila.", "warning"); return; }
    if (!isTrack) return;
    try {
      await api.post("/spotify/me/queue", { trackId: currentContext.id });
      showSnack("Adicionado à fila do Spotify");
    } catch (e) {
      showSnack(e.response?.data?.error || "Abra o Spotify em algum dispositivo primeiro.", "error");
    }
  };

  const handleOpenPlaylistModal = async () => {
    if (!isAuthenticated) { showSnack("Conecte sua conta Spotify para adicionar a playlists.", "warning"); return; }
    if (!isTrack) return;
    setPlaylistModal(true);
    if (playlists.length === 0) {
      setPlaylistsLoading(true);
      try {
        const r = await api.get("/spotify/me/playlists");
        setPlaylists(r.data || []);
      } catch (e) {
        showSnack(e.response?.data?.error || "Erro ao carregar playlists.", "error");
      } finally {
        setPlaylistsLoading(false);
      }
    }
  };

  const handleAddToPlaylist = async (playlistId, playlistName) => {
    setAddingToPlaylist(playlistId);
    try {
      await api.post(`/spotify/playlists/${playlistId}/tracks`, { trackId: currentContext.id });
      showSnack(`Adicionado a "${playlistName}"`);
      setPlaylistModal(false);
    } catch (e) {
      showSnack(e.response?.data?.error || "Erro ao adicionar à playlist.", "error");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const spotifyUrl = currentContext?.externalUrl || `https://open.spotify.com/${currentContext?.type}/${currentContext?.id}`;

  return (
    <>
      <Box
        component="section"
        aria-label="Player de música"
        aria-hidden={!isVisible}
        sx={{
          position: "fixed",
          zIndex: 1300,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.97),
          backdropFilter: "blur(16px)",
          transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease, visibility 0s linear",
          ...(isMobile
            ? {
                left: PLAYER_MOBILE_GAP,
                right: PLAYER_MOBILE_GAP,
                bottom: `calc(${navOffset + PLAYER_MOBILE_GAP}px + env(safe-area-inset-bottom))`,
                borderRadius: "14px",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
              }
            : {
                left: 0,
                right: 0,
                bottom: 0,
                borderTop: "1px solid",
                borderColor: "divider",
                boxShadow: "0 -10px 32px rgba(0,0,0,0.45)",
              }),
          // Fechado: sai totalmente da tela (antes ficava uma faixa vazia visível no celular).
          ...(isVisible
            ? { transform: "translateY(0)", opacity: 1, visibility: "visible" }
            : {
                transform: "translateY(calc(100% + 120px))",
                opacity: 0,
                visibility: "hidden",
                pointerEvents: "none",
                transitionDelay: "0s, 0s, 0.32s",
              }),
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, height: PLAYER_HEIGHT }}>
          <div ref={embedRef}></div>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: isCompact ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px solid",
            borderColor: "divider",
            height: PLAYER_HEIGHT,
            px: isCompact ? 0.25 : { sm: 1, md: 2 },
            gap: isCompact ? 0 : 0.5,
            flexShrink: 0,
          }}
        >
          {!isCompact && isTrack && (
            <Tooltip title={saved ? "Remover das Curtidas" : "Salvar nas Curtidas"} placement="top">
              <IconButton
                onClick={handleToggleSave}
                disabled={savingLoad}
                sx={{ color: saved ? "primary.main" : "text.secondary", "&:hover": { color: "primary.main" } }}
              >
                {saved ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}

          {!isCompact && isTrack && (
            <Tooltip title="Adicionar à Playlist" placement="top">
              <IconButton
                onClick={handleOpenPlaylistModal}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <PlaylistAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {!isCompact && isTrack && (
            <Tooltip title="Adicionar à Fila" placement="top">
              <IconButton
                onClick={handleAddToQueue}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <QueueMusicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {!isCompact && (
            <Tooltip title="Abrir no Spotify" placement="top">
              <IconButton
                component="a"
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                disabled={!currentContext}
                sx={{ color: "primary.main" }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {isCompact && (
            <IconButton
              size="small"
              aria-label="Mais opções do player"
              aria-haspopup="menu"
              onClick={(e) => setMoreAnchor(e.currentTarget)}
              sx={{ color: "text.secondary" }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}

          <Tooltip title="Fechar" placement="top">
            <IconButton
              size={isCompact ? "small" : "medium"}
              aria-label="Fechar player"
              onClick={closePlayer}
              sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={closeMore}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        {isTrack && (
          <MenuItem onClick={() => { closeMore(); handleToggleSave(); }} disabled={savingLoad}>
            <ListItemIcon>
              {saved ? <FavoriteIcon fontSize="small" color="primary" /> : <FavoriteBorderIcon fontSize="small" />}
            </ListItemIcon>
            {saved ? "Remover das Curtidas" : "Salvar nas Curtidas"}
          </MenuItem>
        )}
        {isTrack && (
          <MenuItem onClick={() => { closeMore(); handleOpenPlaylistModal(); }}>
            <ListItemIcon><PlaylistAddIcon fontSize="small" /></ListItemIcon>
            Adicionar à Playlist
          </MenuItem>
        )}
        {isTrack && (
          <MenuItem onClick={() => { closeMore(); handleAddToQueue(); }}>
            <ListItemIcon><QueueMusicIcon fontSize="small" /></ListItemIcon>
            Adicionar à Fila
          </MenuItem>
        )}
        <MenuItem
          component="a"
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMore}
          disabled={!currentContext}
        >
          <ListItemIcon><OpenInNewIcon fontSize="small" color="primary" /></ListItemIcon>
          Abrir no Spotify
        </MenuItem>
      </Menu>

      <Dialog open={playlistModal} onClose={() => setPlaylistModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Adicionar à Playlist</Typography>
          <IconButton onClick={() => setPlaylistModal(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {playlistsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : playlists.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
              Nenhuma playlist encontrada.
            </Typography>
          ) : (
            <List disablePadding>
              {playlists.map((pl, i) => (
                <React.Fragment key={pl.id}>
                  {i > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    disabled={addingToPlaylist === pl.id}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemAvatar>
                      {addingToPlaylist === pl.id ? (
                        <CircularProgress size={36} />
                      ) : (
                        <Avatar variant="rounded" src={pl.imageUrl} sx={{ width: 42, height: 42 }} />
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={pl.name}
                      secondary={`${pl.tracksTotal} músicas`}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          bottom: isMobile
            ? `calc(${navOffset + (isVisible ? PLAYER_HEIGHT + PLAYER_MOBILE_GAP : 0) + 16}px + env(safe-area-inset-bottom)) !important`
            : `${(isVisible ? PLAYER_HEIGHT : 0) + 16}px !important`,
        }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
