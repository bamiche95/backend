// GroupFeed.jsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import PostCard from './PostCard';
import { useFeed } from '@/hooks/useFeed';
import { getGroupPosts } from '../api/group';
import { Spinner } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { Box, Text } from '@chakra-ui/react';
import CreateGroupPost from './CreateGroupPost';
import {socket} from '@/user/Socket';
import { useLocation } from 'react-router-dom';
import {getToken, BASE_URL} from '../config';
const token = getToken(); // Get the token for authentication
function GroupFeed({ groupId, posts, setPosts, setLoading }) { // <-- Keep original prop names here
    const [editingPost, setEditingPost] = useState(null);
    const { user } = useAuth();
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingPostId, setReportingPostId] = useState(null);
    const location = useLocation();
    const postRefs = useRef({});

    const fetchGroupPosts = useCallback(() => getGroupPosts(groupId), [groupId]);
    const {
        posts: groupPosts,
        loading: feedLoading,
        setPosts: setGroupPostsInternal, // This is the setter from useFeed
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
        handleLikeToggle,
        handleCommentLikeToggle
    } = useFeed('group', fetchGroupPosts, groupId);

    // This effect ensures that the posts state is correctly initialized and updated
    // when data comes from useFeed.
    useEffect(() => {
        // Use the original prop names: `setPosts` and `setLoading`
        if (setPosts) {
            setPosts(groupPosts); // Pass posts up to parent if prop is provided
        }
    }, [groupPosts, setPosts]); // Depend on original prop name

    useEffect(() => {
        if (setLoading) {
            setLoading(feedLoading); // Pass loading state up to parent
        }
    }, [feedLoading, setLoading]); // Depend on original prop name


    // ... (rest of your socket.on and other useEffects remain the same)
    useEffect(() => {
        if (!groupId) return;

        console.log(`🔗 Attempting to join group socket room: ${groupId.toString()}`);
        socket.emit('joinGroup', groupId.toString());

        const handleNewGroupPost = (newPost) => {
            console.log('📡 Received newGroupPost:', newPost);
            setGroupPostsInternal(prevPosts => [newPost, ...prevPosts]);
        };

        const handleGroupPostUpdated = (updatedPost) => {
            console.log('📡 Received groupPostUpdated:', updatedPost);
            setGroupPostsInternal(prevPosts =>
                prevPosts.map(post => (post.id === updatedPost.id ? updatedPost : post))
            );
        };

        const handleGroupPostDeleted = (deletedPostId) => {
            console.log('📡 Received groupPostDeleted:', deletedPostId);
            setGroupPostsInternal(prevPosts =>
                prevPosts.filter(post => post.id !== deletedPostId)
            );
        };

        socket.on('groupPostCreated', handleNewGroupPost);
        socket.on('groupPostUpdated', handleGroupPostUpdated);
        socket.on('groupPostDeleted', handleGroupPostDeleted);

        socket.on('connect', () => {
            console.log('✅ GroupFeed Socket connected:', socket.id);
        });

        return () => {
            socket.off('groupPostCreated', handleNewGroupPost);
            socket.off('groupPostUpdated', handleGroupPostUpdated);
            socket.off('groupPostDeleted', handleGroupPostDeleted);
            socket.off('connect');
        };
    }, [groupId, setGroupPostsInternal]);

    const handleCommentsRefetchOrUpdate = useCallback(async (postIdToRefresh) => {
        // Implement fetching or refreshing comments logic here if needed
    }, [setComments, user]);

    const handleEdit = useCallback((post) => {
        setEditingPost(post);
        setIsCreatePostModalOpen(true);
    }, []);

    const onDeleteDiscussion = useCallback(
        (postId) => {
            handleDeletePost(postId, 'group');
        },
        [handleDeletePost]
    );

    // --- NEW EFFECT FOR HIGHLIGHTING AND SCROLLING ---
    useEffect(() => {
        if (!groupPosts.length) return;

        const queryParams = new URLSearchParams(location.search);
        const highlightPostId = queryParams.get('highlightPost');

        if (highlightPostId) {
            let reorderedPosts = [...groupPosts];

            const postToHighlightIndex = reorderedPosts.findIndex(
                (p) => String(p.id || p.postId) === String(highlightPostId)
            );

            if (postToHighlightIndex !== -1) {
                const [highlightedPost] = reorderedPosts.splice(postToHighlightIndex, 1);
                reorderedPosts = [highlightedPost, ...reorderedPosts];

                setGroupPostsInternal(reorderedPosts);

                setTimeout(() => {
                    const el = postRefs.current[highlightPostId];
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('highlightPost');
                    window.history.replaceState({}, document.title, newUrl.toString());

                }, 100);
            }
        }
    }, [groupPosts, location.search, setGroupPostsInternal]);

    const onSaveGroupPost = useCallback(
        (groupPostsId, receivedPostType, isCurrentlySaved, setIsSaved) => {
            handleSavePost(groupPostsId, 'group', isCurrentlySaved, setIsSaved);
        },
        [handleSavePost]
    );

    const onLikeGroupPost = useCallback(
        (groupPostsId, receivedPostType, isCurrentlyLiked, setIsLiked) => {
            handleLikePost(groupPostsId, 'group', isCurrentlyLiked, setIsLiked);
        },
        [handleLikePost]
    );

    if (feedLoading) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" height="200px">
                <Spinner size="xl" />
                <Text ml={4}>Loading groupPosts...</Text>
            </Box>
        );
    }

    if (groupPosts.length === 0) {
        return <p>No groupPosts found.</p>;
    }


    const handleReport = (postId) => {
        setReportingPostId(postId);
        setIsReportModalOpen(true);
    };

    const handleReportSubmit = async (postId, reason, description) => {
        try {
            const res = await fetch(`${BASE_URL}/api/report-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ postId, postType: 'discussion', reason, description }),
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
        <div>
            {groupPosts.map(post => (
                <Box
                    key={post.id || post.postId}
                    ref={el => (postRefs.current[post.id || post.postId] = el)}
                    mb={6}
                >
                    <PostCard
                        post={post}
                        groupId={groupId}
                        postType={post.postType}
                        currentUser={user}
                        onLike={onLikeGroupPost}
                        onSave={onSaveGroupPost}
                        onEdit={handleEdit}
                        onDelete={onDeleteDiscussion}
                        onReport={handleReport}
                        onComment={() => toggleShowComments(post.id || post.postId)}
                        onShare={() => console.log(`Sharing group post ${post.id || post.postId}`)}
                        onSendComment={() => handleGenericSubmit(groupId, post.id || post.postId, null, commentText, mediaFiles)}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        mediaPreview={mediaPreview}
                        setMediaPreview={setMediaPreview}
                        showComments={showComments}
                        toggleShowComments={toggleShowComments}
                        comments={comments}
                        onCommentsRefetchOrUpdate={handleCommentsRefetchOrUpdate}
                        onCommentLikeToggle={handleCommentLikeToggle}
                        handleGenericSubmit={handleGenericSubmit}
                    />
                </Box>
            ))}
            {isCreatePostModalOpen && (
                <CreateGroupPost
                    open={isCreatePostModalOpen}
                    onClose={() => {
                        setIsCreatePostModalOpen(false);
                        setEditingPost(null);
                    }}
                    userId={user.id}
                    groupId={groupId}
                    postToEdit={editingPost}
                    isEditing={!!editingPost}
                    setPosts={setPosts} // Still uses the original `setPosts` prop
                    setLoading={setLoading} // Still uses the original `setLoading` prop
                />
            )}
            {isReportModalOpen && (
                <ReportModal
                    postId={reportingPostId}
                    onClose={() => setIsReportModalOpen(false)}
                    onSubmit={handleReportSubmit}
                />
            )}
        </div>
    );
}
export default GroupFeed;