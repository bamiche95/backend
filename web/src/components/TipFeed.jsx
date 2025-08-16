import React, { useState, useCallback, useEffect } from 'react';
import { Box, Spinner, Text, Button } from '@chakra-ui/react';
import PostCard from './PostCard';
import { BASE_URL, getToken } from "../config"; // Assuming BASE_URL is correctly defined
import { useAuth } from '../context/AuthContext';
import { useFeed } from '../Hooks/useFeed';
import CreatePost from '@/user/CreatePost';
import { socket } from '@/user/socket';
const token = getToken(); // Get the token for authentication
const fetchNearbyTips = async () => {
    const res = await fetch(`${BASE_URL}/api/nearby_tips`, {
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch tips: Network or server error' }));
        throw new Error(errorData.message || 'Failed to fetch tips');
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
        console.warn('Expected array from API but got:', data);
        return [];
    }
    return data.map(tip => ({ ...tip, postType: 'tip' }));
};

// Receive profileUserId and isOwnProfile as props
const TipFeed = ({ profileUserId, isOwnProfile }) => {
    const { user } = useAuth();
    const [editingPost, setEditingPost] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);

    const {
        posts: tips,
        loading: feedLoading,
        comments,
        setComments,
        showComments,
        commentText,
        mediaFiles,
        setCommentText,
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
        setPosts: setTipsInternal,
    } = useFeed('tip', fetchNearbyTips);

    // --- NEW: Filter tips based on profileUserId ---
    const filteredTips = profileUserId
        ? tips.filter(tip => {
            // Assuming tip objects have a nested 'user.userId' property for the author's ID,
            // similar to your discussion posts.
            // Convert both to numbers for a robust comparison.
            if (tip.user && tip.user.userId !== undefined) {
                return Number(tip.user.userId) === Number(profileUserId);
            }
            console.warn("⚠️ Tip item missing user.userId for filtering:", tip);
            return false; // Exclude tips without a clear author ID
          })
        : tips; // If no profileUserId, show all tips (e.g., on the main feed page)

    // --- WebSocket Listeners ---
    useEffect(() => {
        console.log('🔗 TipFeed Socket connected:', socket.id);

        const handleNewTip = (newTip) => {
            console.log('📡 Received newTip:', newTip);
            // Only add new tips if they belong to the current profile being viewed,
            // or if no profile filter is active.
            if (!profileUserId || (newTip.user && Number(newTip.user.userId) === Number(profileUserId))) {
                setTipsInternal(prevTips => [newTip, ...prevTips]);
            }
        };

        const handleTipUpdated = (updatedTip) => {
            console.log('📡 Received tipUpdated:', updatedTip);
            setTipsInternal(prevTips => {
                const updated = prevTips.map(tip => (tip.id === updatedTip.id ? updatedTip : tip));
                const exists = updated.some(tip => tip.id === updatedTip.id);
                // If the updated tip wasn't found (meaning it's new for this user's filter)
                // and it matches the profileUserId, add it.
                if (!exists && (!profileUserId || (updatedTip.user && Number(updatedTip.user.userId) === Number(profileUserId)))) {
                    updated.unshift(updatedTip);
                }
                return updated;
            });
        };

        const handleTipDeleted = (deletedTipId) => {
            console.log('📡 Received tipDeleted:', deletedTipId);
            setTipsInternal(prevTips => prevTips.filter(tip => tip.id !== deletedTipId));
        };

        socket.on('newTip', handleNewTip);
        socket.on('tipUpdated', handleTipUpdated);
        socket.on('tipDeleted', handleTipDeleted);

        return () => {
            socket.off('newTip', handleNewTip);
            socket.off('tipUpdated', handleTipUpdated);
            socket.off('tipDeleted', handleTipDeleted);
        };
    }, [setTipsInternal, profileUserId]); // Add profileUserId to dependencies

    const handleCommentsRefetchOrUpdate = useCallback(async (postIdToRefresh) => {
        try {
            console.log(`Comments for post ${postIdToRefresh} need to be re-fetched or updated.`);
        } catch (error) {
            console.error(`Error re-fetching comments for post ${postIdToRefresh}:`, error);
        }
    }, [setComments, user]);

    const onDeleteTip = useCallback((tipId) => {
        handleDeletePost(tipId, 'tip');
    }, [handleDeletePost]);

    const handleEdit = useCallback(
        (postId) => {
            const postToEdit = tips.find((t) => t.id === postId);
            if (!postToEdit) return;
            setEditingPost(postToEdit);
            setIsCreatePostModalOpen(true);
        },
        [tips]
    );

    const onSaveTip = useCallback((tipId, receivedPostType, isCurrentlySaved, setIsSaved) => {
        handleSavePost(tipId, 'tip', isCurrentlySaved, setIsSaved);
    }, [handleSavePost]);

    const onLikeTip = useCallback((tipId, receivedPostType, isCurrentlyLiked, setIsLiked) => {
        handleLikePost(tipId, 'tip', isCurrentlyLiked, setIsLiked);
    }, [handleLikePost]);

    // Only show spinner for initial feed loading if no tips are present
    // Now checks filteredTips length
    if (feedLoading && filteredTips.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <Spinner size="xl" />
                <Text ml={4}>Loading tips...</Text>
            </Box>
        );
    }

    return (
        <Box p={4}>
            {deletionError && <Text color="red.500" mb={4}>{deletionError}</Text>}
            {saveError && <Text color="red.500" mb={4}>{saveError}</Text>}
            {likeError && <Text color="red.500" mb={4}>{likeError}</Text>}

            {/* Conditionally render the "Share a New Tip" button */}
            {isOwnProfile && (
                <Button onClick={() => setIsCreatePostModalOpen(true)} mb={4} colorScheme="blue">
                    Share a New Tip
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
                    setPosts={setTipsInternal}
                    setLoading={setIsSubmittingPost}
                    postType="tip"
                />
            )}

            {/* Now use filteredTips for rendering */}
            {filteredTips.length === 0 && !feedLoading ? (
                <Text>No tips found.</Text>
            ) : (
                filteredTips.map(tip => (
                    <PostCard
                        key={tip.id}
                        post={{ ...tip, postType: 'tip' }}
                        currentUser={user}
                        onEdit={() => handleEdit(tip.id)}
                        onReport={() => { console.log(`Reporting tip ${tip.id}`); }}
                        onDelete={onDeleteTip}
                        onComment={() => toggleShowComments(tip.id)}
                        onShare={() => { console.log(`Sharing tip ${tip.id}`); }}
                        onSave={onSaveTip}
                        onLike={onLikeTip}
                        onSendComment={() => handleGenericSubmit(tip.id)}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        mediaPreview={mediaPreview}
                        setMediaPreview={setMediaPreview}
                        showComments={showComments}
                        toggleShowComments={toggleShowComments}
                        comments={comments}
                        postType="tip"
                        handleGenericSubmit={handleGenericSubmit}
                        onCommentsRefetchOrUpdate={handleCommentsRefetchOrUpdate}
                    />
                ))
            )}
        </Box>
    );
};

export default TipFeed;