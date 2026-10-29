import React from 'react';
import './VideoLoader.css';

function VideoLoader() {
  return (
    <div aria-label="Loading" aria-live="polite" className="video-loader" role="status">
      <video
        aria-hidden="true"
        autoPlay
        className="video-loader__video"
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/Food%20Delivery%20bike.mp4" type="video/mp4" />
      </video>
      <p className="video-loader__message">Getting things ready…</p>
    </div>
  );
}

export default VideoLoader;
