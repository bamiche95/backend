import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImagePlay, EllipsisVertical } from 'lucide-react';
import { likeComment, unlikeComment, likeReply, unlikeReply } from '@/api/CommentLikes';
import { Button, Menu, Portal } from "@chakra-ui/react";
import { updateCommentOrReply, deleteCommentOrReply } from "@/api/comment";
import MediaLightbox from "./MediaLightbox";
import useFormattedDate from '@/Hooks/useFromattedDate';

const CommentItem = ({

    comment,
    postId,
    currentUser,
    activeCommentTargetId,
    setActiveCommentTargetId,
    handleGenericSubmit,
    findCommentById,
    allComments, // This should now be the localComments from CommentSection
    postType,
    onCommentUpdate,
    onCommentDeleted, // This handler is crucial for propagating deletion up
    groupId,

}) => {
    const [isLiked, setIsLiked] = useState(comment.isLikedByCurrentUser);
    const [likeCount, setLikeCount] = useState(comment.likesCount ?? 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content || "");
    const [editMediaFiles, setEditMediaFiles] = useState([]);
    const [editMediaPreview, setEditMediaPreview] = useState([]);
    const [mediaToRemove, setMediaToRemove] = useState([]);
    const [localContent, setLocalContent] = useState(comment.content || "");
    const [localMedia, setLocalMedia] = useState(comment.media || []);
    const [wasJustEdited, setWasJustEdited] = useState(false);
    const [localEditedAt, setLocalEditedAt] = useState(comment.editedAt || null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const commentUserAvatar = comment.user?.profilePicture || comment.user?.avatar || "";
    const commentUserFullName = comment.user?.fullName || comment.user?.username || "Unknown";
    const commentUserName = comment.user?.username || "unknown";

    const createdDate = comment.created_at || comment.createdAt;
    const format = useFormattedDate();

    // Check if this comment is a reply (i.e., has a direct parent)
    const isReply = comment.parentCommentId !== null && comment.parentCommentId !== undefined;

    // Find the DIRECT parent of this comment for @mentioning
    const directParentComment = isReply ? findCommentById(allComments, comment.parentCommentId) : null;

    // Determine if this is a "reply to a reply" in terms of the UI display
    const displayReplyToUser = directParentComment && directParentComment.parentCommentId !== null && directParentComment.parentCommentId !== undefined;

    // Get the full name of the user to whom this comment is replying, if applicable
    const repliedToFullName = displayReplyToUser ?
        (directParentComment.user?.fullName || directParentComment.user?.username || "user") :
        null;

    const isThisCommentTargeted = activeCommentTargetId === comment.id;

    // --- Local state for reply input within this CommentItem ---
    const [replyText, setReplyText] = useState('');
    const [replyMediaFiles, setReplyMediaFiles] = useState([]);
    const [replyMediaPreview, setReplyMediaPreview] = useState([]);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);

    useEffect(() => {
        if (lightboxOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [lightboxOpen]);

    // Effect to clear local state when this comment is no longer the active target
useEffect(() => {
    // This effect should primarily react to changes in isThisCommentTargeted
    if (!isThisCommentTargeted) {
        setReplyText('');
        // Revoke old URLs from the *current* replyMediaPreview state
        // before clearing the state.
        // We might need to get the current value of replyMediaPreview here
        // to ensure we revoke the correct URLs.
        // Using a functional update for setReplyMediaPreview allows access
        // to the previous state to revoke URLs safely.
        setReplyMediaPreview(prevMediaPreview => {
            prevMediaPreview.forEach(url => URL.revokeObjectURL(url));
            return []; // Clear the array
        });
        setReplyMediaFiles([]);
    }
}, [isThisCommentTargeted]);

    const onReplyTextChange = (e) => {
        setReplyText(e.target.value);
    };

    // Ensure local content and media update when comment prop changes, but not if we just edited it locally
    useEffect(() => {
        if (!wasJustEdited) {
            setLocalContent(comment.content || "");
            setLocalMedia(comment.media || []);
            setLocalEditedAt(comment.editedAt || null); // Also update editedAt from prop
        }
    }, [comment.content, comment.media, comment.editedAt, wasJustEdited]);


    const onReplyMediaChange = (e) => {
        replyMediaPreview.forEach(url => URL.revokeObjectURL(url)); // Revoke existing previews
        const files = Array.from(e.target.files);
        setReplyMediaFiles(files);
        const previews = files.map(file => URL.createObjectURL(file));
        setReplyMediaPreview(previews);
    };

    const sendReply = async () => {
        const hasText = replyText.trim().length > 0;
        const hasMedia = replyMediaFiles.length > 0;
        if (hasText || hasMedia) {
            // Pass local state directly to the generic submit handler
            await handleGenericSubmit(postId, comment.id, replyText, replyMediaFiles, groupId);
            // Clear local input states after sending
            setReplyText('');
            replyMediaPreview.forEach(url => URL.revokeObjectURL(url)); // Revoke after use
            setReplyMediaFiles([]);
            setReplyMediaPreview([]);
            setActiveCommentTargetId(null); // Reset active target
        }
    };

    const removeReplyMediaAtIndex = (indexToRemove) => {
        const urlToRevoke = replyMediaPreview[indexToRemove];
        URL.revokeObjectURL(urlToRevoke);

        const newPreviews = replyMediaPreview.filter((_, i) => i !== indexToRemove);
        const newFiles = replyMediaFiles.filter((_, i) => i !== indexToRemove);

        setReplyMediaPreview(newPreviews);
        setReplyMediaFiles(newFiles);
    };

    const handleLikeToggle = async () => {
        const isReply = !!comment.parentCommentId;
        const wasLiked = isLiked; // Snapshot current state

        // Optimistically update UI
        setIsLiked(!wasLiked);
        setLikeCount(count => wasLiked ? Math.max(0, count - 1) : count + 1);

        try {
            if (isReply) {
                await (wasLiked
                    ? unlikeReply(comment.id, postId, comment.parentCommentId, postType)
                    : likeReply(comment.id, postId, comment.parentCommentId, postType));
            } else {
                await (wasLiked
                    ? unlikeComment(comment.id, postId, postType)
                    : likeComment(comment.id, postId, postType));
            }

            // Notify parent about like status update
            if (onCommentUpdate) {
                onCommentUpdate(comment.id, !wasLiked);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert UI changes on error
            setIsLiked(wasLiked);
            setLikeCount(count => wasLiked ? count + 1 : Math.max(0, count - 1));
        }
    };

    // Editing logic updated:
    const onEditMediaChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        const newPreviews = newFiles.map(file => URL.createObjectURL(file));

        setEditMediaFiles(prev => [...prev, ...newFiles]);
        setEditMediaPreview(prev => [...prev, ...newPreviews]);
    };


    const removeEditMediaAtIndex = (indexToRemove) => {
        const urlToRevoke = editMediaPreview[indexToRemove];
        URL.revokeObjectURL(urlToRevoke);
        setEditMediaPreview(prev => prev.filter((_, i) => i !== indexToRemove));
        setEditMediaFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const isOwner = currentUser.id === comment.user?.userId || currentUser.id === comment.user?.userid;

    // Filter out media that are marked for removal when displaying
    const mediaItems = localMedia.filter(m => !mediaToRemove.includes(m.mediaUrl || m.url || m.media_url));

    useEffect(() => {
        if (!lightboxOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
            } else if (e.key === 'ArrowRight') {
                setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length);
            } else if (e.key === 'Escape') {
                setLightboxOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, mediaItems.length]); // Added setActiveMediaIndex to dependencies

    // Swipe gesture detection
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const delta = touchStartX.current - touchEndX.current;

        if (Math.abs(delta) > 50) {
            if (delta > 0) {
                // Swipe left
                setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length); // Use mediaItems.length
            } else {
                // Swipe right
                setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length); // Use mediaItems.length
            }
        }

        // Reset refs
        touchStartX.current = null;
        touchEndX.current = null;
    };

    return (
        <>
            <div className="bg-gray-50 p-3 rounded-lg shadow-sm mb-3 border border-gray-200">
                <div className="flex items-center mb-2">
                    {commentUserAvatar ? (
                        <img
                            src={commentUserAvatar}
                            alt={commentUserFullName}
                            className="w-8 h-8 rounded-full object-cover mr-2"
                            style={{ width: '40px' }}
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white mr-2"
                            title={commentUserFullName}>
                            {commentUserFullName?.charAt(0).toUpperCase() || "?"}
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">
                            {commentUserFullName}
                            {commentUserName && commentUserName !== commentUserFullName && (
                                <span className="text-xs text-gray-500 ml-1">@{commentUserName}</span>
                            )}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                            {localEditedAt
                                ? `Edited • ${format(localEditedAt)}`
                                : `Created • ${format(createdDate)}`}
                        </p>

                    </div>

                    <div className="ml-auto"> {/* Added ml-auto to push menu to the right */}
                        {
                            isOwner && (
                                <Menu.Root>
                                    <Menu.Trigger asChild>
                                        <Button variant="outline" size="sm">
                                            <EllipsisVertical strokeWidth={1} />
                                        </Button>
                                    </Menu.Trigger>
                                    <Portal>
                                        <Menu.Positioner>
                                            <Menu.Content>
                                                <Menu.Item value="edit">
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                                        onClick={() => {
                                                            setIsEditing(true);
                                                            setEditText(localContent); // Initialize edit text with current local content
                                                            // Clear existing edit media preview and files when opening edit mode
                                                            editMediaPreview.forEach(url => URL.revokeObjectURL(url));
                                                            setEditMediaFiles([]);
                                                            setEditMediaPreview([]);
                                                            setMediaToRemove([]); // Reset media to remove
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                </Menu.Item>
                                                <Menu.Item value="delete">
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover:bg-red-100 text-sm text-red-600"
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to delete this comment?')) {
                                                                deleteCommentOrReply(postType, postId, comment.id)
                                                                    .then(() => {
                                                                        if (onCommentDeleted) {
                                                                            // Propagate the deletion up to CommentSection
                                                                            onCommentDeleted(comment.id);
                                                                        }
                                                                    })
                                                                    .catch(err => console.error('Failed to delete comment:', err));
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </Menu.Item>

                                            </Menu.Content>
                                        </Menu.Positioner>
                                    </Portal>
                                </Menu.Root>
                            )
                        }


                    </div>


                </div>
                {isEditing ? (
                    <div className="mb-2">
                        <textarea
                            className="w-full border rounded p-2 text-sm"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                        />

                        <div className="mt-2 flex flex-wrap gap-2">
                            {/* Existing media (with delete option) */}
                            {mediaItems.map((m, i) => {
                                const mediaSrc = m.mediaUrl || m.url || m.media_url;
                                const mediaType = m.mediaType || (mediaSrc.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image');

                                return (
                                    <div key={m.id || mediaSrc} className="relative w-[80px] h-[80px]">
                                        {mediaType === 'image' ? (
                                            <img src={mediaSrc} alt="media" className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <video className="w-full h-full rounded object-cover" controls>
                                                <source src={mediaSrc} type="video/mp4" />
                                            </video>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setMediaToRemove(prev => [...prev, mediaSrc])}
                                            className="absolute top-0 right-0 text-white bg-black bg-opacity-50 rounded-full w-5 h-5 flex items-center justify-center"
                                            aria-label="Remove media"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Preview new uploads */}
                            {editMediaPreview.map((src, i) => (
                                <div key={`new-${i}`} className="relative w-[80px] h-[80px]">
                                    <img src={src} alt="preview" className="w-full h-full object-cover rounded" />
                                    <button
                                        type="button"
                                        onClick={() => removeEditMediaAtIndex(i)}
                                        className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5"
                                        aria-label="Remove new media"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}


                            {/* Media uploader button */}
                            <label className="cursor-pointer text-xs px-2 py-1 border rounded hover:bg-gray-100 flex items-center justify-center w-[80px] h-[80px]">
                                Add Media
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={onEditMediaChange}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    try {
                                        const result = await updateCommentOrReply(postType, postId, comment.id, {
                                            content: editText,
                                            files: editMediaFiles,
                                            parentCommentId: comment.parentCommentId,
                                            mediaToRemove,
                                            groupId: groupId
                                        });

                                        setLocalContent(result.comment.content);
                                        setLocalMedia(result.comment.media || []);
                                        setLocalEditedAt(result.comment.editedAt);
                                        setWasJustEdited(true);
                                        setTimeout(() => setWasJustEdited(false), 500); // Reset flag after a short delay

                                        setIsEditing(false);
                                        setMediaToRemove([]);
                                        setEditMediaFiles([]);
                                        setEditMediaPreview([]);

                                        if (onCommentUpdate) {
                                            onCommentUpdate(comment.id, {
                                                content: result.comment.content,
                                                media: result.comment.media || [],
                                                editedAt: result.comment.editedAt,
                                            });
                                        }
                                    } catch (err) {
                                        console.error("Failed to update comment:", err);
                                    }
                                }}
                            >
                                Save
                            </button>

                            <button
                                className="text-sm px-3 py-1 text-red-500"
                                onClick={() => {
                                    setEditText(comment.content); // Revert to original content from prop
                                    editMediaPreview.forEach(url => URL.revokeObjectURL(url)); // Revoke any new previews
                                    setEditMediaFiles([]); // Clear new files
                                    setEditMediaPreview([]); // Clear new previews
                                    setIsEditing(false);
                                    setMediaToRemove([]); // Clear media to remove
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                        {comment.repliedToName && (
                            <span className="font-semibold text-blue-600 mr-1">@{comment.repliedToName}</span>
                        )}
                        {localContent}

                    </p>
                )}


                {!isEditing && localMedia && localMedia.length > 0 && (
                    <div className="flex gap-2 mt-1 overflow-x-auto mb-2"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {mediaItems.map((m, i) => {
                            const mediaSrc = m.mediaUrl || m.url || m.media_url;
                            const mediaType = m.mediaType || (mediaSrc.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image');

                            return (
                                <div key={m.id || i} className="relative group">
                                    {mediaType === 'image' ? (
                                        <img src={mediaSrc} className="h-16 w-16 object-cover rounded" alt=""
                                            onClick={() => {
                                                setActiveMediaIndex(i);
                                                setLightboxOpen(true);
                                            }}
                                        />
                                    ) : (
                                        <video className="h-16 w-16 rounded object-cover" controls
                                            onClick={() => {
                                                setActiveMediaIndex(i);
                                                setLightboxOpen(true);
                                            }}>
                                            <source src={mediaSrc} type="video/mp4" />
                                        </video>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}



                <div className="flex justify-end mt-2">
                    <button
                        onClick={() => setActiveCommentTargetId(comment.id)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-semibold px-2 py-1 rounded"
                    >
                        Reply
                    </button>
                    <button
                        onClick={handleLikeToggle}
                        className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                        title={isLiked ? 'Unlike' : 'Like'}
                    >
                        {isLiked ? '❤️' : '🤍'} {likeCount}
                    </button>


                </div>

                {isThisCommentTargeted && (
                    <div className="mt-3 border-t pt-3">
                        <div className="flex items-center gap-3 relative mb-2">
                            <img
                                src={currentUser.profilePicture || currentUser.avatar || 'default-avatar.png'}
                                alt="Current user avatar"
                                className="w-8 h-8 rounded-full object-cover"
                                style={{ width: '40px' }}
                            />
                            <input
                                type="text"
                                placeholder={`Replying to @${comment.user?.username || comment.user?.fullName || "user"}...`}
                                className="flex-1 border rounded px-3 py-1"
                                value={replyText}
                                onChange={onReplyTextChange}
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
                                    onChange={onReplyMediaChange}
                                    className="hidden"
                                />
                            </label>

                            <button
                                onClick={sendReply}
                                disabled={!replyText.trim() && replyMediaFiles.length === 0}
                                className="btn btn-primary text-white px-3 py-1 rounded disabled:opacity-50"
                            >
                                Send
                            </button>
                            <button
                                onClick={() => {
                                    setActiveCommentTargetId(null);
                                    setReplyText('');
                                    replyMediaPreview.forEach(url => URL.revokeObjectURL(url));
                                    setReplyMediaFiles([]);
                                    setReplyMediaPreview([]);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                        {replyMediaPreview.length > 0 && (
                            <div className="mt-2 flex flex-row gap-2 overflow-x-auto overflow-visible">
                                {replyMediaPreview.map((src, i) => (
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
                                            onClick={() => removeReplyMediaAtIndex(i)}
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
                )}

                {/* Recursively render replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-6 mt-3 pl-3 border-l-2 border-gray-200">
                        {comment.replies.map(reply => {
                            const repliedTo = reply.parentCommentId
                                ? findCommentById(allComments, reply.parentCommentId)
                                : null;
                            const repliedToName = repliedTo?.user?.fullName || repliedTo?.user?.username;

                            return (
                                <div key={reply.id} className="mb-3">
                                    <CommentItem
                                        comment={{ ...reply, repliedToName }}
                                        postId={postId}
                                        currentUser={currentUser}
                                        activeCommentTargetId={activeCommentTargetId}
                                        setActiveCommentTargetId={setActiveCommentTargetId}
                                        handleGenericSubmit={handleGenericSubmit}
                                        findCommentById={findCommentById}
                                        allComments={allComments} // Ensure allComments (which is now localComments from parent) is passed down
                                        postType={postType}
                                        onCommentUpdate={onCommentUpdate}
                                        onCommentDeleted={onCommentDeleted} // Crucially, pass the delete handler recursively
                                        groupId={groupId}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {lightboxOpen && (
                <MediaLightbox
                    media={mediaItems} // Pass filtered media
                    initialIndex={activeMediaIndex}
                    onClose={() => setLightboxOpen(false)}
                />
            )}

        </>
    );
};

export default React.memo(CommentItem);