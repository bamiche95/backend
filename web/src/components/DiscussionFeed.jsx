import React, { useState, useCallback, useEffect } from 'react';
import PostCard from './PostCard';
import { useFeed } from '@/hooks/useFeed';
import { getDiscussions } from '../api/discussion';
import { useAuth } from '../context/AuthContext';
import CreatePost from '@/user/CreatePost';
import { Text, Spinner, Box, Button } from '@chakra-ui/react';
import ReportModal from './ReportModal';
import { socket } from '@/user/socket';

// Receive profileUserId and isOwnProfile as props
function DiscussionFeed({ profileUserId, isOwnProfile }) {
    const { user } = useAuth();
    const [editingPost, setEditingPost] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingPostId, setReportingPostId] = useState(null);
    const {
        posts: discussions,
        loading: feedLoading,
        comments,
        setComments,
        showComments,
        commentText,
        setCommentText,
        mediaFiles,
        setMediaFiles,
        mediaPreview,
        setMediaPreview,
        toggleShowComments,
        handleGenericSubmit,
        handleDeletePost,
        handleSavePost,
        saveError,
        deletionError,
        handleLikePost,
        likeError,
        setPosts,
        handleLikeToggle,
        handleCommentLikeToggle,
    } = useFeed('discussion', getDiscussions); // getDiscussions is correctly passed here

    // Filter discussions based on profileUserId if it's provided
       const filteredDiscussions = profileUserId
        ? discussions.filter(d => {
            // Convert both to numbers for a robust comparison, as profileUserId might be string from useParams
            // and d.user.userId is likely a number from the backend.
            return Number(d.user.userId) === Number(profileUserId);
          })
        : discussions;

    // --- WebSocket Listener for new discussion posts ---
    useEffect(() => {
        console.log('🔗 DiscussionFeed Socket connected:', socket.id);

      const handleNewDiscussionPost = (newPost) => {
        const normalized = { ...newPost, postId: newPost.id };
        // Only add new posts if they belong to the current profile being viewed, or if no profile filter is active
        if (!profileUserId || normalized.authorId === profileUserId) {
            setPosts(prev => [normalized, ...prev]);
        }
      };

      const handleDiscussionUpdated = ({ discussion }) => {
        const normalizedDiscussion = {
            ...discussion,
            postId: discussion.id,
        };

        setPosts(prev => {
            const updated = prev.map(p =>
                p.postId === normalizedDiscussion.postId
                    ? { ...p, ...normalizedDiscussion }
                    : p
            );

            const exists = updated.some(p => p.postId === normalizedDiscussion.postId);
            // Only add if it exists (meaning it's an update) or if it's a new post for the current profile
            if (!exists && (!profileUserId || normalizedDiscussion.authorId === profileUserId)) {
                updated.unshift(normalizedDiscussion);
            }
            return updated;
        });
      };

      const handleDiscussionDeleted = (deletedPostId) => {
        console.log('📡 Received discussionDeleted:', deletedPostId);
        setPosts(prev => prev.filter(p => p.postId !== deletedPostId));
      };

        socket.on('newDiscussionPost', handleNewDiscussionPost);
        socket.on('discussionUpdated', handleDiscussionUpdated);
        socket.on('discussionDeleted', handleDiscussionDeleted);

        return () => {
            socket.off('newDiscussionPost', handleNewDiscussionPost);
            socket.off('discussionUpdated', handleDiscussionUpdated);
            socket.off('discussionDeleted', handleDiscussionDeleted);
        };
    }, [setPosts, profileUserId]); // Add profileUserId to dependencies

    const handleCommentsRefetchOrUpdate = useCallback(async (postIdToRefresh) => {
        console.log(`Comments for discussion ${postIdToRefresh} need to be re-fetched or updated.`);
    }, [setComments, user]);

    const handleEdit = useCallback(
        (postId) => {
            const postToEdit = discussions.find((p) => p.postId === postId);
            if (!postToEdit) return;
            setEditingPost(postToEdit);
            setIsCreatePostModalOpen(true);
        },
        [discussions]
    );

    const onDeleteDiscussion = useCallback(
        (postId) => {
            handleDeletePost(postId, 'discussion');
        },
        [handleDeletePost]
    );

    const onSaveDiscussion = useCallback(
        (discussionId, receivedPostType, isCurrentlySaved, setIsSaved) => {
            handleSavePost(discussionId, 'discussion', isCurrentlySaved, setIsSaved);
        },
        [handleSavePost]
    );

    const onLikeDiscussion = useCallback(
        (discussionId, receivedPostType, isCurrentlyLiked, setIsLiked) => {
            handleLikePost(discussionId, 'discussion', isCurrentlyLiked, setIsLiked);
        },
        [handleLikePost]
    );

    // Only show spinner for initial feed loading
    if (feedLoading && filteredDiscussions.length === 0) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" height="200px">
                <Spinner size="xl" />
                <Text ml={4}>Loading discussions...</Text>
            </Box>
        );
    }

    const handleReport = (postId) => {
        setReportingPostId(postId);
        setIsReportModalOpen(true);
    };

    const handleReportSubmit = async (postId, reason, description) => {
        try {
            const res = await fetch('/api/report-post', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: postId, postType: 'discussion', reason, description }),
            });

            if (!res.ok) throw new Error('Report failed');

            closeReportModal();
        } catch (error) {
            console.error(error);
        }
    };

    const closeReportModal = () => {
        setIsReportModalOpen(false);
        setReportingPostId(null);
    };

    return (
        <Box p={4}>
            {deletionError && <Text color="red.500" mb={4}>Error deleting discussion: {deletionError}</Text>}
            {saveError && <Text color="red.500" mb={4}>{saveError}</Text>}
            {likeError && <Text color="red.500" mb={4}>{likeError}</Text>}

            {/* Conditionally render the "Create New Discussion Post" button */}
            {isOwnProfile && (
                <Button onClick={() => setIsCreatePostModalOpen(true)} mb={4} colorScheme="blue">
                    Create New Discussion Post
                </Button>
            )}

            {isCreatePostModalOpen && (
                <CreatePost
                 isOpen={isCreatePostModalOpen}
                    postToEdit={editingPost}
                    isEditing={!!editingPost}
                    closeModal={() => {
                        setIsCreatePostModalOpen(false);
                        setEditingPost(null);
                        setIsSubmittingPost(false);
                    }}
                    groupId={null}
                    setPosts={setPosts}
                    setLoading={setIsSubmittingPost}
                    postType="discussion"
                />
            )}

            {filteredDiscussions.length === 0 && !feedLoading ? (
                <Text>No discussions found.</Text>
            ) : (
                filteredDiscussions.map((d) => {
                    if (!d.postId) {
                        console.warn("⚠️ Discussion item missing postId:", d);
                    }
                    return (
                        <PostCard
                            key={d.postId || d.id}
                            post={d}
                            currentUser={user}
                            comments={comments}
                            commentText={commentText}
                            setCommentText={setCommentText}
                            mediaFiles={mediaFiles}
                            setMediaFiles={setMediaFiles}
                            mediaPreview={mediaPreview}
                            setMediaPreview={setMediaPreview}
                            showComments={showComments}
                            toggleShowComments={toggleShowComments}
                            onEdit={() => handleEdit(d.postId)}
                            onReport={() => handleReport(d.postId)}
                            onDelete={() => onDeleteDiscussion(d.postId)}
                            onComment={() => toggleShowComments(d.postId)}
                           // onShare={() => console.log(`Sharing discussion ${d.postId}`)}
                            onSave={onSaveDiscussion}
                            onLike={onLikeDiscussion}
                            onSendComment={() => handleGenericSubmit(d.postId)}
                            postType="discussion"
                            handleGenericSubmit={handleGenericSubmit}
                            onCommentLikeToggle={handleCommentLikeToggle}
                            onCommentsRefetchOrUpdate={handleCommentsRefetchOrUpdate}
                        />
                    );
                })
            )}

            {isReportModalOpen && (
                <ReportModal
                    postId={reportingPostId}
                    postType="discussion"
                    onClose={closeReportModal}
                    onSubmit={handleReportSubmit}
                />
            )}
        </Box>
    );
}

export default DiscussionFeed;