const MediaAttachment = ({ mediaPreview, handleFileChange, removeMedia }) => {
  return (
    <div className="media-attachment">
      <input
        type="file"
        id="file-input"
        name="media"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="media-preview">
        {mediaPreview.map((media, index) => (
          <div key={index} className="media-preview-item">
            {media.mediaType === 'image' ? (
              <img src={media.preview} alt={`preview-${index}`} />
            ) : media.mediaType === 'video' ? (
              <video controls>
                <source src={media.preview} type="video/mp4" />
              </video>
            ) : (
              <div>Unsupported media type</div>
            )}
            <button className="remove-btn" onClick={() => removeMedia(index)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaAttachment;
