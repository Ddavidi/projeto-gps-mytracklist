import React, { createContext, useContext, useState, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null); // { id, name, artist, imageUrl }
  const [isVisible, setIsVisible] = useState(false);

  const playTrack = useCallback((track) => {
    if (!track?.id) return;
    setCurrentTrack(track);
    setIsVisible(true);
  }, []);

  const closePlayer = useCallback(() => {
    setIsVisible(false);
    setCurrentTrack(null);
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isVisible,
      playTrack,
      closePlayer,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
}
