// src/hooks/useFeed.js
import { useEffect, useState, useCallback } from 'react';
import { getComments, submitComment } from '@/api/comment';
import { deleteAlert } from '@/api/alert';
import { deleteQuestion } from '@/api/question';
import { deleteTip } from '@/api/tip';
import { deleteDiscussion } from '@/api/discussion';
import { savePost, unsavePost } from '@/api/save';
import { likePost, unlikePost } from '@/api/like';
import {getGroupPosts, } from '@/api/group';
import { deleteGroupPost } from '../api/group';


export const useFeed = (postType, fetchPostsFn, groupId) => {
    const [posts, setPosts] = useState([]);
    
    const [comments, setComments] = useState({});
    const [showComments, setShowComments] = useState({});
    const [commentText, setCommentText] = useState({});
    const [mediaFiles, setMediaFiles] = useState({});
    const [mediaPreview, setMediaPreview] = useState({});
    const [loading, setLoading] = useState(true);
    const [deletionError, setDeletionError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [likeError, setLikeError] = useState(null);
    // NEW: State to store the ID of the comment being replied to
    const [replyingToCommentId, setReplyingToCommentId] = useState(null);

    const updateCommentText = (postId, text) => {
        setCommentText(prev => ({ ...prev, [postId]: text }));
    };

    const updateMediaFiles = (postId, files) => {
        setMediaFiles(prev => ({ ...prev, [postId]: files }));
    };

    const updateMediaPreview = (postId, previews) => {
        setMediaPreview(prev => ({ ...prev, [postId]: previews }));
    };

    const toggleShowComments = (postId) => {
        setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    };

    // NEW: Function to set which comment is being replied to
    const setReplyingTo = (commentId) => {
        setReplyingToCommentId(commentId);
    };
    // Inside your useFeed.js or src/utils/commentUtils.js
    // Assuming this useCallback wraps the function
    // Inside your useFeed.js or src/utils/commentUtils.js
    const normalizeComments = useCallback((postType, rawComments) => {
        const sanitizeContent = (c) =>
            !c.content || c.content.trim() === "undefined" ? "" : c.content;

        if (!Array.isArray(rawComments)) {
            console.warn(`normalizeComments received non-array for ${postType}:`, rawComments);
            return [];
        }

        const commentsMap = new Map();

        // 🔁 Recursively flatten comments from alert-style replies
        const flattenComments = (comments, parentId = null) => {
            comments.forEach(c => {
                const id = c.id || c.comment_id || c.answerId;
                if (!id) {
                    console.warn("Comment missing a valid ID, skipping:", c);
                    return;
                }

                const parentCommentId = parentId ||
                    (postType === 'question' ? c.parentAnswerId : c.parentCommentId || c.parent_comment_id);

                const normalizedComment = {
                    id,
                    content: sanitizeContent(c),
                    createdAt: c.created_at || c.createdAt,
                    editedAt: c.editedAt,
                    user: {
                        fullName: c.fullname || c.user?.fullName || c.user?.username || "Unknown",
                        profilePicture: c.profile_picture || c.user?.profilePicture || c.user?.avatar || "",
                        username: c.username || c.user?.username || "unknown",
                        userId: c.user_id || c.user?.userId || c.user?.id,  // <-- FIXED LINE

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
    }, []);



    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setSaveError(null);
            setDeletionError(null);
            setLikeError(null);
            try {
                const fetchedPosts = await fetchPostsFn();
                setPosts(fetchedPosts);

                const allComments = {};
                await Promise.all(
                    fetchedPosts.map(async (post) => {
                        try {
                            const postIdToUse = post.id || post.postId || post.tipId || post.alertId;
                            if (!postIdToUse) {
                                console.warn("Post ID missing for:", post);
                                return;
                            }

                            let rawComments = await getComments(postType, postIdToUse);

                            if (postType === 'question' && rawComments && rawComments.answers) {
                                rawComments = rawComments.answers;
                            }
                            allComments[postIdToUse] = normalizeComments(postType, rawComments);
                        } catch (error) {
                            console.error(`Failed to load comments for post ${post.id || post.postId}:`, error);
                            allComments[post.id || post.postId] = [];
                        }
                    })
                );
                setComments(allComments);

            } catch (err) {
                console.error('Failed to fetch posts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetch();
    }, [fetchPostsFn, postType, normalizeComments]);




    const handleGenericSubmit = useCallback(async (targetPostId, parentCommentId, content, files, groupId) => {


        if ((!content || !content.trim()) && files.length === 0) return;

        // Ensure content is at least an empty string if it's just media being sent
        const commentContent = content ? content.trim() : "";

        try {
            // Pass parentCommentId to submitComment, which is now explicitly passed as an argument
            const newComment = await submitComment(
                postType, // The first argument should be postType
                targetPostId, // The second argument should be postId
                { // The third argument is the object to destructure
                    content: commentContent,
                    files: files,
                    parentCommentId: parentCommentId,
                    groupId: groupId,
                }
               
            );

            if (!newComment || typeof newComment !== 'object') {
                console.error("Invalid comment returned:", newComment);
                throw new Error("Invalid comment returned from submitComment");
            }


            const postIdToUse = targetPostId; // Renamed for clarity as it's passed as targetPostId
            let rawComments = await getComments(postType, postIdToUse); // Ensure postType is accessible here if needed
            if (postType === 'question' && rawComments && rawComments.answers) {
                rawComments = rawComments.answers;
            }
            setComments(prev => ({
                ...prev,
                [postIdToUse]: normalizeComments(postType, rawComments), // Ensure normalizeComments and postType are in scope
            }));

            // These clear actions are now ONLY for the main post's comment input.
            // The reply inputs within CommentItem manage their own clearing.
            if (parentCommentId === null) { // Only clear global state if it was a main comment
                setCommentText(prev => ({ ...prev, [targetPostId]: '' }));
                setMediaFiles(prev => ({ ...prev, [targetPostId]: [] }));
                setMediaPreview(prev => ({ ...prev, [targetPostId]: [] }));
            }

        } catch (error) {
            console.error('Failed to submit comment for post:', targetPostId, error);
            // You might want to add user-facing error feedback here
        }
    }, [
        postType, // Make sure postType is a dependency if used inside
        normalizeComments, // Make sure normalizeComments is a dependency
        getComments, // Make sure getComments is a dependency
        submitComment, // Make sure submitComment is a dependency
        setComments, // Make sure setComments is a dependency
        setCommentText, // These are for the main input, so still needed
        setMediaFiles,
        setMediaPreview,

    ]);


    const handleDeletePost = useCallback(async (postId, currentPostType) => {
        if (!window.confirm(`Are you sure you want to delete this ${currentPostType}?`)) {
            return;
        }

        setLoading(true);
        setDeletionError(null);

        try {
            switch (currentPostType) {
                case 'alert':
                    await deleteAlert(postId);
                    setPosts((prevPosts) => prevPosts.filter((p) => (p.id || p.postId || p.alertId) !== postId));
                    console.log(`Alert ${postId} deleted successfully.`);
                    break;
                case 'question':
                    await deleteQuestion(postId);
                    setPosts((prevPosts) => prevPosts.filter((p) => (p.postId || p.id) !== postId));
                    console.log(`Question ${postId} deleted successfully.`);
                    break;
                case 'tip':
                    await deleteTip(postId);
                    setPosts(prevPosts => prevPosts.filter(p => (p.tipId || p.id) !== postId));
                    console.log(`Tip ${postId} deleted successfully.`);
                    break;
                case 'discussion':
                    await deleteDiscussion(postId);
                    setPosts(prevPosts => prevPosts.filter(p => (p.postId || p.id) !== postId));
                    console.log(`Discussion ${postId} deleted successfully.`);
                    break;
                case 'group':
                    await deleteGroupPost(postId, groupId);
                    setPosts(prevPosts => prevPosts.filter(p => (p.postId || p.id) !== postId));
                    console.log(`Group ${postId} deleted successfully.`);
                    break;
                default:
                    console.warn(`Deletion not implemented for post type: ${currentPostType}`);
                    setDeletionError(`Deletion not supported for ${currentPostType} posts.`);
                    break;
            }
        } catch (error) {
            console.error(`Error deleting ${currentPostType} ${postId}:`, error);
            setDeletionError(`Failed to delete ${currentPostType}. Please try again.`);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSavePost = useCallback(async (postId, currentPostType, isCurrentlySaved, setIsSavedInPostCard) => {
        setSaveError(null);
        let actionText;
        try {
            const currentPost = posts.find(p => {
                const pId = p.id || p.postId || p.tipId || p.alertId;
                return pId == postId;
            });

            if (isCurrentlySaved) {
                actionText = 'unsave';
                const savedPostPk = currentPost?.savedPostId;
                if (!savedPostPk) {
                    console.warn(`[handleSavePost] Attempted to unsave post ${postId} but savedPostId was missing.`);
                    throw new Error("Cannot unsave: Saved post ID not found.");
                }
                await unsavePost(savedPostPk);
                setIsSavedInPostCard(false);
            } else {
                actionText = 'save';
                const response = await savePost(postId, currentPostType);
                setIsSavedInPostCard(true);
                setPosts(prevPosts =>
                    prevPosts.map(p => {
                        const postIds = [p.id, p.postId, p.tipId, p.alertId].filter(Boolean);
                        if (postIds.includes(postId)) {
                            return {
                                ...p,
                                isSaved: true,
                                savedPostId: response.id
                            };
                        }
                        return p;
                    })
                );
                return;
            }

            setPosts(prevPosts =>
                prevPosts.map(p => {
                    const postIds = [p.id, p.postId, p.tipId, p.alertId].filter(Boolean);
                    if (postIds.includes(postId)) {
                        return {
                            ...p,
                            isSaved: false,
                            savedPostId: null
                        };
                    }
                    return p;
                })
            );

        } catch (error) {
            actionText = actionText || (isCurrentlySaved ? 'unsave' : 'save');
            console.error(`Error ${actionText}ing ${currentPostType} ${postId}:`, error);
            setSaveError(error.message || `Failed to ${actionText} ${currentPostType}. Please try again.`);
            setIsSavedInPostCard(isCurrentlySaved);
        }
    }, [posts]);

    const handleLikePost = useCallback(async (postId, currentPostType, isCurrentlyLiked, setIsLikedInPostCard) => {
        setLikeError(null);
        let actionText = isCurrentlyLiked ? 'unlike' : 'like';

        setIsLikedInPostCard(!isCurrentlyLiked);
        setPosts(prevPosts => prevPosts.map(p => {
            const currentPostId = p.id || p.postId || p.tipId || p.alertId;
            if (currentPostId == postId) {
                return {
                    ...p,
                    isLiked: !isCurrentlyLiked,
                    likeCount: isCurrentlyLiked ? Math.max(0, (p.likeCount || 0) - 1) : (p.likeCount || 0) + 1
                };
            }
            return p;
        }));

        try {
            if (isCurrentlyLiked) {
                await unlikePost(postId, currentPostType);
            } else {
                await likePost(postId, currentPostType);
            }
        } catch (error) {
            console.error(`Error ${actionText}ing ${currentPostType} ${postId}:`, error);
            setLikeError(error.message || `Failed to ${actionText} ${currentPostType}.`);

            setIsLikedInPostCard(isCurrentlyLiked);
            setPosts(prevPosts => prevPosts.map(p => {
                const currentPostId = p.id || p.postId || p.tipId || p.alertId;
                if (currentPostId == postId) {
                    return {
                        ...p,
                        isLiked: isCurrentlyLiked,
                        likeCount: isCurrentlyLiked ? (p.likeCount || 0) + 1 : Math.max(0, (p.likeCount || 0) - 1)
                    };
                }
                return p;
            }));
        }
    }, []);


    return {
        posts,
        loading,
        comments,
        showComments,
        setPosts,
        commentText,
        setCommentText: updateCommentText,
        mediaFiles,
        setMediaFiles: updateMediaFiles,
        mediaPreview,
        setMediaPreview: updateMediaPreview,
        handleGenericSubmit,
        toggleShowComments,
        handleDeletePost,
        handleSavePost,
        handleLikePost,
        deletionError,
        saveError,
        likeError,
        setReplyingTo, // NEW: Export setReplyingTo
        replyingToCommentId, // NEW: Export replyingToCommentId for UI
        
    };
};