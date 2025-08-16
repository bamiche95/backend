import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import FormHelperText from '@mui/material/FormHelperText';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext'; // Adjust the import path as needed
import { BASE_URL, getToken } from "../config"; // Adjust the import path as needed
const token = getToken(); // Get the token for authentication



export default function CreateGroupPost({ open, onClose, userId, groupId, postToEdit, // <-- NEW
  isEditing = false, setPosts, setLoading }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth(); // Assuming you have a context for auth
  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState([]); // Array of { file, previewUrl }
  const [mediaToDelete, setMediaToDelete] = useState([]);


  useEffect(() => {
    if (isEditing && postToEdit) {
      setContent(postToEdit.content || '');
      setMediaToDelete([]); // Reset
      if (postToEdit.media && postToEdit.media.length > 0) {
        setMediaItems(
          postToEdit.media.map((m) => ({
            file: null,
            previewUrl: m.mediaUrl,
            existing: true,
          }))
        );
      }
    }
  }, [isEditing, postToEdit]);


  const handleRemoveMedia = (index) => {
    const item = mediaItems[index];
    if (item.existing && item.previewUrl) {
      setMediaToDelete((prev) => [...prev, item.previewUrl]);
    }
    const updatedItems = [...mediaItems];
    updatedItems.splice(index, 1);
    setMediaItems(updatedItems);
  };




  // Generate previews when mediaFiles changes
  useEffect(() => {
    return () => {
      mediaItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, [mediaItems]);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    const items = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setMediaItems(items);
  };



const handleSubmit = async () => {
  if (!content) {
    alert('Content is required');
    return;
  }

  const sanitizedContent = DOMPurify.sanitize(content);
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('content', sanitizedContent);

  mediaItems.forEach(item => {
    if (!item.existing && item.file) {
      formData.append('media', item.file);
    }
  });

  if (mediaToDelete.length > 0) {
    formData.append('mediaToDelete', JSON.stringify(mediaToDelete));
  }

  try {
    const url = isEditing
      ? `${BASE_URL}/api/groups/${groupId}/posts/${postToEdit.id || postToEdit.postId}`
      : `${BASE_URL}/api/groups/${groupId}/posts`;

    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to save post');
    const data = await response.json();

    alert(isEditing ? 'Post updated!' : 'Post created!');

    if (setPosts) {
      setPosts((prev) => {
        if (isEditing) {
          // Replace the updated post in the list
          return prev.map((p) =>
            p.id === data.updatedPost.id ? data.updatedPost : p
          );
        } else {
          // Prepend the new post to the top of the feed
          return [data.post, ...prev];
        }
      });
    }

    // Reset and close
    setContent('');
    setMediaItems([]);
    setMediaToDelete([]);
    onClose();
  } catch (error) {
    console.error(error);
    alert('Something went wrong!');
  }
};



  const handleClose = () => {
    setContent('');
    setMediaItems([]);
    setMediaToDelete([]);
    onClose();
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={onClose}
      aria-labelledby="responsive-dialog-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="responsive-dialog-title">
        {isEditing ? 'Edit your post' : 'Create a new post'}
      </DialogTitle>
      <DialogContent>
        
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel htmlFor="post-content">What do you want to share with group members</InputLabel>
              <Input
                id="post-content"
                multiline
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                aria-describedby="post-content-helper-text"
              />
              <FormHelperText id="post-content-helper-text">You can add videos and images.</FormHelperText>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaChange}
                id="media-upload"
                style={{ display: 'none' }} // hide native input
              />
              <Button variant="outlined" component="span" onClick={() => document.getElementById('media-upload').click()}>
                Attach files
              </Button>
            </FormControl>

            {/* Media previews */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {mediaItems.map((item, idx) => {
                const { file, previewUrl } = item;

                if (file && file.type.startsWith('image/')) {
                  return (
                    <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={previewUrl}
                        alt={`preview-${idx}`}
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Button
                        size="small"
                        onClick={() => handleRemoveMedia(idx)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          minWidth: 'auto',
                          padding: '2px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          color: 'black',
                        }}
                      >
                        ✕
                      </Button>
                    </Box>

                  );
                } else if (file && file.type.startsWith('video/')) {
                  return (
                    <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                      <video
                        src={previewUrl}
                        controls
                        preload="metadata"
                        style={{ width: 100, height: 100, borderRadius: 4, objectFit: 'cover' }}
                      />
                      <Button
                        size="small"
                        onClick={() => handleRemoveMedia(idx)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          minWidth: 'auto',
                          padding: '2px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          color: 'black',
                        }}
                      >
                        ✕
                      </Button>
                    </Box>

                  );
                } else {
                  // Existing server media: infer type from URL
                  const isImage = previewUrl.match(/\.(jpe?g|png|gif|webp)$/i);
                  const isVideo = previewUrl.match(/\.(mp4|webm|ogg)$/i);

                  if (isImage) {
                    return (
                      <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={previewUrl}
                          alt={`preview-${idx}`}
                          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Button
                          size="small"
                          onClick={() => handleRemoveMedia(idx)}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            minWidth: 'auto',
                            padding: '2px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            color: 'black',
                          }}
                        >
                          ✕
                        </Button>
                      </Box>

                    );
                  } else if (isVideo) {
                    return (
                      <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                        <video
                          src={previewUrl}
                          controls
                          preload="metadata"
                          style={{ width: 100, height: 100, borderRadius: 4, objectFit: 'cover' }}
                        />
                        <Button
                          size="small"
                          onClick={() => handleRemoveMedia(idx)}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            minWidth: 'auto',
                            padding: '2px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            color: 'black',
                          }}
                        >
                          ✕
                        </Button>
                      </Box>

                    );
                  }

                  return null;
                }
              })}

            </Box>
          </Box>
        
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} autoFocus>
          {isEditing ? 'Update' : 'Post'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
