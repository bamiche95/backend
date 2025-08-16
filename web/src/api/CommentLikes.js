// Assuming you have a config file with BASE_URL
// For example, src/api/config.js:
// export const BASE_URL = 'http://localhost:3001'; // Or your backend URL
import { BASE_URL, getToken } from "../config";

const token = getToken(); // Get the token for authentication
// Liking a top-level comment
export const likeComment = async (commentId, postId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/comments/${commentId}/like`, {
            method: 'POST',
          
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ postId, postType }), // Send postId for backend verification/context
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to like comment. Status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Error liking comment ${commentId}:`, error);
        throw error;
    }
};

// Unliking a top-level comment
export const unlikeComment = async (commentId, postId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/comments/${commentId}/like`, {
            method: 'DELETE',
          
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ postId, postType }), // Send postId for backend verification/context
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to unlike comment. Status: ${response.status}`);
        }
        return response.status === 204 ? {} : response.json(); // Handle 204 No Content for DELETE
    } catch (error) {
        console.error(`Error unliking comment ${commentId}:`, error);
        throw error;
    }
};

// Liking a reply (which is also a comment, but nested)
export const likeReply = async (replyId, postId, parentCommentId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/replies/${replyId}/like`, {
            method: 'POST',
         
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ postId, parentCommentId, postType }), // Crucial for reply likes
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to like reply. Status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Error liking reply ${replyId}:`, error);
        throw error;
    }
};

// Unliking a reply
export const unlikeReply = async (replyId, postId, parentCommentId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/replies/${replyId}/like`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ postId, parentCommentId, postType }), // Crucial for reply likes
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to unlike reply. Status: ${response.status}`);
        }
        return response.status === 204 ? {} : response.json(); // Handle 204 No Content for DELETE
    } catch (error) {
        console.error(`Error unliking reply ${replyId}:`, error);
        throw error;
    }
};
