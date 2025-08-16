import React, { useState, useRef, useEffect } from 'react';
import { TextField, Button, Box, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { BASE_URL, getToken } from "../config";

const MAX_FILES = 5;

const BusinessEventModal = ({
  isOpen,
  onClose,
  businessId,
  onEventSaved,
  mode = 'create',
  initialData = null
}) => {
const isEditMode = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
const [existingMedia, setExistingMedia] = useState([]); // from initialData
const [mediaToRemove, setMediaToRemove] = useState([]);

useEffect(() => {
  if (isEditMode && initialData) {
    setTitle(initialData.title || '');
    setDescription(initialData.description || '');
    setStartDatetime(initialData.start_datetime?.slice(0, 16) || '');
    setEndDatetime(initialData.end_datetime?.slice(0, 16) || '');
    setExistingMedia(initialData.media || []);
  }
}, [initialData, isEditMode]);


  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (mediaFiles.length + files.length > MAX_FILES) {
      alert(`You can upload up to ${MAX_FILES} files.`);
      return;
    }
    setMediaFiles(prev => [...prev, ...files]);
  };

const handleRemoveFile = (index, fromExisting = false) => {
  if (fromExisting) {
    const removed = existingMedia[index];
    setMediaToRemove(prev => [...prev, removed.media_url]);
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  } else {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }
};


  const openFileDialog = () => {
    if (mediaFiles.length >= MAX_FILES) return;
    fileInputRef.current.click();
  };

 const handleSubmit = async () => {
  if (!startDatetime || !endDatetime) {
    alert("Please provide both start and end date & time");
    return;
  }
  if (new Date(startDatetime) > new Date(endDatetime)) {
    alert("End date & time must be after start date & time");
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('start_datetime', startDatetime);
    formData.append('end_datetime', endDatetime);

    mediaFiles.forEach(file => formData.append('media', file));
    mediaToRemove.forEach(url => formData.append('mediaToDelete', url));

    const url = isEditMode
      ? `${BASE_URL}/api/businesses/${businessId}/events/${initialData.id}`
      : `${BASE_URL}/api/businesses/${businessId}/events`;

    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error(`${isEditMode ? 'Update' : 'Create'} failed`);

    const event = await res.json();
    onEventSaved(event);
    onClose();

    setTitle('');
    setDescription('');
    setStartDatetime('');
    setEndDatetime('');
    setMediaFiles([]);
    setExistingMedia([]);
    setMediaToRemove([]);

  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};


  if (!isOpen) return null;
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {isEditMode ? 'Edit Event' : 'Create New Event'}
      </Typography>

      <TextField
        fullWidth
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
        multiline
        rows={3}
      />
      <TextField
        fullWidth
        type="datetime-local"
        label="Start Date & Time"
        InputLabelProps={{ shrink: true }}
        value={startDatetime}
        onChange={(e) => setStartDatetime(e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        type="datetime-local"
        label="End Date & Time"
        InputLabelProps={{ shrink: true }}
        value={endDatetime}
        onChange={(e) => setEndDatetime(e.target.value)}
        margin="normal"
      />

      {/* Media Upload Section */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        {mediaFiles.map((file, index) => {
          const url = URL.createObjectURL(file);
          const isVideo = file.type.startsWith('video');
          return (
            <Box
              key={index}
              sx={{
                position: 'relative',
                width: 90,
                height: 90,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid #ccc',
              }}
            >
              {isVideo ? (
                <video
                  src={url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted loop playsInline
                />
              ) : (
                <img
                  src={url}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => handleRemoveFile(index)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(255,255,255,0.7)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}


{existingMedia.map((media, index) => {
  const isVideo = media.media_type.startsWith('video');
  return (
    <Box
      key={`existing-${index}`}
      sx={{
        position: 'relative',
        width: 90,
        height: 90,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid #ccc',
      }}
    >
      {isVideo ? (
        <video
          src={media.media_url}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted loop playsInline
        />
      ) : (
        <img
          src={media.media_url}
          alt="preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <IconButton
        size="small"
        onClick={() => handleRemoveFile(index, true)}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          bgcolor: 'rgba(255,255,255,0.7)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
})}

        {/* Add file box */}
        {mediaFiles.length < MAX_FILES && (
          <Box
            onClick={openFileDialog}
            sx={{
              width: 90,
              height: 90,
              border: '2px dashed #bbb',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#bbb',
              cursor: 'pointer',
              '&:hover': { borderColor: '#888', color: '#888' },
            }}
            title="Add media"
          >
            <AddIcon fontSize="large" />
          </Box>
        )}
      </Box>

      <input
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Box mt={2}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {isEditMode ? 'Update Event' : 'Create Event'}
        </Button>
        <Button onClick={onClose} sx={{ ml: 2 }}>Cancel</Button>
      </Box>
    </Box>
  );
};

export default BusinessEventModal;
