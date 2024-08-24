import React, { useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import './styles.css'; // Import CSS for styling
import cdPlayer from "../../assets/gif/cdPlayer.gif"

function Home() {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false); // State to track play/pause
  const [isMuted, setIsMuted] = useState(false); // State to track mute/unmute

  const onReady = (event) => {
    playerRef.current = event.target;
    event.target.pauseVideo(); // Optionally start with video paused
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsPlaying(true); // Update state to show pause icon and CD animation
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setIsPlaying(false); // Update state to show play icon and hide CD animation
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.mute();
      setIsMuted(true); // Update state to show unmute icon
    }
  };

  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false); // Update state to show mute icon
    }
  };

  const videoId = 'W66CpwlSiq8'; // Ensure this is a valid video ID

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
            height: '10', // Hidden size
            width: '10', // Hidden size
            playerVars: {
              autoplay: 1,
              controls: 0, // Hide player controls
            },
          }}
          onReady={onReady}
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
