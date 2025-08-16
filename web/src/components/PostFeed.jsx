import React, { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import io from "socket.io-client";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  path: "/socket.io",
  transports: ["websocket"],
});

const PostFeed = ({
  postLabel = "Post",
  fetchPosts,
  fetchReplies,
  submitReply,
  socketEvent,
  renderReplyInput,
  renderReplies,
  renderPostHeader,
}) => {
  const [posts, setPosts] = useState([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [replyInputs, setReplyInputs] = useState({});
  const { ref, inView } = useInView();

  useEffect(() => {
    loadMorePosts();
    socket.on(socketEvent, (newItem) => {
      setPosts((prev) =>
        prev.map((post) =>
          post._id === newItem.postId
            ? { ...post, replies: [...post.replies, newItem] }
            : post
        )
      );
    });
    return () => {
      socket.off(socketEvent);
    };
  }, []);

  useEffect(() => {
    if (inView && hasMore) {
      loadMorePosts();
    }
  }, [inView]);

  const loadMorePosts = async () => {
    const newPosts = await fetchPosts(skip);
    const enriched = await Promise.all(
      newPosts.map(async (post) => {
        const replies = await fetchReplies(post._id);
        return { ...post, replies };
      })
    );
    setPosts((prev) => [...prev, ...enriched]);
    setSkip((prev) => prev + newPosts.length);
    if (newPosts.length === 0) setHasMore(false);
  };

  const handleReplySubmit = async (postId) => {
    const content = replyInputs[postId]?.trim();
    if (!content) return;
    const reply = await submitReply(postId, content);
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, replies: [...post.replies, reply] }
          : post
      )
    );
    setReplyInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post._id} className="bg-white shadow rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-gray-900">{post.user.name}</p>
              <p className="text-xs text-gray-500">@{post.user.username}</p>
            </div>
            {renderPostHeader?.(post)}
          </div>
          <p className="text-gray-800">{post.content}</p>
          {renderReplies?.(post.replies)}
          <div className="space-y-2">
            {renderReplyInput ? (
              renderReplyInput({
                value: replyInputs[post._id] || "",
                onChange: (val) =>
                  setReplyInputs((prev) => ({ ...prev, [post._id]: val })),
                onSubmit: () => handleReplySubmit(post._id),
              })
            ) : (
              <div className="flex items-end gap-2">
                <TextareaAutosize
                  placeholder={`Write a reply...`}
                  className="border p-2 rounded w-full text-sm"
                  value={replyInputs[post._id] || ""}
                  onChange={(e) =>
                    setReplyInputs((prev) => ({
                      ...prev,
                      [post._id]: e.target.value,
                    }))
                  }
                />
                <Button
                  size="sm"
                  onClick={() => handleReplySubmit(post._id)}
                >
                  Reply
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      {hasMore && <div ref={ref} className="text-center py-4 text-gray-400">Loading more...</div>}
    </div>
  );
};

export default PostFeed;
