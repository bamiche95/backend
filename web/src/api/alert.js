import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token dynamically
export async function getAlerts(lat, lng, radius = 5, userId = null) {
  const token = getToken(); // ✅ Get fresh token on each call

  let url;
  if (userId) {
    // Fetch alerts by user ID
    url = `${BASE_URL}/api/alerts?userId=${userId}`;
  } else {
    if (lat === null || lng === null) {
      console.warn("Attempted to fetch general alerts without lat/lng. Returning empty array.");
      return [];
    }
    url = `${BASE_URL}/api/alerts?lat=${lat}&lng=${lng}&radius=${radius}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch alerts:', text);
      throw new Error('Failed to fetch alerts');
    }

    return res.json();
  } catch (error) {
    console.error('Network or parsing error fetching alerts:', error);
    throw error;
  }
}



// Submit a new alert
export async function submitAlert(content, files = []) {
  const formData = new FormData();
  formData.append('content', content);

  files.forEach(file => {
    formData.append('media', file);
  });

  const res = await fetch(`${BASE_URL}/api/alert`, {
    method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    body: formData
  });

  if (!res.ok) throw new Error('Failed to post alert');
  return res.json();
}

// Get alert count
export async function getAlertCount(alertId) {
  const res = await fetch(`${BASE_URL}/api/alerts/${alertId}`);
  const data = await res.json();
  return data.count;
}
// frontend/api/comment.js (or wherever submitAlertComment is)
// Ensure submitAlertComment signature is like this:
export async function submitAlertComment(alertId, { content, files = [], parentCommentId = null }) {
  const formData = new FormData();
  formData.append('content', content);
console.log ('Form received and sends the parent comment id', parentCommentId);
  if (parentCommentId) {
    formData.append('parent_comment_id', parentCommentId);
  }

  files.forEach(file => {
    formData.append('mediaFiles', file); // Make sure this matches your backend field name for alerts
  });

  const res = await fetch(`${BASE_URL}/api/alerts/${alertId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to post alert comment:', text);
    throw new Error('Failed to post alert comment');
  }

  return res.json();
}


// in api/alert.js
// in api/alert.js
export const handleEditAlert = async ({
  postToEdit,
  userLocation,
  selectedAlertType,
  content,
  mediaPreview, // Not directly used in the API call, but kept for consistency
  files,
  setError,
  mediaToDelete,
  setLoading,
  // REMOVED: setPosts, user, BASE_URL, groupId, closeModal
  // These will be handled by the calling component (CreatePost)
  // or are already available in the scope of the API helper.
  user, // user is needed for formData
  BASE_URL, // BASE_URL is needed for the fetch URL
  groupId, // groupId might be relevant if alerts can be group-specific, but not currently used in the URL for updatealerts
}) => {
  setLoading(true); // Indicate loading start

  if (!userLocation.lat || !userLocation.lng) {
    const errorMsg = 'Please enable location or select location on the map.';
    setError(errorMsg);
    setLoading(false);
    throw new Error(errorMsg); // Propagate error
  }

  if (!selectedAlertType) {
    const errorMsg = 'Please select an alert type.';
    setError(errorMsg);
    setLoading(false);
    throw new Error(errorMsg); // Propagate error
  }

  const formData = new FormData();
  if (mediaToDelete.length > 0) {
    // Ensure mediaToDelete is appended correctly for your backend to parse
    formData.append('mediaToDelete', JSON.stringify(mediaToDelete));
  }
  formData.append('userId', user?.id); // Ensure user object is available
  formData.append('alertTypeId', selectedAlertType.toString());
  formData.append('title', content.slice(0, 50));
  formData.append('description', content); // Backend expects 'description'
  formData.append('latitude', userLocation.lat.toString());
  formData.append('longitude', userLocation.lng.toString());
  formData.append('postType', 'alert'); // Ensure this is always 'alert' for alert updates
  files.forEach((file) => formData.append('mediaFiles', file)); // Ensure 'mediaFiles' is the correct key

  const url = `${BASE_URL}/api/updatealerts/${postToEdit.id}`; // Assuming postToEdit.id is the alert ID

  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setError(''); // Clear any previous errors on success
      return data; // <-- IMPORTANT: Return the full updated post data
    } else {
      let errorMessage = 'Failed to update alert.';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        // Fallback to status text if response isn't JSON
        errorMessage = `Failed to update alert: ${res.status} ${res.statusText}`;
      }
      setError(errorMessage);
      throw new Error(errorMessage); // Propagate error
    }
  } catch (err) {
    console.error("Network or unexpected error during alert update:", err);
    const genericErrorMessage = 'An unexpected error occurred while editing alert.';
    setError(genericErrorMessage); // Set a user-friendly error
    throw new Error(genericErrorMessage); // Propagate a generic error for the UI
  } finally {
    setLoading(false); // Ensure loading is turned off in all cases
  }
};
// Add this new function for deleting an alert

export const deleteAlert = async (alertId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/alerts/${alertId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // No 'body' needed for userId anymore
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete alert ${alertId}`);
        }

        return await response.json(); // Or just return true/success message
    } catch (error) {
        console.error('Error deleting alert:', error);
        throw error;
    }
};




export const updateAlertComment = async (postId, commentId, { content, files, parentCommentId, mediaToRemove = [] }) => {
  const formData = new FormData();

  // Append text content
  if (content !== null && content !== undefined) {
    formData.append('content', content);
  }
  if (parentCommentId !== null) {
    formData.append('parent_comment_id', parentCommentId);
  }

  // Append new files
  files.forEach((file) => {
    formData.append('mediaFiles', file); // 'mediaFiles' matches your multer field name
  });

  // Append media IDs to remove (as an array, which FormData will convert to multiple fields)
  mediaToRemove.forEach((mediaId) => {
    formData.append('mediaToRemove[]', mediaId); // Use '[]' to indicate it's an array
  });

  const response = await fetch(`${BASE_URL}/api/alerts/${postId}/comments/${commentId}`, {
    method: 'PUT',
    // DO NOT set 'Content-Type': 'multipart/form-data' explicitly.
    // Fetch API will automatically set the correct Content-Type header with the boundary
    // when you provide a FormData object as the body.
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    // Attempt to parse error response from server
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to update alert comment: ${response.status} ${response.statusText}`);
  }

  return response.json();
};



export const deleteAlertComment = async (postId, commentId) => {
  const res = await fetch(`${BASE_URL}/api/alerts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete alert comment');
  return await res.json();
};


export const getAlertById = async (postId) => {
  const res = await fetch(`${BASE_URL}/api/alerts/${postId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch alert post by ID');
  return await res.json();
};
