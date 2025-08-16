// src/api/comment.js
import { getTipComments, submitTipComment, updateTipComment, deleteTipComment } from './tip';
import { getAnswers, submitAnswer, updateAnswer, deleteAnswer } from './question';
import { BASE_URL, getToken } from "../config";
import{submitAlertComment, updateAlertComment, deleteAlertComment} from './alert';
import {submitDiscussionComment, updateDiscussionComment, deleteDiscussionComment} from './discussion';
import {submitGroupComment, updateGroupComment} from './group';
const token = getToken();

export async function getComments(postType, postId) {
  if (postType === 'question') {
    try {
      const answers = await getAnswers(postId);
      return answers.answers || answers || [];
    } catch (err) {
      throw new Error(`Failed to fetch answers for question ${postId}: ${err.message}`);
    }
  }

  if (postType === 'alert') {
    const res = await fetch(`${BASE_URL}/api/alerts/${postId}/comments`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch alert comments: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data || [];
  }

  if (postType === 'discussion') {
    const res = await fetch(`${BASE_URL}/api/discussion/comments/${postId}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch discussion comments: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data || [];
  }

  if (postType === 'group') {
    const res = await fetch(`${BASE_URL}/api/groups/${postId}/comments`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch group comments: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data || [];
  }

  // Default case (e.g., tip, guide, etc.)
  const res = await fetch(`${BASE_URL}/api/tip_comments/${postType}/${postId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch comments: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.comments || [];
}


export async function submitComment(postType, postId, { content, files = [], parentCommentId = null, groupId = null }) {
  // Create a payload object to pass consistently
  const payload = { content, files, parentCommentId, groupId };

  switch (postType) {
    case 'tip':
      return await submitTipComment(postId, payload); // Already correct, but using payload for consistency
    case 'question':
      // FIX: Pass the payload object here
      return await submitAnswer(postId, payload);
    case 'alert':
      // FIX: Pass the payload object here
      return await submitAlertComment(postId, payload);
    case 'discussion':
      // FIX: Pass the payload object here
      return await submitDiscussionComment(postId, payload);

    case 'group':
      // FIX: Pass the payload object here
      return await submitGroupComment(postId, payload);
    default:
      throw new Error(`Unsupported postType ${postType} in submitComment`);
  }
}



export async function updateCommentOrReply(postType, postId, commentId, { content, files = [], parentCommentId = null, mediaToRemove = [], groupId }) {
  console.log('updateCommentOrReply received:');
    console.log('  postType:', postType);
    console.log('  postId:', postId);
    console.log('  commentId:', commentId); // <-- Crucial log
    console.log('  content:', content);
  // Pass all individual parameters down, as updateAlertComment will construct FormData
  switch (postType) {
    case 'tip':
      // Ensure updateTipComment also uses FormData if it handles files
      return await updateTipComment(postId, commentId, { content, files, parentCommentId, mediaToRemove });
    case 'question':
      // Ensure updateAnswer also uses FormData if it handles files
      return await updateAnswer(postId, commentId, { content, files, parentCommentId, mediaToRemove });
    case 'alert':
      return await updateAlertComment(postId, commentId, { content, files, parentCommentId, mediaToRemove });
    case 'discussion':
      return await updateDiscussionComment(postId, commentId, { content, files, parentCommentId, mediaToRemove });
    case 'group':
      return await updateGroupComment(postId, commentId, { content, files, parentCommentId, mediaToRemove, groupId });
    default:
      throw new Error(`Unsupported postType ${postType} in updateCommentOrReply`);
  }
}



export async function deleteCommentOrReply(postType, postId, id) {
//  console.log('deleteCommentOrReply called with postType:', postType);

  switch (postType) {
    case 'tip':
      return await deleteTipComment(postId, id);
    case 'question':
      return await deleteAnswer(postId, id);  // pass `id` as answerId
    case 'alert':
      return await deleteAlertComment(postId, id);
       case 'discussion':
      return await deleteDiscussionComment(postId, id);
    default:
      throw new Error(`Unsupported postType ${postType} in deleteCommentOrReply`);
  }
}



export async function getUserProfileCommentsSummary(userId) {
    try {
        const res = await fetch(`${BASE_URL}/api/user/${userId}/comments-summary`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Failed to fetch comment summary for user ${userId}:`, errorText);
            throw new Error(`Failed to fetch comment summary: ${errorText}`);
        }

        const data = await res.json();
        return data.totalComments; // The backend sends { totalComments: X }
    } catch (error) {
        console.error(`Error in getUserProfileCommentsSummary for user ${userId}:`, error);
        return 0; // Return 0 comments in case of an error
    }
}