import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { SquareArrowUp } from 'lucide-react';
import { BASE_URL, getToken } from "../config";
function Answer({ answer, postId, onLikeChange }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(answer.liked || false);
  const [likeCount, setLikeCount] = useState(answer.likeCount || 0);
  const [loading, setLoading] = useState(false);
const token = getToken(); // Get the token for authentication
  const handleLike = async () => {
    if (!user) return alert('Please log in to like');

    if (loading) return; // prevent double clicks
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/answer/${answer.answerId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(prev => prev + (data.liked ? 1 : -1));

        // Inform parent about like count change (optional)
        if (onLikeChange) {
          onLikeChange(answer.answerId, data.liked ? 1 : -1);
        }
      } else {
        console.error('Failed to toggle like:', data.error);
      }
    } catch (error) {
      console.error('Error liking answer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mt={2} display="flex" alignItems="center" gap={2} cursor="pointer" onClick={handleLike} userSelect="none">
     <SquareArrowUp size={20} strokeWidth={1} color={liked ? 'blue' : 'black'} />
      Votes {likeCount}
    </Box>
  );
}
export default Answer;