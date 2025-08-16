//api/like.js
import { BASE_URL, getToken } from "../config"; // Make sure BASE_URL is correctly imported
const token = getToken(); // Get the token for authentication
export const likePost = async (postId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/like`, {
            method: 'POST',
           
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            // IMPORTANT: Match backend expected keys for table columns (snake_case if your backend expects it, or camelCase)
            body: JSON.stringify({ post_id: postId, post_type: postType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to like ${postType}. Status: ${response.status}`);
        }
        // Assuming your backend returns a JSON object on success, e.g., { message: "...", likeId: ... }
        return response.json();
    } catch (error) {
        console.error('Error liking post:', error);
        throw error;
    }
};

export const unlikePost = async (postId, postType) => {
    try {
        // The DELETE endpoint is expected to use path parameters for postId and postType
        const response = await fetch(`${BASE_URL}/api/like/${postId}/${postType}`, {
            method: 'DELETE',
         
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to unlike ${postType}. Status: ${response.status}`);
        }
        // For DELETE, if the backend returns 204 No Content, response.json() would fail.
        // Check content type or status to handle accordingly.
        // Assuming it might return a success message or just a status.
        return response.status === 204 ? {} : response.json(); // Return empty object for 204 No Content
    } catch (error) {
        console.error('Error unliking post:', error);
        throw error;
    }
};



export async function getUserProfileLikesSummary(userId) {
    try {
        const res = await fetch(`${BASE_URL}/api/user/${userId}/likes-summary`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Failed to fetch like summary for user ${userId}:`, errorText);
            throw new Error(`Failed to fetch like summary: ${errorText}`);
        }

        const data = await res.json();
        return data.totalLikes; // The backend sends { totalLikes: X }
    } catch (error) {
        console.error(`Error in getUserProfileLikesSummary for user ${userId}:`, error);
        return 0; // Return 0 likes in case of an error
    }
}