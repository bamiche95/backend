// In ../api/group.js
import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication
export const getGroupPosts = async (groupId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/groups/${groupId}/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `API Error for /api/groups/${groupId}/posts: Status ${response.status} ${response.statusText}`,
        errorBody
      );
      throw new Error(`Failed to fetch group posts: ${response.statusText}. Server responded: ${errorBody.substring(0, 200)}...`);
    }

    const data = await response.json();
    return data.posts; // This expects the 'posts' array directly
  } catch (error) {
    console.error('Catch block error in getGroupPosts:', error);
    return [];
  }
};


export const submitGroupComment = async (
  postId,
  { content, files = [], parentCommentId = null, groupId }
) => {
  files = Array.isArray(files) ? files : [];

  const formData = new FormData();
  formData.append('postid', postId);
  formData.append('content', content);

  if (parentCommentId) {
    formData.append('parent_comment_id', parentCommentId);
  }

  files.forEach(file => {
    formData.append('media', file);
  });

  const response = await fetch(`${BASE_URL}/api/groups/${groupId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `API Error for /api/groups/${groupId}/comments: Status ${response.status} ${response.statusText}`,
      errorBody
    );
    throw new Error(
      `Failed to submit group comment: ${response.statusText}. Server responded: ${errorBody.substring(0, 200)}...`
    );
  }

  return await response.json();
};




export const updateGroupComment = async (postId, commentId, { content, files = [], parentCommentId = null, mediaToRemove = [], groupId }) => {
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

  const response = await fetch(`${BASE_URL}/api/groups/${groupId}/comments/${commentId}`, {
    method: 'PUT',
    body: formData, // no headers!
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Server response:', error);
    throw new Error('Failed to update group comment');
  }

  return response.json();
};


//Delete a group posts

export const deleteGroupPost = async (postId, groupId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/groups/${groupId}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json', // Good practice
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete group post ${postId}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting group post:', error);
        throw error;
    }
};