import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import cdPlayer from "../../assets/gif/cdPlayer.gif";
import { db, doc, onSnapshot, setDoc } from '../../firebase'; // Import Firebase Firestore functions
import './styles.css'; // Import CSS for styling

function Home() {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const playbackDocRef = doc(db, 'playbackState', 'current');

  useEffect(() => {
    // Listen for updates from Firestore
    const unsubscribe = onSnapshot(playbackDocRef, (docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        setIsPlaying(data.isPlaying);
        setIsMuted(data.isMuted);
        setCurrentTime(data.currentTime);
        if (playerRef.current) {
          playerRef.current.seekTo(data.currentTime, true);
          if (data.isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
    }
  }, [currentTime]);

  const updatePlaybackState = async (isPlaying, currentTime, isMuted) => {
    try {
      await setDoc(playbackDocRef, {
        isPlaying,
        currentTime,
        isMuted,
      });
    } catch (error) {
      console.error("Error updating playback state:", error);
    }
  };

  const onReady = (event) => {
    playerRef.current = event.target;
    event.target.pauseVideo(); // Optionally start with video paused
    setVideoDuration(event.target.getDuration()); // Get video duration
  };

  // const onStateChange = (event) => {
  //   if (event.data === YouTube.PlayerState.PLAYING) {
  //     setIsPlaying(true);
  //     const intervalId = setInterval(() => {
  //       if (playerRef.current) {
  //         const current = playerRef.current.getCurrentTime();
  //         setCurrentTime(current);
  //         updatePlaybackState(true, current, isMuted);
  //       }
  //     }, 1000); // Update every second

  //     return () => clearInterval(intervalId);
  //   } else if (event.data === YouTube.PlayerState.PAUSED) {
  //     setIsPlaying(false);
  //     updatePlaybackState(false, currentTime, isMuted);
  //   }
  // };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      updatePlaybackState(true, currentTime, isMuted);
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      updatePlaybackState(false, currentTime, isMuted);
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.mute();
      setIsMuted(true);
      updatePlaybackState(isPlaying, currentTime, true);
    }
  };

  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false);
      updatePlaybackState(isPlaying, currentTime, false);
    }
  };

  const videoId = 'RgOEKdA2mlw';
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
            height: '360',
            width: '10',
            playerVars: {
              autoplay: 1,
              controls: 0,
            },
          }}
          onReady={onReady}
          // onStateChange={onStateChange}
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
