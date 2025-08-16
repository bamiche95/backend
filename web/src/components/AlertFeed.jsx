import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Text, Spinner } from '@chakra-ui/react';
import PostCard from './PostCard';
import RadiusFilter from './RadiusFilter';
import { useFeed } from '../Hooks/useFeed';
import { getAlerts } from '../api/alert'; // Ensure this is the modified getAlerts
import { useAuth } from '../context/AuthContext';
import CreatePost from '@/user/CreatePost';
import { socket } from '@/user/socket';

const AlertFeed = ({ profileUserId, isOwnProfile, openEditModal }) => {
    const [latLng, setLatLng] = useState(null);
    const [radius, setRadius] = useState(5);
    const [fetchingLocation, setFetchingLocation] = useState(true);
    const [locationError, setLocationError] = useState(null);
    const { user } = useAuth();
    const [editingPost, setEditingPost] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);

    // --- MODIFIED: fetchAlerts now calls getAlerts with appropriate parameters ---
    const fetchAlerts = useCallback(async () => {
        if (profileUserId) {
            // On a user's profile, fetch alerts by userId
           // console.log(`Fetching alerts for profile ID: ${profileUserId}`);
            try {
                return await getAlerts(null, null, null, profileUserId); // Pass userId, location args are null/ignored by backend
            } catch (err) {
                console.error('Error fetching alerts for profile:', err);
                // Return empty array to avoid breaking UI, error message handled by deletionError/saveError/likeError states if applicable
                return [];
            }
        } else {
            // On the general feed, fetch alerts by location
            if (!latLng) {
                console.log("Waiting for location to fetch alerts for general feed...");
                return [];
            }
            try {
                return await getAlerts(latLng.lat, latLng.lng, radius);
            } catch (err) {
                console.error('Error fetching alerts for general feed:', err);
                return [];
            }
        }
    }, [latLng, radius, profileUserId]); // Added profileUserId to dependencies

    const {
        posts, // This will now contain either user-specific alerts or nearby alerts from the API
        loading: feedLoading,
        comments,
        setComments,
        showComments,
        toggleShowComments,
        commentText,
        setCommentText: setResponseText,
        mediaFiles,
        setMediaFiles,
        mediaPreview,
        setMediaPreview,
        handleGenericSubmit: handleAlertSubmit,
        handleDeletePost,
        deletionError,
        handleSavePost,
        saveError,
        handleLikePost,
        likeError,
        setPosts
    } = useFeed('alert', fetchAlerts);

