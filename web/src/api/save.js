// src/api/save.js
import { BASE_URL, getToken } from "../config"; // Ensure BASE_URL is correctly imported
const token = getToken(); // Get the token for authentication

export const savePost = async (postId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/saved_posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            // IMPORTANT: Match backend expected keys for table columns (snake_case)
            body: JSON.stringify({ post_id: postId, post_type: postType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to save ${postType}. Status: ${response.status}`);
        }
        // This should return the newly created saved post object, including its 'id' (primary key)
        return response.json();
    } catch (error) {
        console.error('Error saving post:', error);
        throw error;
    }
};

// CORRECTED: unsavePost function to accept `savedPostId`
export const unsavePost = async (savedPostId) => {
    try {
        // The DELETE endpoint should target the specific saved_post entry by its primary key 'id'
        const response = await fetch(`${BASE_URL}/api/saved_posts/${savedPostId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json', // Often not strictly needed for DELETE, but good practice
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Provide a more specific error message if the backend also sends one
            throw new Error(errorData.message || `Failed to unsave post. Status: ${response.status}`);
        }
        // For DELETE, you often don't need to parse JSON if backend returns 204 No Content
        // or a simple success message. If it returns JSON, parse it.
        // Assuming it might return a success message or just a status.
        return response.status === 204 ? {} : response.json(); // Return empty object for 204 No Content
    } catch (error) {
        console.error('Error unsaving post:', error);
        // This is a good place to add more specific client-side error handling
        // if your backend provides distinct error responses for "not found" vs. other issues.
        if (error.message.includes('404')) { // Check if the error message contains '404' (from backend)
            throw new Error('Saved post not found for this user or already unsaved.');
        }
        throw error;
    }
};


export const fetchSavedPosts = async () => {
    try {
        // Endpoint to get current user's saved posts. `me` is a good convention.
        const response = await fetch(`${BASE_URL}/api/saved_posts/me`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch saved posts. Status: ${response.status}`);
        }
        const data = await response.json();
        
        return data;
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        throw error;
    }
};

export const getUserProfileTotalSavesExcludingOwn = async (profileUserId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/user/${profileUserId}/saves-summary-excluding-own`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Check if the response body is JSON before trying to parse
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        return data.totalSaves;
    } catch (error) {
        console.error("Error fetching user profile total saves (excluding own):", error);
        return 0; // Return 0 on error to prevent UI breaking
    }
};