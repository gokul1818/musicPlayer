import React, { useRef, useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import './styles.css'; // Import CSS for styling
import cdPlayer from "../../assets/gif/cdPlayer.gif";

function Home() {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const onReady = (event) => {
    playerRef.current = event.target;
    event.target.pauseVideo(); // Optionally start with video paused
    setVideoDuration(event.target.getDuration()); // Get video duration
  };

  const onStateChange = (event) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      const interval = setInterval(() => {
        if (playerRef.current) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 1000); // Update every second

      return () => clearInterval(interval);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  // const videoId = 'W66CpwlSiq8';
  const videoId = "RgOEKdA2mlw"

  const progressPercent = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div className="home-container">
      <header className="player-header">
        <h1>My Music Player</h1>
      </header>
      <div className={`cd-container ${isPlaying ? 'rotating' : ''}`}>
        <img className="cd" src={cdPlayer} alt="Album Art" />
      </div>

      <div className="youtube-player-container">
        <YouTube
          videoId={videoId}
          opts={{
            height: '10',
            width: '10',
            playerVars: {
              autoplay: 1,
              controls: 0,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      <div className="player-controls">
        {!isPlaying ? (
          <button className="control-button" onClick={handlePlay}>
            <FontAwesomeIcon icon={faPlay} />
          </button>
        ) : (
          <button className="control-button" onClick={handlePause}>
            <FontAwesomeIcon icon={faPause} />
          </button>
        )}
        {!isMuted ? (
          <button className="control-button" onClick={handleMute}>
            <FontAwesomeIcon icon={faVolumeUp} />
          </button>
        ) : (
          <button className="control-button" onClick={handleUnmute}>
            <FontAwesomeIcon icon={faVolumeMute} />
          </button>
        )}
      </div>

      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="playlist">
        <h2>Playlist</h2>
        <ul>
          <li>Track 1 - Artist</li>
          <li>Track 2 - Artist</li>
          <li>Track 3 - Artist</li>
        </ul>
      </div>
    </div>
  );
}

export default Home;
