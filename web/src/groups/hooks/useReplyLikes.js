import { useState, useEffect } from 'react';
import { socket } from './socket'; // wherever your socket.io client lives

/**
 * @param {number[]} postIds    Array of post IDs when not in a group context
 * @param {number}   [groupId]  Optional groupId when in group context
 */
export function useReplyLikes(postIds, groupId) {
  const [likesMap, setLikesMap] = useState({}); 
  // { [replyCommentId]: { likeCount, likedByUser: [] } }

  // 1) Fetch initial data on mount or when postIds/groupId change
  useEffect(() => {
    const body = groupId ? { groupId } : { postIds };
    fetch('/api/getReplyLikes', {
      method: 'POST',
      headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.success) throw new Error(json.error);
        const map = {};
        json.data.forEach(({ replyCommentId, likeCount, likedByUser }) => {
          map[replyCommentId] = { likeCount, likedByUser };
        });
        setLikesMap(map);
      })
      .catch(console.error);
  }, [JSON.stringify(postIds), groupId]);

  // 2) Listen for real-time updates
  useEffect(() => {
    function onLike({ replyId, userId }) {
      setLikesMap(prev => {
        const entry = prev[replyId] || { likeCount: 0, likedByUser: [] };
        // only add if not already present
        if (!entry.likedByUser.includes(userId)) {
          return {
            ...prev,
            [replyId]: {
              likeCount: entry.likeCount + 1,
              likedByUser: [...entry.likedByUser, userId],
            },
          };
        }
        return prev;
      });
    }

    function onUnlike({ replyId, userId }) {
      setLikesMap(prev => {
        const entry = prev[replyId];
        if (!entry) return prev;
        return {
          ...prev,
          [replyId]: {
            likeCount: Math.max(entry.likeCount - 1, 0),
            likedByUser: entry.likedByUser.filter(id => id !== userId),
          },
        };
      });
    }

    socket.on('reply-liked', onLike);
    socket.on('reply-unliked', onUnlike);
    return () => {
      socket.off('reply-liked', onLike);
      socket.off('reply-unliked', onUnlike);
    };
  }, []);

  return likesMap;
}
