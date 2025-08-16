// /api/reportPosts.js
import {BASE_URL, getToken} from "../config";
const token = getToken(); // Get the token for authentication
export async function reportPost({ postId, postType, reason, description }) {
  const res = await fetch(`${BASE_URL}/api/reportpost`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ postId, postType, reason, description }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to report post');
  }

  return await res.json();
}