const handleEdit = (post) => {
  setEditingPost(post);
  setIsCreatePostModalOpen(true);
};

    useEffect(() => {
        if (!socket || !socket.connected) {
            console.warn('Socket.IO client not connected in AlertFeed, delaying listener setup.');
            return;
        }

       // console.log('🔗 AlertFeed Socket connected:', socket.id);

        const handleNewAlert = (newAlert) => {
          //  console.log('📡 Received newAlert:', newAlert);
            // Only add new alerts if they belong to the current profile being viewed,
            // or if no profile filter is active.
            if (!profileUserId || (newAlert.user && Number(newAlert.user.userId) === Number(profileUserId))) {
                setPosts(prevAlerts => [newAlert, ...prevAlerts]);
            }
        };

        const handleAlertUpdated = ({ alert }) => {
            console.log('📡 Received alertUpdated:', alert);
            setPosts(prev => {
                const updated = prev.map(a => (a.id === alert.id ? alert : a));
                const exists = updated.some(a => a.id === alert.id);
                // If the updated alert wasn't found and matches the profileUserId, add it.
                if (!exists && (!profileUserId || (alert.user && Number(alert.user.userId) === Number(profileUserId)))) {
                    updated.unshift(alert);
                }
                return updated;
            });
        };

        const handleAlertDeleted = ({ alertId }) => {
           // console.log('📡 Received alertDeleted:', alertId);
            setPosts(prev => prev.filter(a => a.id !== alertId));
        };

        socket.on('newAlert', handleNewAlert);
        socket.on('alertUpdated', handleAlertUpdated);
        socket.on('alertDeleted', handleAlertDeleted);

        return () => {
            socket.off('newAlert', handleNewAlert);
            socket.off('alertUpdated', handleAlertUpdated);
            socket.off('alertDeleted', handleAlertDeleted);
        };
    }, [setPosts, profileUserId]);

    const handleCommentsRefetchOrUpdate = useCallback(async (postIdToRefresh) => {
       // console.log(`Comments for alert ${postIdToRefresh} need to be re-fetched or updated.`);
    }, [setComments, user]);

    // --- MODIFIED: fetchLocation useEffect now only runs for general feed ---
    useEffect(() => {
        if (!profileUserId) { // Only fetch location if NOT on a profile page
            setFetchingLocation(true);
            setLocationError(null);
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    setLatLng({ lat: coords.latitude, lng: coords.longitude });
                    setFetchingLocation(false);
                },
                (err) => {
                    setLocationError(err.message);
                    setFetchingLocation(false);
                    // If location access is denied, still attempt to fetch general alerts later
                    // with a default or broader search, or show a relevant message.
                    // For now, the `getAlerts` call will receive nulls and might return empty.
                }
            );
        } else {
            // If on a profile page, we don't need location, so immediately set to not fetching
            setFetchingLocation(false);
            setLocationError(null); // Clear any previous location errors
            setLatLng(null); // Clear latLng so fetchAlerts won't wait for it unnecessarily
        }
    }, [profileUserId]); // Rerun when profileUserId changes

    const onDeleteAlert = useCallback((alertId) => {
        handleDeletePost(alertId, 'alert');
    }, [handleDeletePost]);

    const onSaveAlert = useCallback((alertId, receivedPostType, isCurrentlySaved, setIsSaved) => {
        handleSavePost(alertId, 'alert', isCurrentlySaved, setIsSaved);
    }, [handleSavePost]);

    const onLikeAlert = useCallback((alertId, receivedPostType, isCurrentlyLiked, setIsLiked) => {
        handleLikePost(alertId, 'alert', isCurrentlyLiked, setIsLiked);
    }, [handleLikePost]);

    // --- Conditional spinner for location fetching only when needed ---
    // This spinner is for the initial location *acquisition* for the general feed.
    if (fetchingLocation && !profileUserId) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" height="calc(100vh - 100px)">
                <Spinner size="xl" />
                <Text ml={4}>Getting your location...</Text>
            </Box>
        );
    }

    // Show error if location fetching failed for general feed
    if (locationError && !profileUserId) {
        return (
            <Box p={4}>
                <Text color="red.500" mb={4}>Error: {locationError}</Text>
                <Button onClick={() => fetchLocation()}>Try Again</Button>
            </Box>
        );
    }

    // Only show spinner for initial feed loading if no posts are present.
    // Now 'posts' from useFeed already contains the correct set (all user's or nearby general).
    if (feedLoading && posts.length === 0) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" height="200px">
                <Spinner size="xl" />
                <Text ml={4}>Loading alerts...</Text>
            </Box>
        );
    }

    return (
        <Box p={4}>
            {/* RadiusFilter is only relevant for the main alert feed, not user profile */}
            {!profileUserId && <RadiusFilter radius={radius} setRadius={setRadius} />}

            {deletionError && <Text color="red.500" mb={4}>{deletionError}</Text>}
            {saveError && <Text color="red.500" mb={4}>{saveError}</Text>}
            {likeError && <Text color="red.500" mb={4}>{likeError}</Text>}

            {isOwnProfile && (
                <Button onClick={() => setIsCreatePostModalOpen(true)} mb={4} colorScheme="blue">
                    Create New Alert
                </Button>
            )}

            {isCreatePostModalOpen && (
                <CreatePost
                  isOpen={isCreatePostModalOpen}  // Add this!
  postToEdit={editingPost}
  isEditing={!!editingPost}
  closeModal={() => {
    setIsCreatePostModalOpen(false);
    setEditingPost(null);
  }}
  groupId={null}
  setLoading={setIsSubmittingPost}
  setPosts={setPosts}
  postType="alert"
                />
            )}

            {/* Now render directly from 'posts' since the backend handles filtering */}
            {posts.length === 0 && !feedLoading ? (
                <Text>
                    {profileUserId
                        ? `No alerts found for this user.`
                        : `No alerts found within ${radius} km.`
                    }
                </Text>
            ) : (
                posts.map((alert) => ( // Use 'posts' directly now
                    <PostCard
                        key={alert.id}
                        post={alert}
                        currentUser={user}
                        comments={comments}
                        showComments={showComments}
                        toggleShowComments={toggleShowComments}
                        commentText={commentText}
                        setCommentText={setResponseText}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        mediaPreview={mediaPreview}
                        setMediaPreview={setMediaPreview}
                        handleGenericSubmit={handleAlertSubmit}
                       onEdit={() => handleEdit(alert)}
                        onReport={() => handleReport(alert.id)}
                        onDelete={() => onDeleteAlert(alert.id)}
                        onComment={toggleShowComments}
                        onShare={() => { console.log(`Sharing alert ${alert.id}`); }}
                        onSave={onSaveAlert}
                        onLike={onLikeAlert}
                        onSendComment={() => handleAlertSubmit(alert.id)}
                        postType="alert"
                        onCommentsRefetchOrUpdate={handleCommentsRefetchOrUpdate}
                    />
                ))
            )}
        </Box>
    );
};

export default AlertFeed;