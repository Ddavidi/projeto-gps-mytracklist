import React, { useState, useEffect, useCallback } from "react";
import {
  Box, IconButton, Tooltip, Fade, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemAvatar, Avatar, ListItemText, CircularProgress,
  Typography, Snackbar, Alert, Divider
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function GlobalPlayer() {
  const { currentContext, isVisible, closePlayer } = usePlayer();
  const { isAuthenticated, user } = useAuth();

  const [saved, setSaved] = useState(false);
  const [savingLoad, setSavingLoad] = useState(false);

  const [playlistModal, setPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState(null);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const showSnack = (message, severity = "success") => setSnack({ open: true, message, severity });

  const isTrack = currentContext?.type === "track";

  // Verifica se a track esta salva quando muda
  useEffect(() => {
    if (!isAuthenticated || !isTrack || !currentContext?.id) { setSaved(false); return; }
    api.get(`/spotify/me/saved-tracks/contains?id=${currentContext.id}`)
      .then(r => setSaved(r.data.saved))
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
        showSnack("Salvo nas Músicas Curtidas ♥");
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
      showSnack("Adicionado à fila do Spotify ✓");
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
        setPlaylists(r.data);
      } catch {
        showSnack("Erro ao carregar playlists.", "error");
      } finally {
        setPlaylistsLoading(false);
      }
    }
  };

  const handleAddToPlaylist = async (playlistId, playlistName) => {
    setAddingToPlaylist(playlistId);
    try {
      await api.post(`/spotify/playlists/${playlistId}/tracks`, { trackId: currentContext.id });
      showSnack(`Adicionado a "${playlistName}" ✓`);
      setPlaylistModal(false);
    } catch (e) {
      showSnack(e.response?.data?.error || "Erro ao adicionar à playlist.", "error");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  if (!isVisible || !currentContext) return null;

  const { type, id, externalUrl } = currentContext;
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0&autoplay=1`;
  const spotifyUrl = externalUrl || `https://open.spotify.com/${type}/${id}`;

  return (
    <>
      <Fade in={isVisible}>
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            bgcolor: "#0a0a0a",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {/* Iframe — ocupa a maior parte */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <iframe
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

          {/* Sidebar de acoes */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#111",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              height: 80,
              px: 0.5,
              gap: 0,
              flexShrink: 0,
            }}
          >
            {/* Save to library — so para tracks */}
            {isTrack && (
              <Tooltip title={saved ? "Remover das Curtidas" : "Salvar nas Curtidas"} placement="left">
                <IconButton
                  onClick={handleToggleSave}
                  disabled={savingLoad}
                  size="small"
                  sx={{
                    color: saved ? "#1ED760" : "rgba(255,255,255,0.35)",
                    "&:hover": { color: "#1ED760" },
                    p: 0.75,
                  }}
                >
                  {saved ? <FavoriteIcon sx={{ fontSize: 17 }} /> : <FavoriteBorderIcon sx={{ fontSize: 17 }} />}
                </IconButton>
              </Tooltip>
            )}

            {/* Add to playlist — so para tracks */}
            {isTrack && (
              <Tooltip title="Adicionar a Playlist" placement="left">
                <IconButton
                  onClick={handleOpenPlaylistModal}
                  size="small"
                  sx={{ color: "rgba(255,255,255,0.35)", "&:hover": { color: "#fff" }, p: 0.75 }}
                >
                  <PlaylistAddIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Add to queue — so para tracks */}
            {isTrack && (
              <Tooltip title="Adicionar à Fila" placement="left">
                <IconButton
                  onClick={handleAddToQueue}
                  size="small"
                  sx={{ color: "rgba(255,255,255,0.35)", "&:hover": { color: "#fff" }, p: 0.75 }}
                >
                  <QueueMusicIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Abrir no Spotify */}
            <Tooltip title="Abrir no Spotify" placement="left">
              <IconButton
                component="a"
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: "#1ED760", "&:hover": { bgcolor: "rgba(30,215,96,0.15)" }, p: 0.75 }}
              >
                <OpenInNewIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            {/* Fechar */}
            <Tooltip title="Fechar" placement="left">
              <IconButton
                onClick={closePlayer}
                size="small"
                sx={{ color: "rgba(255,255,255,0.3)", "&:hover": { color: "#fff" }, p: 0.75 }}
              >
                <CloseIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Fade>

      {/* Modal: Adicionar a Playlist */}
      <Dialog
        open={playlistModal}
        onClose={() => setPlaylistModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#1a1a1a", backgroundImage: "none", borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
          <Typography fontWeight="bold">Adicionar a Playlist</Typography>
          <IconButton onClick={() => setPlaylistModal(false)} sx={{ color: "rgba(255,255,255,0.5)" }}>
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
                  {i > 0 && <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />}
                  <ListItem
                    button
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    disabled={addingToPlaylist === pl.id}
                    sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.05)" }, py: 1 }}
                  >
                    <ListItemAvatar>
                      {addingToPlaylist === pl.id ? (
                        <CircularProgress size={36} />
                      ) : (
                        <Avatar
                          variant="square"
                          src={pl.imageUrl}
                          sx={{ width: 40, height: 40, borderRadius: 1 }}
                        />
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={pl.name}
                      secondary={`${pl.tracksTotal} músicas`}
                      primaryTypographyProps={{ color: "#fff", fontWeight: 500, fontSize: 14 }}
                      secondaryTypographyProps={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 100 }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
