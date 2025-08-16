import { BASE_URL, getToken } from "../config"; // Ensure BASE_URL is correctly imported
const token = getToken(); // Get the token for authentication

export const sharePost = async (postId, postType) => {
    try {
        const response = await fetch(`${BASE_URL}/api/shares`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ post_id: postId, post_type: postType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to share ${postType}. Status: ${response.status}`);
        }
        return response.json(); // This might return the new share object or a success message
    } catch (error) {
        console.error('Error sharing post:', error);
        throw error;
    }
};