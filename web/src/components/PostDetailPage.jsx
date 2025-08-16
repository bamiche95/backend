import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Box, Text, useDisclosure } from '@chakra-ui/react';
import PostCard from './PostCard';
import { useAuth } from '@/context/AuthContext';
import CreatePost from '@/user/CreatePost';

// Import specific API calls for fetching single posts
import { getDiscussionById, deleteDiscussion } from '@/api/discussion';
import { getQuestionById, deleteQuestion } from '@/api/question';
import { getAlertById, deleteAlert } from '@/api/alert';
import { getTipById, deleteTip } from '@/api/tip';
import { deleteGroupPost } from '../api/group';
// Assuming these are correctly imported or provided by a hook
import {
    getComments,
    submitComment,
    updateCommentOrReply, // Make sure this is imported if used later for updates
    deleteCommentOrReply, // Make sure this is imported if used later for deletions
} from '@/api/comment';

import {
    savePost,
    unsavePost
} from '@/api/save';

import {
    unlikePost,
    likePost
} from '@/api/like';

import {
    likeComment,
    unlikeComment,
    likeReply,
    unlikeReply
} from '@/api/commentlikes';

// --- Stable maps - kept outside the component ---
const fetchPostApiMap = {
    discussion: getDiscussionById,
    question: getQuestionById,
    alert: getAlertById,
    tip: getTipById,
};

const deletePostApiMap = {
    discussion: deleteDiscussion,
    question: deleteQuestion,
    alert: deleteAlert,
    tip: deleteTip,
    group: deleteGroupPost, 
};

// -------------------------------------------------------------------

