import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication



export async function getDiscussions(limit = 20, page = 1) {
  const url = new URL(`${BASE_URL}/api/discussions`);
  url.searchParams.append('limit', limit);
  url.searchParams.append('page', page);

  const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

export const handleEditDiscussion = async ({
  postToEdit,
  content,
  mediaPreview, // Keep for display logic if needed before server response, but rely on 'data.media' for final state
  files,
  setError,
  mediaToDelete,
  setLoading,
  // REMOVE setPosts from here, it's handled by the callback in CreatePost
  user,
  BASE_URL,
  groupId, // Not used in this specific function, but keep if it applies to other edit handlers
  // REMOVE closeModal from here, it's handled by CreatePost after the API call
}) => {
  setLoading(true); // Indicate loading start

  const formData = new FormData();
  formData.append('content', content);
  formData.append('postType', 'discussion');

  mediaToDelete.forEach(url => {
    formData.append('mediaToDelete[]', url);
  });

  files.forEach(file => {
    formData.append('media', file);
  });

  const url = `${BASE_URL}/api/editdiscussionpost/${postToEdit.postId}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json(); // This 'data' object contains the updated post with 'editedAt'

    if (res.ok) {
      setError(''); // Clear any previous errors
      return data; // <-- IMPORTANT: Return the full updated post data
    } else {
      setError(data.error || 'Failed to update discussion post');
      // If the API call itself failed, you might want to throw an error
      // so the catch block in CreatePost handles it consistently.
      throw new Error(data.error || 'Failed to update discussion post');
    }
  } catch (err) {
    console.error('Edit discussion error:', err);
    setError('An error occurred while updating the discussion post.');
    throw err; // Re-throw to be caught by CreatePost's try/catch
  } finally {
    setLoading(false); // Indicate loading end
  }
};


export const deleteDiscussion = async (postId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/deletediscussion/${postId}`, {
            method: 'DELETE',
            
            headers: {
                'Content-Type': 'application/json', // Good practice
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete discussion ${postId}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting Discussion:', error);
        throw error;
    }
};



export const deleteDiscussionComment = async (postId, commentId) => {
  const res = await fetch(`${BASE_URL}/api/discussion/${postId}/comments/${commentId}`, {
    method: 'DELETE',
   'authentication': `Bearer ${token}`,
  });
  if (!res.ok) throw new Error('Failed to delete discussion comment');
  return await res.json();
};


export async function submitDiscussionComment(postId, { content, files = [], parentCommentId = null }) { // Updated signature
  files = Array.isArray(files) ? files : [];
console.log('Sending:', {
  postid: postId,
  content,
  parentCommentId,
  files,
});
  const formData = new FormData();
  formData.append('postid', postId); // This is likely the question_id
formData.append('content', content || '');


  // Add parent_comment_id to formData if it exists
  if (parentCommentId) { // Add this block
    formData.append('parent_comment_id', parentCommentId); // Make sure your backend expects this field name
  }

  files.forEach(file => {
    formData.append('media', file);
  });

  const res = await fetch(`${BASE_URL}/api/discussion/comments`, { // Is this endpoint for answers AND replies to answers?
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Backend error response:", errorText);
    throw new Error('Failed to post discussion');
  }

  const data = await res.json();
  return data;
}



export const updateDiscussionComment = async (postId, commentId, { content, files = [], parentCommentId = null, mediaToRemove = [] }) => {
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

  const response = await fetch(`${BASE_URL}/api/discussion/comments/${commentId}`, {
    method: 'PUT',
    body: formData, // no headers!
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Server response:', error);
    throw new Error('Failed to update discussion comment');
  }

  return response.json();
};



export const getDiscussionById = async (postId) => {
  const res = await fetch(`${BASE_URL}/api/discussions/${postId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch alert post by ID');
  return await res.json();
};
