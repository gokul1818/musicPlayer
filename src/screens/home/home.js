import React, { useEffect, useState } from 'react';
import YouTube from 'react-youtube';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeMute, faVolumeUp, faSignInAlt, faPlus, faRandom, faStepForward, faStepBackward } from '@fortawesome/free-solid-svg-icons';
import cdPlayer from "../../assets/gif/cdPlayer.gif";
import { db, doc, onSnapshot, setDoc } from '../../firebase';
import axios from 'axios';
import './styles.css';
import { debounce } from 'lodash';

function Home() {
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
    const unsubscribe = onSnapshot(playbackDocRef, async (docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        setIsPlaying(data.isPlaying);
        setIsMuted(data.isMuted);
        setCurrentTime(data.currentTime);
        setSelectedVideoId(data.videoId);
        setVideoMetadata({ title: data.title, thumbnail: data.thumbnail });
        setTimeout(() => {
          const player = window.YT?.get('player');
          if (player) {
            if (data.isPlaying) {
              const player = window.YT?.get('player');
              if (player) {
                player.seekTo(data.currentTime, true);
                player.playVideo();
              }
            } else {
              const player = window.YT?.get('player');
              if (player) {
                player.pauseVideo();
              }
            }
          }
        }, 1000); // Adjust the delay as needed
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);


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
    const player = event.target;
    player.pauseVideo();  // Ensure the video is paused when ready
    setVideoDuration(player.getDuration());
    setIsReady(true);

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
    const player = event.target;
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      setInterval(() => {
        const current = player.getCurrentTime();
        setCurrentTime(current);
      }, 1000);
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (event.data === YouTube.PlayerState.ENDED) {
      handleNext(); // Automatically play the next song when the current one ends
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    // const player = window.YT.get('player'); // Ensure you have a reference to the player
    // if (player) {
    //   player.playVideo();
    // }
    updatePlaybackState(true, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
  };

  const handlePause = () => {
    setIsPlaying(false);
    // const player = window.YT.get('player');
    // if (player) {
    //   player.pauseVideo();
    // }
    updatePlaybackState(false, currentTime, isMuted, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
  };

  const handlePrevious = () => {
    if (playlist.length > 0) {
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
      setIsReady(true);
    }
  };

  const handleNext = () => {
    if (playlist.length > 0) {
      const nextVideoIndex = isShuffling
        ? Math.floor(Math.random() * playlist.length)
        : (currentVideoIndex + 1) % playlist.length;
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
      setIsReady(true);
    }
  };

  const handleMute = () => {
    setIsMuted(true);
    const player = window.YT.get('player');
    if (player) {
      player.mute();
    }
    updatePlaybackState(isPlaying, currentTime, true, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
  };

  const handleUnmute = () => {
    setIsMuted(false);
    const player = window.YT.get('player');
    if (player) {
      player.unMute();
    }
    updatePlaybackState(isPlaying, currentTime, false, videoMetadata.title, videoMetadata.thumbnail, selectedVideoId);
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
      updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, videoId);
    }
  };

  const handleAddToQueue = (video) => {
    const newPlaylist = [...playlist, video];
    setPlaylist(newPlaylist);
    updatePlaylistInFirestore(newPlaylist);
  };

  const handlePlayNext = (video) => {
    setSelectedVideoId(video.id.videoId);
    setCurrentVideoIndex(playlist.indexOf(video));
    const newMetadata = {
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.default.url,
    };
    setVideoMetadata(newMetadata);
    updatePlaybackState(false, 0, isMuted, newMetadata.title, newMetadata.thumbnail, video.id.videoId);
    setIsReady(true);
  };

  

  const opts = {
    height: '360',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
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
          id='player'
          videoId={selectedVideoId}
          opts={opts}
          onReady={onReady}
          value={currentTime}
          onStateChange={onStateChange}
        />
      </div>

      {videoMetadata.title && (
        <p className='ms-2' style={{ fontSize: "14px" }}>{videoMetadata.title}</p>
      )}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${(currentTime / videoDuration) * 100}%` }}></div>
      </div>
      {isReady ? (
        <div className='d-flex'>
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
          <button className="control-button" onClick={() => setIsReady(true)}>
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
