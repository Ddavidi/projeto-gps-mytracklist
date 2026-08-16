import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isVisible, setIsVisible] = useState(false);

  const audioRef = useRef(new Audio());

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = useCallback((track) => {
    if (!track?.previewUrl) return;

    const audio = audioRef.current;

    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    audio.pause();
    audio.src = track.previewUrl;
    audio.volume = volume;
    audio.currentTime = 0;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.onerror = () => setIsPlaying(false);

    audio.play().then(() => {
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsVisible(true);
      setCurrentTime(0);
    }).catch(() => setIsPlaying(false));
  }, [currentTrack, isPlaying, volume]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }, [isPlaying]);

  const seek = useCallback((newTime) => {
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  }, []);

  const closePlayer = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setIsPlaying(false);
    setIsVisible(false);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, isVisible,
      playTrack, togglePlayPause, seek, changeVolume, closePlayer,
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
