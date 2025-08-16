import React from 'react';
import './Lightbox.css';

const Lightbox = ({ mediaItems, currentIndex, onClose, onNext, onPrev }) => {
  const currentMedia = mediaItems[currentIndex];
  const isVideo = currentMedia.endsWith('.mp4') || currentMedia.endsWith('.webm') || currentMedia.endsWith('.ogg');

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>&times;</button>

        {mediaItems.length > 1 && (
          <>
            <button className="lightbox-nav lightbox-prev" onClick={onPrev}>&#10094;</button>
            <button className="lightbox-nav lightbox-next" onClick={onNext}>&#10095;</button>
          </>
        )}

        {isVideo ? (
          <video src={currentMedia} className="lightbox-image" controls autoPlay />
        ) : (
          <img src={currentMedia} alt="Media" className="lightbox-image" />
        )}
      </div>
    </div>
  );
};

export default Lightbox;
