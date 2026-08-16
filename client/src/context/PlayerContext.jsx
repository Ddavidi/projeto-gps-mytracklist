import React, { createContext, useContext, useState, useCallback } from "react";

const PlayerContext = createContext(null);

/**
 * context pode ser:
 *   { type: "track",    id, name, artist, imageUrl, externalUrl }
 *   { type: "playlist", id, name, imageUrl, externalUrl }
 *   { type: "album",    id, name, artist, imageUrl, externalUrl }
 */
export function PlayerProvider({ children }) {
  const [currentContext, setCurrentContext] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const playTrack = useCallback((track) => {
    if (!track?.id) return;
    setCurrentContext({ type: "track", ...track });
    setIsVisible(true);
  }, []);

  const playPlaylist = useCallback((playlist) => {
    if (!playlist?.id) return;
    setCurrentContext({ type: "playlist", ...playlist });
    setIsVisible(true);
  }, []);

  const playAlbum = useCallback((album) => {
    if (!album?.id) return;
    setCurrentContext({ type: "album", ...album });
    setIsVisible(true);
  }, []);

  const closePlayer = useCallback(() => {
    setIsVisible(false);
    setCurrentContext(null);
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentContext,
      isVisible,
      playTrack,
      playPlaylist,
      playAlbum,
      closePlayer,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
