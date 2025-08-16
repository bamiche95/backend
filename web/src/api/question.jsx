// src/api/questions.js

import { BASE_URL, getToken } from "../config";

// Get all questions
export async function getQuestions() {
  const res = await fetch(`${BASE_URL}/api/questions`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

// Get answers for a question
export async function getAnswers(postId) {
  const res = await fetch(`${BASE_URL}/api/answers/${postId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Failed to fetch answers');
  return res.json();
}

// Get answer count
export async function getAnswerCount(postId) {
  const res = await fetch(`${BASE_URL}/api/answers/${postId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
  const data = await res.json();
  return data.count;
}

/// frontend/api/comment.js (or wherever submitAnswer is)
export async function submitAnswer(postId, { content, files = [], parentCommentId = null }) { // Updated signature
  files = Array.isArray(files) ? files : [];

  const formData = new FormData();
  formData.append('postid', postId); // This is likely the question_id
  formData.append('content', content);

  // Add parent_comment_id to formData if it exists
  if (parentCommentId) { // Add this block
    formData.append('parent_comment_id', parentCommentId); // Make sure your backend expects this field name
  }

  files.forEach(file => {
    formData.append('media', file);
  });

  const res = await fetch(`${BASE_URL}/api/answer`, { // Is this endpoint for answers AND replies to answers?
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Backend error response:", errorText);
    throw new Error('Failed to post answer');
  }

  const data = await res.json();
  return data;
}

export const handleEditQuestion = async ({
  postToEdit,
  content,
  mediaPreview, // Not directly used in the API call, but kept for consistency
  files,
  setError,
  mediaToDelete, // Must be an array of media IDs
  setLoading,
  // REMOVED: setPosts, userLocation, selectedAlertType, closeModal
  // These will be handled by the calling component (CreatePost)
  // or are already available in the scope of the API helper.
  user, // user is not directly used in this function's formData, but often helpful
  BASE_URL, // BASE_URL is needed for the fetch URL
  groupId,
  selectedProfessions,
}) => {
  setLoading(true); // Indicate loading start

  const formData = new FormData();
  formData.append('content', content);
  formData.append('postType', 'question');

  selectedProfessions.forEach(p => {
    formData.append('professions[]', p.proid);
  });

  mediaToDelete.forEach(id => {
    formData.append('mediaToDelete[]', id);
  });

  files.forEach(file => {
    formData.append('media', file); // Ensure 'media' is the correct key for new files
  });

  // Construct the URL, including groupId if applicable
  const url = `${BASE_URL}/api/editquestionpost/${postToEdit.postId}${groupId ? `?groupId=${groupId}` : ''}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: formData,
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setError(''); // Clear any previous errors on success
      return data; // <-- IMPORTANT: Return the full updated post data
    } else {
      let errorMessage = 'Failed to update question post.';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        // Fallback to status text if response isn't JSON
        errorMessage = `Failed to update question post: ${res.status} ${res.statusText}`;
      }
      setError(errorMessage);
      throw new Error(errorMessage); // Propagate error
    }
  } catch (err) {
    console.error('Edit question error:', err);
    const genericErrorMessage = 'An unexpected error occurred while updating the question post.';
    setError(genericErrorMessage); // Set a user-friendly error
    throw new Error(genericErrorMessage); // Propagate a generic error for the UI
  } finally {
    setLoading(false); // Ensure loading is turned off in all cases
  }
};



//Delete questions post

export async function deleteQuestion(postId) {
    try {
        const response = await fetch(`${BASE_URL}/api/questions/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json', // Good practice
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete question ${postId}`);
        }

        // Return a success message or just true
        return await response.json();
    } catch (error) {
        console.error('Error deleting question:', error);
        throw error;
    }
}

export const saveQuestion = async (postId) => {
    const response = await fetch(`/api/savequestion/${postId}/save`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }});
    if (!response.ok) throw new Error('Failed to save tip');
    return response.json();
};

export const unsaveQuestion = async (postId) => {
    const response = await fetch(`/api/unsavequestion/${postId}/unsave`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } }); // Or DELETE
    if (!response.ok) throw new Error('Failed to unsave tip');
    return response.json();
};


export const updateAnswer = async (postId, commentId, { content, files, parentCommentId, mediaToRemove = [] }) => {
  const formData = new FormData();
  formData.append('content', content);
  if (parentCommentId) formData.append('parentCommentId', parentCommentId);
  
  files.forEach(file => formData.append('files', file));
  mediaToRemove.forEach(url => formData.append('mediaToRemove', url));

  const response = await fetch(`${BASE_URL}/api/questions/${postId}/answers/${commentId}`, {
    method: 'PUT',
    body: formData,
    headers: { 'Authorization': `Bearer ${token}` },
    // Do NOT set Content-Type manually; browser sets it with boundary automatically for FormData
  });

  if (!response.ok) {
    throw new Error('Failed to update question answer');
  }

  return response.json();
};



export const deleteAnswer = async (postId, answerId) => {
  const res = await fetch(`${BASE_URL}/api/questions/${postId}/answers/${answerId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete question answer');
  return await res.json();
};


export async function getQuestionById(postId) {
  const res = await fetch(`${BASE_URL}/api/questions/${postId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}