const PostDetailPage = ({ postType }) => { // postType from route or parent
    const { postId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
const [editingPost, setEditingPost] = useState(null);

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
     const [comments, setComments] = useState([]);
   const [commentText, setCommentTextState] = React.useState({});
    const [showComments, setShowComments] = useState(false);
const [mediaFiles, setMediaFilesState] = React.useState({});

const setCommentText = (postId, value) => {
  setCommentTextState(prev => ({
    ...prev,
    [postId]: value,
  }));
};
    // Your existing normalizeComments function
    const normalizeComments = useCallback((currentPostType, rawComments) => {
        const sanitizeContent = (c) =>
            !c.content || c.content.trim() === "undefined" ? "" : c.content;

        if (!Array.isArray(rawComments)) {
            console.warn(`normalizeComments received non-array for ${currentPostType}:`, rawComments);
            return [];
        }

        const commentsMap = new Map();

        const flattenComments = (comments, parentId = null) => {
            comments.forEach(c => {
                const id = c.id || c.comment_id || c.answerId;
                if (!id) {
                    console.warn("Comment missing a valid ID, skipping:", c);
                    return;
                }

                // This is the critical line: uses currentPostType
                const parentCommentId = parentId ||
                    (currentPostType === 'question' ? c.parentAnswerId : c.parentCommentId || c.parent_comment_id);

                const normalizedComment = {
                    id,
                    content: sanitizeContent(c),
                    createdAt: c.created_at || c.createdAt,
                    editedAt: c.editedAt,
                    user: {
                        fullName: c.fullname || c.user?.fullName || c.user?.username || "Unknown",
                        profilePicture: c.profile_picture || c.user?.profilePicture || c.user?.avatar || "",
                        username: c.username || c.user?.username || "unknown",
                        userId: c.user_id || c.user?.userId || c.user?.id,
                    },
                    parentCommentId: parentCommentId || null,
                    replies: [],
                    media: c.media || [],
                    isLikedByCurrentUser: !!c.isLikedByCurrentUser,
                    likesCount: Number(c.likesCount) || 0,
                };

                commentsMap.set(normalizedComment.id, normalizedComment);

                if (Array.isArray(c.replies) && c.replies.length > 0) {
                    flattenComments(c.replies, normalizedComment.id);
                }
            });
        };

        flattenComments(rawComments);

        const rootComments = [];

        commentsMap.forEach(comment => {
            if (comment.parentCommentId && commentsMap.has(comment.parentCommentId)) {
                let actualParent = commentsMap.get(comment.parentCommentId);
                // Traverse up the chain to find the actual root parent if replies are nested multiple levels deep
                while (actualParent && actualParent.parentCommentId && commentsMap.has(actualParent.parentCommentId)) {
                    actualParent = commentsMap.get(actualParent.parentCommentId);
                }
                actualParent?.replies.push(comment);
            } else {
                rootComments.push(comment);
            }
        });

        const sortCommentsRecursively = (commentList) => {
            commentList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            commentList.forEach(comment => {
                if (comment.replies?.length) {
                    sortCommentsRecursively(comment.replies);
                }
            });
        };

        sortCommentsRecursively(rootComments);
        return rootComments;
    }, []); // Dependencies remain empty unless normalizeComments uses external state/props


    // --- Post Fetching Logic ---
    const fetchPostData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetcher = fetchPostApiMap[postType];
            if (!fetcher) {
                throw new Error(`Invalid post type: ${postType}`);
            }
            const data = await fetcher(postId);
            setPost(data);
        } catch (err) {
            console.error(`Failed to fetch ${postType} with ID ${postId}:`, err);
            setError(`Failed to load post. ${err.message || ''}`);
        } finally {
            setLoading(false);
        }
    }, [postId, postType]);

    useEffect(() => {
        if (postId && postType) {
            fetchPostData();
        }
    }, [postId, postType, fetchPostData]);


    // --- Comment Related Logic ---
    const fetchComments = useCallback(async () => {
        // Ensure postType is available from the main post object or the prop
        const currentPostType = post?.postType || postType;
        if (!post?.id || !currentPostType) return;

        try {
            const fetchedRawComments = await getComments(currentPostType, post.id);
            // Apply normalization here, passing the correct postType
            const normalized = normalizeComments(currentPostType, fetchedRawComments);
            setComments(normalized);
        } catch (err) {
            console.error("Failed to fetch comments:", err);
        }
    }, [post?.id, post?.postType, postType, normalizeComments]); // Add normalizeComments to dependency array

    useEffect(() => {
        if (post) {
            fetchComments();
        }
    }, [post, fetchComments]);

    const handleSendComment = useCallback(
        async (commentPostId, parentCommentId = null, commentContent = '', mediaFiles = [], groupId = null) => {
            if (!currentUser || !commentPostId) {
                console.warn('Cannot send comment: Missing user or postId.');
                return;
            }

            try {
                // Use the postType from the main post object or the component prop
                const currentPostType = post?.postType || postType;
                if (!currentPostType) {
                    console.warn('Cannot send comment: Post type is undefined.');
                    return;
                }

                const payload = {
                    content: commentContent,
                    files: mediaFiles,
                };

                // Always include parentCommentId if it's provided
                if (parentCommentId !== null) {
                    payload.parentCommentId = parentCommentId;
                }

                // Conditionally include groupId if it's provided (for 'group' post types or others where it's relevant)
                if (groupId !== null) {
                    payload.groupId = groupId;
                }

              

                const newComment = await submitComment(currentPostType, commentPostId, payload);
                await fetchComments(); // Re-fetch comments to update the UI with the new comment
                return newComment;
            } catch (error) {
                console.error('Failed to send comment:', error);
                throw error;
            }
        },
        [currentUser, post, postType, fetchComments] // Added postType to dependencies
    );

    const handleDeleteComment = useCallback(async (commentId, parentCommentId = null) => {
        const currentPostType = post?.postType || postType;
        if (!currentPostType) {
            console.warn("Cannot delete comment: Missing post type.");
            return;
        }
        try {
            // Ensure deleteCommentOrReply is imported and takes correct args
            await deleteCommentOrReply(currentPostType, post.id, commentId);
            // After deletion, re-fetch comments to get the accurate, updated list
            await fetchComments();
        } catch (error) {
            console.error("Failed to delete comment:", error);
            throw error;
        }
    }, [post, postType, fetchComments]); // Added postType and fetchComments to dependencies

    // THIS IS THE NEW / UPDATED FUNCTION FOR HANDLING COMMENT UPDATES
    const handleCommentUpdate = useCallback(async (commentId, updatedData, parentCommentId = null) => {
        const currentPostType = post?.postType || postType;
        if (!currentPostType) {
            console.warn("Cannot update comment: Missing post type.");
            return;
        }
        try {
            // Assuming updateCommentOrReply takes postType, postId, commentId, parentCommentId, updatedData
            await updateCommentOrReply(currentPostType, post.id, commentId, parentCommentId, updatedData);
            // Re-fetch comments to get the updated state from the backend
            await fetchComments();
        } catch (error) {
            console.error("Failed to update comment:", error);
            throw error;
        }
    }, [post, postType, fetchComments]); // Added postType and fetchComments to dependencies


    const handleCommentLikeToggle = useCallback(async (commentId, isLiked, parentCommentId = null) => {
        if (!currentUser || !post?.id) return;
        const currentPostType = post?.postType || postType;

        // Optimistic UI update
        setComments(prevComments => {
            const updateLikesRecursive = (commentsArray) => {
                return commentsArray.map(comment => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            isLikedByCurrentUser: !isLiked,
                            likesCount: isLiked ? Math.max(0, (comment.likesCount || 0) - 1) : (comment.likesCount || 0) + 1
                        };
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateLikesRecursive(comment.replies)
                        };
                    }
                    return comment;
                });
            };
            return updateLikesRecursive(prevComments);
        });

        try {
            if (parentCommentId) {
                await (isLiked
                    ? unlikeReply(commentId, post.id, parentCommentId, currentPostType)
                    : likeReply(commentId, post.id, parentCommentId, currentPostType));
            } else {
                await (isLiked
                    ? unlikeComment(commentId, post.id, currentPostType)
                    : likeComment(commentId, post.id, currentPostType));
            }
            // A small delay and re-fetch can be added here if optimistic update isn't robust enough
            // setTimeout(fetchComments, 500);
        } catch (error) {
            console.error("Failed to toggle comment/reply like:", error);
            // Revert optimistic UI on error
            setComments(prevComments => {
                const revertLikesRecursive = (commentsArray) => {
                    return commentsArray.map(comment => {
                        if (comment.id === commentId) {
                            return {
                                ...comment,
                                isLikedByCurrentUser: isLiked, // Revert back
                                likesCount: isLiked ? (comment.likesCount || 0) + 1 : Math.max(0, (comment.likesCount || 0) - 1) // Revert count
                            };
                        }
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: revertLikesRecursive(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return revertLikesRecursive(prevComments);
            });
        }
    }, [currentUser, post, postType]); // Added postType to dependencies

    // ... (handleSavePost, handleLikePost, handleEditPost, handleDeleteMainPost remain the same) ...
    const handleSavePost = useCallback(async (postIdProp, postTypeProp, isCurrentlySaved, setIsSavedInPostCard) => {
        if (!currentUser || !post?.id || !post?.postType) return;
        try {
            if (isCurrentlySaved) {
                await unsavePost(post.id, post.postType, currentUser.userId);
            } else {
                const response = await savePost(post.id, post.postType, currentUser.userId);
                setPost(prevPost => ({
                    ...prevPost,
                    savedPostId: response?.id || prevPost?.savedPostId,
                }));
            }
            setIsSavedInPostCard(!isCurrentlySaved);
            setPost(prevPost => ({
                ...prevPost,
                isSaved: !isCurrentlySaved,
            }));
        } catch (error) {
            console.error("Failed to toggle save status:", error);
            setIsSavedInPostCard(isCurrentlySaved);
            setPost(prevPost => ({
                ...prevPost,
                isSaved: isCurrentlySaved,
            }));
        }
    }, [currentUser, post]);

    const handleLikePost = useCallback(async (postIdProp, postTypeProp, isCurrentlyLiked, setIsLikedInPostCard) => {
        if (!currentUser || !post?.id || !post?.postType) return;
        try {
            if (isCurrentlyLiked) {
                await unlikePost(post.id, post.postType, currentUser.userId);
            } else {
                await likePost(post.id, post.postType, currentUser.userId);
            }
            setIsLikedInPostCard(!isCurrentlyLiked);
            setPost(prevPost => ({
                ...prevPost,
                isLiked: !isCurrentlyLiked,
                likeCount: isCurrentlyLiked ? (prevPost.likeCount || 0) - 1 : (prevPost.likeCount || 0) + 1,
            }));
        } catch (error) {
            console.error("Failed to toggle like status:", error);
            setIsLikedInPostCard(isCurrentlyLiked);
            setPost(prevPost => ({
                ...prevPost,
                likeCount: isCurrentlyLiked ? (prevPost.likeCount || 0) + 1 : Math.max(0, (prevPost.likeCount || 0) - 1),
            }));
        }
    }, [currentUser, post]);


const postToEditId =  post?.postId || post?.tipId || post?.alertId || null;

    const handleEdit = (post) => {
    


        if (post && post.id === postToEditId ) { 
          
            setEditingPost(post); 
            setIsCreatePostModalOpen(true);
        };
    };





const closeCreatePostModal = () => {
  setIsCreatePostModalOpen(false);
  setEditingPost(null);
};
     
    
    const handleDeleteMainPost = useCallback(async () => {
        if (!currentUser || !post?.id || !post?.postType) {
            console.warn("Cannot delete post: Missing user, post ID, or post type.");
            // Optionally show a user-friendly message
            setError("Cannot delete post: Required information is missing.");
            return;
        }
console.log ('CurrentUser', currentUser);
console.log ('Post user id', post.user?.userId);

        if (currentUser.id !== post.user?.userId) {
            console.warn("User is not authorized to delete this post.");
            setError("You are not authorized to delete this post.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete this ${post.postType}?`)) {
            setLoading(true); // Indicate deletion is in progress
            setError(null); // Clear previous errors

            try {
                // Use the deletePostApiMap directly
                const deleteFetcher = deletePostApiMap[post.postType];

                if (!deleteFetcher) {
                    throw new Error(`Deletion not implemented for post type: ${post.postType}`);
                }

                // For 'group' posts, you might need the groupId as well,
                // assuming 'post' object contains groupId if it's a group post.
                // Adjust this line based on your deleteGroupPost API signature.
                // Example: If deleteGroupPost(postId, groupId)
                if (post.postType === 'group' && post.groupId) {
                    await deleteFetcher(post.id, post.groupId);
                } else {
                    await deleteFetcher(post.id);
                }

                console.log(`${post.postType} ${post.id} deleted successfully.`);
                navigate(`/${post.postType}s`); // Navigate to the list page after successful deletion

            } catch (deleteError) {
                console.error(`Failed to delete ${post.postType} ${post.id}:`, deleteError);
                // Set component-level error for user feedback
                setError(`Failed to delete post: ${deleteError.message || 'Unknown error'}.`);
            } finally {
                setLoading(false); // Stop loading indicator
            }
        }
    }, [currentUser, post, navigate, setError, setLoading]);

    // ... (render logic remains the same) ...
    if (loading) {
        return (
            <Box p={4} textAlign="center">
                <Spinner size="xl" />
                <Text mt={4}>Loading post...</Text>
            </Box>
        );
    }

    if (error && !post) {
        return (
            <Box p={4} textAlign="center" color="red.500">
                <Text>Error: {error}</Text>
            </Box>
        );
    }

    if (!post) {
        return (
            <Box p={4} textAlign="center">
                <Text>Post not found.</Text>
            </Box>
        );
    }

    const postIdForPostCard = post.id || post.postId || post.tipId || post.alertId;

    return (
        <Box p={4} style={{
  position: 'relative',
  zIndex: 1,
  overflow: 'visible',
}}>
            <PostCard
                post={post}
                currentUser={currentUser}
                postType={postType} // Pass the correct postType to PostCard
                comments={{ [postIdForPostCard]: comments }}
                 commentText={commentText}
                 setCommentText={setCommentText}
                mediaFiles={{ [postIdForPostCard]: [] }}
                setMediaFiles={() => { /* Not used by PostDetailPage's direct input */ }}
                mediaPreview={{ [postIdForPostCard]: [] }}
                setMediaPreview={() => { /* Not used by PostDetailPage's direct input */ }}
                showComments={{ [postIdForPostCard]: showComments }}
                toggleShowComments={() => setShowComments(prev => !prev)}
                handleGenericSubmit={handleSendComment}
                onCommentLikeToggle={handleCommentLikeToggle}
                onDeleteComment={handleDeleteComment}
                onSave={handleSavePost}
                onLike={handleLikePost}
                onEdit={handleEdit}
                onDelete={handleDeleteMainPost}
                onCommentUpdate={handleCommentUpdate}
            />

           {isCreatePostModalOpen && (
                <>
    {console.log('Rendering CreatePost modal...')}
                <CreatePost
               isOpen={isCreatePostModalOpen}
                    postToEdit={editingPost}
                    isEditing={!!editingPost}
                    closeModal={() => {
                     closeCreatePostModal();
                        
                    }}
                    groupId={null}
                    setPosts={setPost}
                    setLoading={setIsSubmittingPost}
                  
                    postType={postType}
                     
                />
                </>
            )}
        </Box>
    );
};

export default PostDetailPage;