import { faBookmark, faClose, faPause, faPlay, faSignInAlt, faStepBackward, faStepForward, faTrash, faVideo, faVideoSlash, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { updateDoc } from 'firebase/firestore';
import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import cdPlayer from "../../assets/gif/cdPlayer.gif";
import { db, doc, onSnapshot, setDoc } from '../../firebase';
import './styles.css';

function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedVideoDuration, setSelectedVideoDuration] = useState('');
  const [selectedVideoTotalDuration, setSelectedVideoTotalDuration] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [videoMetadata, setVideoMetadata] = useState({ title: '', thumbnail: '' });
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [showVideo, setShowVideo] = useState(true);
  const [playerReady, setPlayerReady] = useState(null);
  const intervalRef = useRef(null);
  const [volume, setVolume] = useState(100);
  const playbackDocRef = doc(db, 'playbackState', 'current');
  const playlistDocRef = doc(db, 'playlists', 'userPlaylist');

  useEffect(() => {
    const unsubscribe = onSnapshot(playbackDocRef, (docSnapshot) => {
      const data = docSnapshot.data();
      if (data && playerReady) {
        setIsPlaying(data.isPlaying);
        // setIsMuted(data.isMuted);
        setCurrentTime(data.currentTime);
        setSelectedVideoId(data.videoId);
        setVideoMetadata({ title: data.title, thumbnail: data.thumbnail });

        const updatePlayerState = () => {
          const player = window.YT?.get('player');
          if (player) {
            player.seekTo(data.currentTime, true); // Seek to the specified time
            player.setVolume(volume);
            if (data.isPlaying) {
              player.playVideo(); // Start playing the video if isPlaying is true
            } else {
              player.pauseVideo(); // Pause the video if isPlaying is false
            }
            if (player && isMuted) {
              player.mute();
            }
            else {
              player.unMute();

            }
          }
        };

        setTimeout(updatePlayerState, 1000); // Adjust the delay as needed
      }
    });

    return () => {
      unsubscribe();
    };
  }, [playerReady]);

  useEffect(() => {
    const debouncedSearch = debounce((query) => searchYouTube(query), 500);
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
    return () => debouncedSearch.cancel();
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = onSnapshot(playlistDocRef, (docSnapshot) => {
      const data = docSnapshot.data();
      if (data && data.items) {
        setPlaylist(data.items);
      }
    });
    return () => unsubscribe();
  }, []);

  const updatePlaybackState = async (isPlaying, currentTime, isMuted, title, thumbnail, videoId) => {
    try {
      await updateDoc(playbackDocRef, {
        isPlaying,
        currentTime,
        isMuted,
        title,
        thumbnail,
        videoId
      });
      console.log("A")
    } catch (error) {
      console.error("Error updating playback state:", error);
    }
  };

  const updatePlaylistInFirestore = async (playlist) => {
    try {
      await setDoc(playlistDocRef, { items: playlist }, { merge: true });
    } catch (error) {
      console.error("Error updating playlist in Firestore:", error);
    }
  };
  const formatDuration = (durationInSeconds) => {
    // Convert duration to minutes and seconds
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    // Format as MM:SS
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  };

  const onReady = (event) => {
    const player = event.target;
    setPlayerReady(event.target);
    player.pauseVideo();  // Ensure the video is paused when ready
    setVideoDuration(player.getDuration());
    // Convert and format the video duration
    setSelectedVideoDuration(formatDuration(player.getCurrentTime()))
    setSelectedVideoTotalDuration(formatDuration(player.getDuration()))

    if (selectedVideoId) {
      const video = playlist.find((result) => result.id.videoId === selectedVideoId);
      if (video) {
        const newMetadata = {
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.default.url,
        };
        setVideoMetadata(newMetadata);
      }
    }
    setIsReady(true);
  };


  const onStateChange = (event) => {
    const player = event.target;

    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);

      // Clear any existing interval to avoid multiple intervals running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        // updatePlaybackState(isPlaying, current, true, videoMetadata?.title, videoMetadata?.thumbnail, selectedVideoId);
        const current = player.getCurrentTime();
        setSelectedVideoDuration(formatDuration(current))
        setCurrentTime(current);
      }, 100);

    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setIsPlaying(false);

      // Clear interval when paused
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (event.data === YouTube.PlayerState.ENDED) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      handleNext(); // Automatically play the next song when the current one ends
    }
  };

  useEffect(() => {
    // Clear interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);


  const handlePlay = () => {
    setIsPlaying(true);
    updatePlaybackState(true, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
  };

  const handlePause = () => {
    setIsPlaying(false);
    updatePlaybackState(false, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
  };

  const handlePrevious = () => {
    if (playlist.length > 0) {
      setCurrentTime(0);
      setSelectedVideoTotalDuration("0:00")
      setSelectedVideoDuration("0:00")
      const prevVideoIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : playlist.length - 1;
      const prevVideo = playlist[prevVideoIndex];
      setSelectedVideoId(prevVideo.id.videoId);
      setCurrentVideoIndex(prevVideoIndex);
      const newMetadata = {
        title: prevVideo.snippet.title,
        thumbnail: prevVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(true, 0, isMuted, newMetadata.title, newMetadata.thumbnail, prevVideo.id.videoId);
    }
  };

  const handleNext = () => {
    if (playlist.length > 0) {
      setSelectedVideoTotalDuration("0:00")
      setSelectedVideoDuration("0:00")
      setCurrentTime(0);
      const nextVideoIndex = (currentVideoIndex + 1) % playlist.length;
      const nextVideo = playlist[nextVideoIndex];
      if (!nextVideo) return;

      setSelectedVideoId(nextVideo.id.videoId);
      setCurrentVideoIndex(nextVideoIndex);
      const newMetadata = {
        title: nextVideo.snippet.title,
        thumbnail: nextVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(true, 0, isMuted, newMetadata.title, newMetadata.thumbnail, nextVideo.id.videoId);
    }
  };

  const handleMute = () => {
    setIsMuted(true);
    // updatePlaybackState(isPlaying, currentTime, true, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    const player = window.YT.get('player');
    if (player) {
      player.mute();
    }
  };

  const handleUnmute = () => {
    setIsMuted(false);
    // updatePlaybackState(isPlaying, currentTime, false, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    const player = window.YT.get('player');
    if (player) {
      player.unMute();
    }
  };

  const searchYouTube = async (query) => {
    const apiKey = "AIzaSyDx5bncjiKOnbQ_1mz8j6kgwHlKGRWxQIo"; // Replace with your YouTube API key
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 10,
          key: apiKey,
        },
      });
      setSearchResults(response.data.items);
    } catch (error) {
      console.error("Error searching YouTube:", error);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleVideoSelect = (videoId) => {
    setSelectedVideoId(videoId);
    setSelectedVideoTotalDuration("0:00")
    setSelectedVideoDuration("0:00")
    setSearchQuery('');
    const video = searchResults.find((result) => result.id.videoId === videoId);
    if (video) {
      const newMetadata = {
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, videoId);
    }
  };

  const handleAddToQueue = (video) => {
    const newPlaylist = [...playlist, video];
    setPlaylist(newPlaylist);
    updatePlaylistInFirestore(newPlaylist);
  };

  const handlePlayNext = (video) => {
    setSelectedVideoTotalDuration("0:00")
    setSelectedVideoDuration("0:00")
    setSelectedVideoId(video.id.videoId);
    setCurrentVideoIndex(playlist.indexOf(video));
    const newMetadata = {
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.default.url,
    };
    setVideoMetadata(newMetadata);
    updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, video.id.videoId);
  };
  const handleRemoveList = async (video) => {
    try {
      const updatedPlaylist = playlist.filter(item => item.id.videoId !== video.id.videoId);
      setPlaylist(updatedPlaylist);
      await updatePlaylistInFirestore(updatedPlaylist);
    } catch (error) {
      console.error("Error removing video from playlist:", error);
    }
  };


  const handleVolumeChange = (event) => {
    const newVolume = event.target.value;
    setVolume(newVolume);
    const player = window.YT?.get('player');
    if (player) {
      player.setVolume(newVolume);
    }
    if (newVolume === '0') {
      handleMute();
    } else {
      handleUnmute();
    }
  };

  const handleChangeDuration = (event) => {
    const time = event.target.value;
    // const player = window.YT?.get('player');
    const debouncedSearch = debounce((time) =>
      updatePlaybackState(true, time, true, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId)
      , 500);
    if (time) {
      debouncedSearch(time);
    }
    return () => debouncedSearch.cancel();
    // if (player) {
    //   player.seekTo(time);
    // }
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,         // Autoplay the video
      controls: 0,         // Hide controls
      showinfo: 0,         // Hide video title and uploader
      modestbranding: 1,  // Hide YouTube logo
      rel: 0,             // Prevent related videos from appearing at the end
      fs: 0,              // Hide fullscreen button
      iv_load_policy: 3,  // Hide annotations
      cc_load_policy: 0,  // Hide closed captions
      enablejsapi: 1      // Enable JavaScript API for player control
    },
  };


  return (
    <div className="player">
      <header className="player-header">
        <h1>My Music Player</h1>
      </header>

      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search..."
          className='search-bar'
        />
        <button className="control-button-clear" onClick={() => {
          setSearchQuery("")
          setSearchResults([])
        }} style={{ background: "#e1686a" }}>
          <FontAwesomeIcon icon={faClose} fontSize={18} />

        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <ul className='p-0'>
            {searchResults.map((result) => (
              <div key={result.id.videoId} className='d-flex flex-column my-2'>
                <div className='d-flex'>
                  <img style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }} src={result.snippet.thumbnails.default.url} alt={result.snippet.title} />
                  <div>

                    <p className='ms-2 mb-0' style={{ fontSize: "14px" }}>{result.snippet.title}</p>
                    <div className='d-flex '>
                      <button className="control-button3" onClick={() => handleVideoSelect(result.id.videoId)}>
                        <FontAwesomeIcon icon={faPlay} fontSize={10} />
                      </button>
                      <button className="control-button3" onClick={() => handleAddToQueue(result)}>
                        <FontAwesomeIcon icon={faBookmark} fontSize={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ul>
        </div>
      )}
      {showVideo &&
        <div className={`cd-container ${isPlaying ? 'rotating' : ''}`}>
          <img className="cd" src={cdPlayer} alt="Album Art" />
        </div>}

      <div className="youtube-player-container" style={{ visibility: showVideo ? "hidden" : "visible", width: showVideo ? "0px" : "100vw", height: showVideo ? "0px" : "200px", margin: showVideo ? "0px" : "20px 0px" }}>
        <YouTube
          id='player'
          videoId={selectedVideoId}
          opts={opts}

          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {
        videoMetadata.title && (
          <p className='ms-2' style={{ fontSize: "14px" }}>{videoMetadata.title}</p>
        )
      }
      {console.log(currentTime, videoDuration)}
      <div className='d-flex align-items-center w-100 justify-content-center pe-5 me-3'>

        {selectedVideoDuration}/{selectedVideoTotalDuration}
        <div className="progress-container ms-2">
          <div className="progress-bar" style={{ width: `${(currentTime / videoDuration) * 100}%` }}></div>
        </div>
      </div>
      {
        isReady ? (
          <div className='d-flex align-items-center position-relative'>

            <div className="player-controls">
              <button className="control-button" onClick={handlePrevious}>
                <FontAwesomeIcon icon={faStepBackward} fontSize={18} />
              </button>
              {!isPlaying ? (
                <button className="control-button2" onClick={handlePlay}>
                  <FontAwesomeIcon icon={faPlay} fontSize={18} />
                </button>
              ) : (
                <button className="control-button2" onClick={handlePause}>
                  <FontAwesomeIcon icon={faPause} fontSize={18} />
                </button>
              )}
              <button className="control-button" onClick={handleNext}>
                <FontAwesomeIcon icon={faStepForward} fontSize={18} />
              </button>
            </div>
            {/* 
            {!isMuted ? (
              <button className="control-button" onClick={handleMute}>
                <FontAwesomeIcon icon={faVolumeUp} fontSize={18} />
              </button>
            ) : (
              <button className="control-button" onClick={handleUnmute}>
                <FontAwesomeIcon icon={faVolumeMute} fontSize={18} />
              </button>
            )} */}

          </div>
        ) : (
          <div className="player-controls">
            <button className="control-button" >
              <p style={{ margin: "0px", fontSize: "18px" }}>
                <FontAwesomeIcon icon={faSignInAlt} fontSize={18} /> Loading
              </p>
            </button>
          </div>
        )
      }
      <div className='d-flex align-items-center'>
        {showVideo ? (
          <button className="control-button" onClick={() => setShowVideo(false)}>
            <FontAwesomeIcon icon={faVideo} fontSize={18} />
          </button>
        ) : (
          <button className="control-button" onClick={() => setShowVideo(true)}>
            <FontAwesomeIcon icon={faVideoSlash} fontSize={18} />
          </button>
        )}
        {!isMuted ? (
          <button className="control-button" onClick={handleMute}>
            <FontAwesomeIcon icon={faVolumeUp} fontSize={18} />
          </button>
        ) : (
          <button className="control-button" onClick={handleUnmute}>
            <FontAwesomeIcon icon={faVolumeMute} fontSize={18} />
          </button>
        )}

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        // disabled={isMuted} // Disable slider when muted
        />
      </div>
      {/* <input
        type="range"
        min="0"
        max="100"
        value={(currentTime / videoDuration) * 100}
        onChange={handleChangeDuration}
        className="volume-slider"
      /> */}
      <div className="playlist">
        <h2>Playlist</h2>
        <ul>
          {playlist.map((item) => (
            <li key={item.id.videoId} style={{ background: item.id.videoId == selectedVideoId ? "#6f9184" : "#20232a " }}>
              <div className='d-flex justify-content-between align-items-center'>
                <div className='d-flex align-items-center w-75'>
                  <img style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} src={item.snippet.thumbnails.default.url} alt={item.snippet.title} />
                  <p className='ms-2 mb-0 text-truncate' style={{ fontSize: "14px" }} >{item.snippet.title}</p>
                </div>
                <div className='d-flex '>
                  <button className="control-button1" onClick={() => handlePlayNext(item)}>
                    <FontAwesomeIcon icon={item.id.videoId == selectedVideoId ? faPause : faPlay} fontSize={14} />
                  </button>
                  <button className="control-button1" onClick={() => handleRemoveList(item)} style={{ background: "#e1686a" }}>
                    <FontAwesomeIcon icon={faTrash} fontSize={14} />
                  </button>

                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div >
  );
}

export default Home;
