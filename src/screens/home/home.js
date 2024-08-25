import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeMute, faVolumeUp, faSignInAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import cdPlayer from "../../assets/gif/cdPlayer.gif";
import { db, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from '../../firebase'; // Import Firebase Firestore functions
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
  const [selectedVideoId, setSelectedVideoId] = useState(''); // Default video ID
  const [playlist, setPlaylist] = useState([]);
  const [videoMetadata, setVideoMetadata] = useState({ title: '', thumbnail: '' });
  const playbackDocRef = doc(db, 'playbackState', 'current');
  const playlistDocRef = doc(db, 'playlists', 'userPlaylist');

  useEffect(() => {
    const unsubscribe = onSnapshot(playbackDocRef, (docSnapshot) => {
      const data = docSnapshot.data();
      if (data && isReady) {
        setIsPlaying(data.isPlaying);
        setIsMuted(data.isMuted);
        setCurrentTime(data.currentTime);
        setSelectedVideoId(data?.videoId)
        setVideoMetadata({ title: data?.title, thumbnail: data?.thumbnail, })
        if (playerRef.current) {
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
        videoId: videoId
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

        // Update Firestore with new video metadata
        updatePlaybackState(false, currentTime, isMuted, newMetadata.title, newMetadata.thumbnail);
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
      updatePlaybackState(false, current, isMuted, videoMetadata.title, videoMetadata.thumbnail);
    }
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
      playerRef.current.playVideo();
      updatePlaybackState(true, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail);
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
      playerRef.current.pauseVideo();
      updatePlaybackState(false, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail);
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

        // Update Firestore with new video metadata
        updatePlaybackState(false, currentTime, isMuted, newMetadata.title, newMetadata.thumbnail);
      }
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.mute();
      setIsMuted(true);
      updatePlaybackState(isPlaying, currentTime, true, videoMetadata.title, videoMetadata.thumbnail);
    }
  };

  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false);
      updatePlaybackState(isPlaying, currentTime, false, videoMetadata.title, videoMetadata.thumbnail);
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

    // Update video metadata for the selected video
    const video = searchResults.find((result) => result.id.videoId === videoId);

    if (video) {
      const newMetadata = {
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);

      // Update Firestore with new video metadata
      updatePlaybackState(isPlaying, currentTime, isMuted, newMetadata.title, newMetadata.thumbnail);
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

  const handlePlayNext = () => {
    if (playlist.length > 0) {
      const nextVideo = playlist[0];
      setSelectedVideoId(nextVideo.id.videoId);
      // Update video metadata for the selected video
      const newMetadata = {
        title: nextVideo.snippet.title,
        thumbnail: nextVideo.snippet.thumbnails.default.url,
      };
      setVideoMetadata(newMetadata);

      // Update Firestore with new video metadata
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, nextVideo.id.videoId);

      // Remove the played video from playlist
      setPlaylist((prevPlaylist) => {
        const updatedPlaylist = prevPlaylist.slice(1);
        updatePlaylistInFirestore(updatedPlaylist);
        return updatedPlaylist;
      });
      handleReady()
    }
  };

  const videoId = selectedVideoId;
  const progressPercent = videoDuration ? (currentTime / videoDuration) * 100 : 0;
  console.log(progressPercent)
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
        <img className="cd" src={videoMetadata.thumbnail} alt="Album Art" />
      </div>

      <div className="youtube-player-container">
        <YouTube
          videoId={videoId}
          opts={{
            height: '360',
            width: '100%',
            playerVars: {
              autoplay: 1,
              controls: 0,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {isReady ? (
        <div className="player-controls">
          {!isPlaying ? (
            <button className="control-button" onClick={() => handlePlay()}>
              <FontAwesomeIcon icon={faPlay} />
            </button>
          ) : (
            <button className="control-button" onClick={() => handlePause()}>
              <FontAwesomeIcon icon={faPause} />
            </button>
          )}
          {!isMuted ? (
            <button className="control-button" onClick={() => handleMute()}>
              <FontAwesomeIcon icon={faVolumeUp} />
            </button>
          ) : (
            <button className="control-button" onClick={() => handleUnmute()}>
              <FontAwesomeIcon icon={faVolumeMute} />
            </button>
          )}
        </div>
      ) : (
        <div className="player-controls">
          <button className="control-button" onClick={() => handleReady()}>
            <p style={{ margin: "0px", fontSize: "18px" }}>
              <FontAwesomeIcon icon={faSignInAlt} fontSize={18} /> JOIN
            </p>
          </button>
        </div>
      )}

      {videoMetadata.title && (
        <p className='ms-2' style={{ fontSize: "14px" }}>{videoMetadata.title}</p>
      )}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="playlist">
        <h2>Playlist</h2>
        <ul>
          {playlist.map((item) => (
            <li key={item.id.videoId}>
              <div className='d-flex'>
                <img style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }} src={item.snippet.thumbnails.default.url} alt={item.snippet.title} />
                <p className='ms-2' style={{ fontSize: "14px" }}>{item.snippet.title}</p>
              </div>
            </li>
          ))}
        </ul>
        {playlist.length > 0 && (
          <button onClick={() => handlePlayNext()}>
            Play Next
          </button>
        )}
      </div>
    </div>
  );
}

export default Home;
