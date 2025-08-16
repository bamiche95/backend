// src/api/tip.js
import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication



export const fetchTipComments = async (postId) => {
  const response = await fetch(`${BASE_URL}/tips/${postId}/comments`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
};

export const submitTipComment = async (tipId, { content, files, parentCommentId = null }) => {
  // If no text content but has media files, send a placeholder content
  if ((!content || !content.trim()) && files && files.length > 0) {
    content = " "; // single space as placeholder so backend validation passes
  }

  const formData = new FormData();
  formData.append('post_type', 'tip');
  formData.append('post_id', tipId);
  formData.append('content', content);
  if (parentCommentId) {
    formData.append('parent_comment_id', parentCommentId);
  }

  (files || []).forEach(file => {
    formData.append('mediaFiles', file);
  });

  const res = await fetch(`${BASE_URL}/api/tip_comments`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Tip comment submission failed:", errorText);
    throw new Error('Failed to submit comment');
  }

  return res.json();
};


// api/tip.js (or wherever you keep API calls)
export const getTipComments = async (postId) => {
  const res = await fetch(`/api/tip_comments/tip/${postId}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch tip comments');
  }
  const data = await res.json();
  return data.comments || [];
};


export const handleEditTip = async ({
  postToEdit,
  title,
  categoryId,
  content,
  mediaPreview,
  files,
  setError,
  mediaToDelete,
  setLoading,
  // REMOVE setPosts from here
  user,
  BASE_URL,
}) => {
  setLoading(true);

  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('categoryId', categoryId);
    formData.append('content', content);

    if (mediaToDelete && mediaToDelete.length > 0) {
      formData.append('mediaToDelete', JSON.stringify(mediaToDelete));
    }
    files.forEach(file => formData.append('mediaFiles', file));

    const res = await fetch(`${BASE_URL}/api/edittip/${postToEdit.id}`, { // Assuming postToEdit.postId is the tipId
      method: 'PUT',
      body: formData,
      credentials: 'include',
    });

    const data = await res.json();

    if (res.ok) {
      setError('');
      return data; // <-- IMPORTANT: Return the full updated post data
    } else {
      setError(data.error || 'Failed to update tip post');
      throw new Error(data.error || 'Failed to update tip post');
    }
  } catch (err) {
    setError('An error occurred while updating the tip post.');
    throw err;
  } finally {
    setLoading(false);
  }
};




//Delete Tip Post card

export const deleteTip = async (tipId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/tips/${tipId}`, {
            method: 'DELETE',
            credentials: 'include', // Important for session cookies
            headers: {
                'Content-Type': 'application/json', // Good practice
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete tip ${tipId}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting tip:', error);
        throw error;
    }
};



export const updateTipComment = async (postId, commentId, { content, files = [], parentCommentId = null, mediaToRemove = [] }) => {
  const formData = new FormData();

  if (content) formData.append('content', content);
  if (parentCommentId) formData.append('parentCommentId', parentCommentId);
  if (mediaToRemove.length > 0) {
    formData.append('mediaToRemove', JSON.stringify(mediaToRemove));
  }

  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append('mediaFiles', file); // must match multer field name
    });
  }

  const response = await fetch(`${BASE_URL}/api/tips/${postId}/comments/${commentId}`, {
    method: 'PUT',
    body: formData, // no headers!
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Server response:', error);
    throw new Error('Failed to update tip comment');
  }

  return response.json();
};


export const deleteTipComment = async (postId, commentId) => {
  const res = await fetch(`${BASE_URL}/api/tips/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete tip comment');
  return await res.json();
};



export const getTipById = async (postId) => {
  const response = await fetch(`${BASE_URL}/api/nearby_tips/${postId}`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
};
