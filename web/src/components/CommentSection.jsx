import React, { useState, useEffect, useCallback } from 'react';
import CommentItem from './CommentItem'; // Import the new CommentItem component
import { ImagePlay } from 'lucide-react';
import { updateCommentOrReply, deleteCommentOrReply } from "@/api/comment";

const CommentSection = ({
    postId,
    comments: initialComments, // Rename to initialComments to distinguish from internal state
    currentUser,
    groupId,
    commentText,
    setCommentText,
    mediaFiles,
    setMediaFiles,
    mediaPreview,
    setMediaPreview,
    handleGenericSubmit, // Main submit handler for comments/replies
    postType,
    onCommentsRefetchOrUpdate,

}) => {
    const [activeCommentTargetId, setActiveCommentTargetId] = useState(null);
    // Manage comments internally to allow for immediate UI updates on delete
    const [localComments, setLocalComments] = useState(initialComments);

    // Update local comments state when the initialComments prop changes (e.g., after a full data fetch)
    useEffect(() => {
        setLocalComments(initialComments);
    }, [initialComments]);

    const findCommentById = useCallback((commentList, id) => {
        for (const c of commentList) {
            if (c.id === id) return c;
            if (c.replies && c.replies.length > 0) {
                const foundInReplies = findCommentById(c.replies, id);
                if (foundInReplies) return foundInReplies;
            }
        }
        return null;
    }, []);

    // New helper function to recursively remove a comment or reply from the nested structure
    const removeCommentFromTree = useCallback((commentList, commentIdToRemove) => {
        return commentList
            .filter(comment => comment.id !== commentIdToRemove) // Filter out the current comment if it's the target
            .map(comment => {
                // If the comment has replies, recursively call this function on its replies
                if (comment.replies && comment.replies.length > 0) {
                    const updatedReplies = removeCommentFromTree(comment.replies, commentIdToRemove);
                    // Only return a new comment object if its replies actually changed,
                    // to prevent unnecessary re-renders for unchanged branches.
                    if (updatedReplies.length !== comment.replies.length || updatedReplies.some((r, i) => r !== comment.replies[i])) {
                        return { ...comment, replies: updatedReplies };
                    }
                }
                return comment; // Return the comment as is if no change or no replies
            });
    }, []);


    const handleCommentDeleted = useCallback((commentIdToDelete) => {
        // Update the localComments state using the recursive helper function
        setLocalComments(prevComments => removeCommentFromTree(prevComments, commentIdToDelete));

        // If an external refetch mechanism exists, still call it for backend data consistency,
        // but the UI will update immediately via local state.
        if (onCommentsRefetchOrUpdate) {
            onCommentsRefetchOrUpdate(postId);
        }
    }, [postId, onCommentsRefetchOrUpdate, removeCommentFromTree]); // Dependencies for useCallback

    // --- Handlers for the main post comment input ---
    const onMainCommentTextChange = (e) => {
        setCommentText(postId, e.target.value);
    };

    const onMainMediaChange = (e) => {
        mediaPreview[postId]?.forEach(url => URL.revokeObjectURL(url));
        const files = Array.from(e.target.files);
        setMediaFiles(postId, files);
        const previews = files.map(file => URL.createObjectURL(file));
        setMediaPreview(postId, previews);
    };

    const sendMainComment = () => {
        const hasText = commentText[postId]?.trim().length > 0;
        const hasMedia = mediaFiles[postId]?.length > 0;
        if (hasText || hasMedia) {
            handleGenericSubmit( postId, null, commentText[postId], mediaFiles[postId], groupId);
            setCommentText(postId, '');
            setMediaFiles(postId, []);
            setMediaPreview(postId, []);
        }
    };

    const removeMainMediaAtIndex = (index) => {
        const urlToRevoke = mediaPreview[postId][index];
        URL.revokeObjectURL(urlToRevoke);

        const newPreviews = mediaPreview[postId].filter((_, i) => i !== index);
        const newFiles = mediaFiles[postId].filter((_, i) => i !== index);

        setMediaPreview(postId, newPreviews);
        setMediaFiles(postId, newFiles);
    };

    const handleCommentLikeUpdate = useCallback((commentId, newIsLikedStatus) => {
        // This function triggers a re-fetch, which will update localComments via the useEffect above
        if (onCommentsRefetchOrUpdate) {
            onCommentsRefetchOrUpdate(postId);
        }
    }, [postId, onCommentsRefetchOrUpdate]);

    console.log('CommentSection GroupId:', groupId);

    return (
        <div className="mt-4">
            <div className="mb-4 max-h-60 overflow-y-auto border-t pt-2">
                {localComments.length > 0 ? (
                    localComments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            currentUser={currentUser}
                            activeCommentTargetId={activeCommentTargetId}
                            setActiveCommentTargetId={setActiveCommentTargetId}
                            handleGenericSubmit={handleGenericSubmit}
                            findCommentById={findCommentById}
                            allComments={localComments} // Pass the internal localComments state for recursive lookups
                            onCommentUpdate={handleCommentLikeUpdate}
                            isLiked={comment.isLikedByCurrentUser}
                            postType={postType}
                            onCommentDeleted={handleCommentDeleted} // Pass the updated delete handler
                            groupId={groupId}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                )}
            </div>

            {/* Main Post Comment input (only visible if no specific reply is active) */}
            {!activeCommentTargetId && (
                <div className="flex items-center gap-3 border-t pt-3 relative">
                    <img
                        src={currentUser.profilePicture || currentUser.avatar || 'default-avatar.png'}
                        alt="Current user avatar"
                        className="w-8 h-8 rounded-full object-cover"
                        style={{ width: '40px' }}
                    />
                    <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-1 border rounded px-3 py-1"
                        value={commentText?.[postId] || ""}
                        onChange={onMainCommentTextChange}
                    />
                    <label
                        className="cursor-pointer px-2 py-1 hover:bg-gray-200 rounded"
                        title="Attach media"
                    >
                        <ImagePlay className="h-6 w-6" />
                        <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={onMainMediaChange}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={sendMainComment}
                        disabled={
                            !(commentText?.[postId]?.trim()) &&
                            !(mediaFiles?.[postId]?.length > 0)
                        }
                        className="btn btn-primary text-white px-3 py-1 rounded disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            )}

            {/* Media preview thumbnails for the main post comment input (only if no specific reply is active) */}
            {!activeCommentTargetId && mediaPreview[postId] && mediaPreview[postId].length > 0 && (
                <div className="mt-2 flex flex-row gap-2 overflow-x-auto overflow-visible">
                    {mediaPreview[postId].map((src, i) => (
                        <div
                            key={i}
                            className="relative group"
                            style={{ width: '80px', height: '80px', flexShrink: 0, overflow: 'visible', border: '1px solid blue' }}
                        >
                            <img
                                src={src}
                                alt="preview"
                                style={{ width: '80px', height: '80px', borderRadius: '20%', display: 'block' }}
                            />
                            <button
                                onClick={() => removeMainMediaAtIndex(i)}
                                aria-label="Remove media"
                                type="button"
                                style={{
                                    position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white',
                                    borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', zIndex: 10,
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentSection;