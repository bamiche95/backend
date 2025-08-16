import React, { useState, useRef, useEffect } from 'react';

function MediaLightbox({ media = [], initialIndex = 0, onClose }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  // Touch swipe state
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance

    if (diff > threshold) {
      // Swiped left — next
      setActiveIndex((prev) => (prev + 1) % media.length);
    } else if (diff < -threshold) {
      // Swiped right — previous
      setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
    }

    // Reset refs
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!media.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: '2rem',
            color: '#fff',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1,
          }}
          aria-label="Close lightbox"
        >
          ×
        </button>

        <div
          style={{
            width: '90vw',
            maxWidth: '960px',
            aspectRatio: '16/9', // CSS aspect ratio
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slide Track */}
          <div
            style={{
              display: 'flex',
              height: '100%',
              width: `${media.length * 100}%`,
              transform: `translateX(-${activeIndex * (100 / media.length)}%)`,
              transition: 'transform 0.5s ease-in-out',
            }}
          >
            {media.map((item, index) => {
              const url = item.mediaUrl || item.url || item;
              const isVideo = /\.(mp4|webm|ogg)$/i.test(url);

              const commonStyle = {
                flex: `0 0 100%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
              };



              const videoStyle = {
                width: '100%',
                height: '100%',
                objectFit: 'contain', // fits video without cropping
                borderRadius: '8px',
              };

              const imageStyle = {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                borderRadius: '8px',
              };

              return (
                <div key={index} style={commonStyle}>
                  {isVideo ? (
                    <video src={url} controls autoPlay style={videoStyle} />
                  ) : (
                    <img src={url} alt={`Media ${index}`} style={imageStyle} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
            }}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#fff',
              cursor: 'pointer',
              zIndex: 2,
            }}
            aria-label="Previous media"
          >
            ‹
          </button>

          {/* Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((prev) => (prev + 1) % media.length);
            }}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#fff',
              cursor: 'pointer',
              zIndex: 2,
            }}
            aria-label="Next media"
          >
            ›
          </button>

          {/* Counter */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: '1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '4px 10px',
              borderRadius: '12px',
              userSelect: 'none',
            }}
          >
            {activeIndex + 1} / {media.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaLightbox;
