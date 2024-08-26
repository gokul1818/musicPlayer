import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeMute, faVolumeUp, faSignInAlt, faPlus, faRandom, faStepForward, faStepBackward } from '@fortawesome/free-solid-svg-icons';
import cdPlayer from "../../assets/gif/cdPlayer.gif";
import { db, doc, onSnapshot, setDoc } from '../../firebase'; // Import Firebase Firestore functions
import axios from 'axios'; // Import axios for API requests
import './styles.css'; // Import CSS for styling
import { debounce } from 'lodash';

function Home() {
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [videoMetadata, setVideoMetadata] = useState({ title: '', thumbnail: '' });
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [isShuffling, setIsShuffling] = useState(false);

  const playbackDocRef = doc(db, 'playbackState', 'current');
  const playlistDocRef = doc(db, 'playlists', 'userPlaylist');

  useEffect(() => {
    const unsubscribe = onSnapshot(playbackDocRef, (docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        setIsPlaying(data.isPlaying);
        setIsMuted(data.isMuted);
        setCurrentTime(data.currentTime);
        setSelectedVideoId(data.videoId);
        setVideoMetadata({ title: data.title, thumbnail: data.thumbnail });

        if (playerRef.current && isReady) {
          if (data.isMuted) {
            playerRef.current.mute();
          } else {
            playerRef.current.unMute();
          }
          playerRef.current.seekTo(data.currentTime, true);
          if (data.isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReady]);

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
      await setDoc(playbackDocRef, {
        isPlaying,
        currentTime,
        isMuted,
        title,
        thumbnail,
        videoId
      });
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

  const onReady = (event) => {
    playerRef.current = event.target;
    event.target.pauseVideo();
    setVideoDuration(event.target.getDuration());

    if (selectedVideoId) {
      const video = playlist.find((result) => result.id.videoId === selectedVideoId);
      if (video) {
        const newMetadata = {
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.default.url,
        };
        setVideoMetadata(newMetadata);
        updatePlaybackState(false, currentTime, isMuted, newMetadata.title, newMetadata.thumbnail, selectedVideoId);
      }
    }
  };

  const onStateChange = (event) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const current = playerRef.current.getCurrentTime();
          setCurrentTime(current);
        }
      }, 1000);
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setIsPlaying(false);
      const current = playerRef.current.getCurrentTime();
      updatePlaybackState(false, current, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    }
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
      playerRef.current.playVideo();
      updatePlaybackState(true, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
      playerRef.current.pauseVideo();
      updatePlaybackState(false, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    }
  };
  const handlePrevious = () => {
    if (playlist.length > 0) {
      // Calculate the index of the previous video
      const prevVideoIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : playlist.length - 1;
      const prevVideo = playlist[prevVideoIndex];

      // Update the selected video ID and current video index
      setSelectedVideoId(prevVideo.id.videoId);
      setCurrentVideoIndex(prevVideoIndex);
      setIsReady(true);

      // Update metadata for the previous video
      const newMetadata = {
        title: prevVideo.snippet.title,
        thumbnail: prevVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);

      // Update playback state in Firestore
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, prevVideo.id.videoId);

      // Play the previous video
      if (playerRef.current) {
        playerRef.current.loadVideoById(prevVideo.id.videoId);
        playerRef.current.playVideo();
      }
    }
  };

  const handleNext = () => {
    if (playlist.length > 0) {
      // Calculate the index of the next video
      const nextVideoIndex = currentVideoIndex + 1 < playlist.length ? currentVideoIndex + 1 : 0;
      const nextVideo = playlist[nextVideoIndex];
      
      // Update the selected video ID and current video index
      setSelectedVideoId(nextVideo.id.videoId);
      setCurrentVideoIndex(nextVideoIndex);
      setIsReady(true);
      
      // Update metadata for the next video
      const newMetadata = {
        title: nextVideo.snippet.title,
        thumbnail: nextVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      
      // Update playback state in Firestore
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, nextVideo.id.videoId);
      
      // Play the next video
      if (playerRef.current) {
        playerRef.current.loadVideoById(nextVideo.id.videoId);
        playerRef.current.playVideo();
      }
    }
  };
  
  const handleReady = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
      playerRef.current.pauseVideo();
      setVideoDuration(playerRef.current.getDuration());
      setIsReady(true);
      const video = playlist.find((result) => result.id.videoId === selectedVideoId);
      if (video) {
        const newMetadata = {
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.default.url,
        };
        setVideoMetadata(newMetadata);
        playerRef.current.pauseVideo();
      }
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.mute();
      setIsMuted(true);
      updatePlaybackState(isPlaying, currentTime, true, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
    }
  };

  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false);
      updatePlaybackState(isPlaying, currentTime, false, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
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
    setIsReady(true);
    setSelectedVideoId(videoId);
    setSearchQuery('');
    const video = searchResults.find((result) => result.id.videoId === videoId);
    if (video) {
      const newMetadata = {
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(isPlaying, currentTime, isMuted, newMetadata.title, newMetadata.thumbnail, videoId);
    }
  };

  const handleAddToQueue = (video) => {
    setIsReady(true);
    if (!playlist.some((item) => item.id.videoId === video.id.videoId)) {
      setPlaylist((prevPlaylist) => {
        const updatedPlaylist = [...prevPlaylist, video];
        updatePlaylistInFirestore(updatedPlaylist);
        return updatedPlaylist;
      });
    }
  };

  const handlePlayNext = (item) => {
    if (playlist.length > 0) {
      const nextVideoIndex = currentVideoIndex + 1 < playlist.length ? currentVideoIndex + 1 : 0;
      const nextVideo = playlist[nextVideoIndex];
      setSelectedVideoId(nextVideo.id.videoId);
      setCurrentVideoIndex(nextVideoIndex);
      setIsReady(true);
      const newMetadata = {
        title: nextVideo.snippet.title,
        thumbnail: nextVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, nextVideo.id.videoId);
      playerRef.current.playVideo();
      setPlaylist((prevPlaylist) => {
        const updatedPlaylist = prevPlaylist.slice(1);
        updatePlaylistInFirestore(updatedPlaylist);
        return updatedPlaylist;
      });
    }
  };

  const handlePlayPrevious = () => {
    if (playlist.length > 0) {
      const prevVideoIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : playlist.length - 1;
      const prevVideo = playlist[prevVideoIndex];
      setSelectedVideoId(prevVideo.id.videoId);
      setCurrentVideoIndex(prevVideoIndex);
      setIsReady(true);
      const newMetadata = {
        title: prevVideo.snippet.title,
        thumbnail: prevVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, prevVideo.id.videoId);
      playerRef.current.playVideo();
    }
  };

  const handleShuffle = () => {
    if (playlist.length > 0) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      const randomVideo = playlist[randomIndex];
      setSelectedVideoId(randomVideo.id.videoId);
      setCurrentVideoIndex(randomIndex);
      setIsReady(true);
      const newMetadata = {
        title: randomVideo.snippet.title,
        thumbnail: randomVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, randomVideo.id.videoId);
      playerRef.current.playVideo();
    }
  };

  const videoId = selectedVideoId;
  const progressPercent = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div className="home-container">
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
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <ul>
            {searchResults.map((result) => (
              <div key={result.id.videoId} className='d-flex flex-column my-2'>
                <div className='d-flex'>
                  <img style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }} src={result.snippet.thumbnails.default.url} alt={result.snippet.title} />
                  <p className='ms-2' style={{ fontSize: "14px" }}>{result.snippet.title}</p>
                </div>
                <div className='d-flex mt-2'>
                  <button onClick={() => handleVideoSelect(result.id.videoId)}>
                    <FontAwesomeIcon icon={faPlay} /> PLAY
                  </button>
                  <button onClick={() => handleAddToQueue(result)}>
                    <FontAwesomeIcon icon={faPlus} /> QUEUE
                  </button>
                </div>
              </div>
            ))}
          </ul>
        </div>
      )}

      <div className={`cd-container ${isPlaying ? '' : ''}`}>
        <img className="cd" src={videoMetadata.thumbnail || cdPlayer} alt="Album Art" />
      </div>

      <div className="youtube-player-container">
        <YouTube
          videoId={videoId}
          opts={{
            height: '360',
            width: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>



      {videoMetadata.title && (
        <p className='ms-2' style={{ fontSize: "14px" }}>{videoMetadata.title}</p>
      )}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
      </div>
      {isReady ? (
        <div className="player-controls">
          <button className="control-button" onClick={handleShuffle}>
            <FontAwesomeIcon icon={faRandom} fontSize={18} />
          </button>
          <button className="control-button" onClick={handlePrevious}>
            <FontAwesomeIcon icon={faStepBackward} fontSize={18} />
          </button>
          {!isPlaying ? (
            <button className="control-button" onClick={handlePlay}>
              <FontAwesomeIcon icon={faPlay} fontSize={18} />
            </button>
          ) : (
            <button className="control-button" onClick={handlePause}>
              <FontAwesomeIcon icon={faPause} fontSize={18} />
            </button>
          )}
          <button className="control-button" onClick={handleNext}>
            <FontAwesomeIcon icon={faStepForward} fontSize={18} />
          </button>

          {!isMuted ? (
            <button className="control-button" onClick={handleMute}>
              <FontAwesomeIcon icon={faVolumeUp} fontSize={18} />
            </button>
          ) : (
            <button className="control-button" onClick={handleUnmute}>
              <FontAwesomeIcon icon={faVolumeMute} fontSize={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="player-controls">
          <button className="control-button" onClick={handleReady}>
            <p style={{ margin: "0px", fontSize: "18px" }}>
              <FontAwesomeIcon icon={faSignInAlt} fontSize={18} /> JOIN
            </p>
          </button>
        </div>
      )}
      <div className="playlist">
        <h2>Playlist</h2>
        <ul>
          {playlist.map((item) => (
            <li key={item.id.videoId}>
              <div className='d-flex justify-content-between align-items-center'>
                <div className='d-flex align-items-center w-75'>
                  <img style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }} src={item.snippet.thumbnails.default.url} alt={item.snippet.title} />
                  <p className='ms-2 mb-0' style={{ fontSize: "14px" }}>{item.snippet.title}</p>
                </div>
                <button className="control-button1" onClick={() => handlePlayNext(item)}>
                  <FontAwesomeIcon icon={faPlay} fontSize={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Home;
