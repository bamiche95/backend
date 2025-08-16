import React, { useEffect, useState, useCallback } from 'react';
import { socket } from '@/user/Socket';
import { BASE_URL, getToken } from "../config";
import useFormattedDate from '@/Hooks/useFromattedDate';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const format = useFormattedDate();
    const { user } = useAuth();
    const navigate = useNavigate(); // Initialize useNavigate

    // Define handleNewNotification using useCallback at the component's top level
    const handleNewNotification = useCallback((notificationPayload) => {
        console.log('Received new notification from socket:', notificationPayload);

        if (notificationPayload.type === 'new_alert_notification' || notificationPayload.recipientId === user.id) {
            setNotifications(prev => [
                {
                    id: notificationPayload.id,
                    recipient_user_id: notificationPayload.recipient_user_id,
                    actor_user_id: notificationPayload.actor_user_id,
                    action_type: notificationPayload.action_type,
                    target_type: notificationPayload.target_type,
                    target_id: notificationPayload.target_id,
                    parent_type: notificationPayload.parent_type, // Potentially useful for comments/replies
                    parent_id: notificationPayload.parent_id, // Potentially useful for comments/replies
                    metadata: notificationPayload.metadata,
                    is_read: notificationPayload.is_read,
                    read: notificationPayload.read,
                    created_at: notificationPayload.created_at,
                    actorProfilePicture: notificationPayload.metadata?.senderProfilePicture || notificationPayload.actorProfilePicture,
                    actorFullname: notificationPayload.metadata?.senderName || notificationPayload.actorFullname,
                    actorUsername: notificationPayload.metadata?.senderUsername || notificationPayload.actorUsername,
                    message: notificationPayload.message
                },
                ...prev
            ]);
            setUnreadCount(c => c + 1);
        } else {
            console.log('Ignored non-targeted or non-notification payload:', notificationPayload);
        }
    }, [user?.id]);

    // Fetch notifications on component mount
    useEffect(() => {
        async function fetchNotifications() {
            try {
                const res = await fetch(`${BASE_URL}/api/notifications`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.notifications.filter(n => !n.read).length);
            } catch (err) {
                console.error('Failed to fetch notifications', err);
            }
        }
        fetchNotifications();
    }, []);

    // Socket event listeners for real-time updates and room joining
    useEffect(() => {
        if (!user?.id) {
            console.log("User ID not available, cannot join notification room or set up user-specific listeners.");
            return;
        }

        const notificationRoom = `user_notifications:${user.id}`;
        socket.emit('joinRoom', notificationRoom);
      
        // Add the new listener for 'new_alert_notification'
        socket.on('new_alert_notification', handleNewNotification);

        // Your existing listeners
        socket.on('alert_comment_notification', handleNewNotification);
        socket.on('alert_reply_notification', handleNewNotification);
        socket.on('tip_comment_notification', handleNewNotification);
        socket.on('tip_reply_notification', handleNewNotification);
        socket.on('Youtube_notification', handleNewNotification);
        socket.on('Youtube_reply_notification', handleNewNotification);
        socket.on('discussion_comment_notification', handleNewNotification);
        socket.on('discussion_reply_notification', handleNewNotification);
        socket.on('comment_like_notification', handleNewNotification);
        socket.on('reply_like_notification', handleNewNotification);
        socket.on('group_comment_notification', handleNewNotification);
        socket.on('group_reply_notification', handleNewNotification);
        socket.on('post_like_notification', handleNewNotification);
        socket.on('post_save_notification', handleNewNotification);
        socket.on('question_posted', handleNewNotification);


        return () => {
            // Cleanup for all listeners
            socket.off('new_alert_notification', handleNewNotification);
            socket.off('alert_comment_notification', handleNewNotification);
            socket.off('alert_reply_notification', handleNewNotification);
            socket.off('tip_comment_notification', handleNewNotification);
            socket.off('tip_reply_notification', handleNewNotification);
            socket.off('Youtube_notification', handleNewNotification);
            socket.off('Youtube_reply_notification', handleNewNotification);
            socket.off('discussion_comment_notification', handleNewNotification);
            socket.off('discussion_reply_notification', handleNewNotification);
            socket.off('comment_like_notification', handleNewNotification);
            socket.off('reply_like_notification', handleNewNotification);
            socket.off('group_comment_notification', handleNewNotification);
            socket.off('group_reply_notification', handleNewNotification);
            socket.off('post_like_notification', handleNewNotification);
            socket.off('post_save_notification', handleNewNotification);
            socket.off('question_posted', handleNewNotification);

            socket.emit('leaveRoom', notificationRoom);
            console.log(`Frontend left notification room: ${notificationRoom}`);
        };
    }, [user?.id, handleNewNotification]);

    // Mark all notifications as read (could be on page unload or button click)
    async function markAllRead() {
        try {
            await fetch(`${BASE_URL}/api/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            setNotifications(notifs => notifs.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark notifications read', err);
        }
    }

    // Function to format the notification message
    function formatNotification(n) {
        if (n.message) {
            return n.message;
        }

        const actorFullName = n.metadata?.senderName || `${n.actorFirstName ?? ''} ${n.actorLastName ?? ''}`.trim() || n.actorFullname || 'Someone';
        const target = n.target_type;
        const action = n.action_type || n.type;

        if (action === 'alert_posted') {
            const alertTypeName = n.metadata?.alertTypeName || 'an alert';
            return `${actorFullName} posted a new ${alertTypeName} near you: "${n.metadata?.alertTitle || 'An alert'}"`;
        }
        if (action === 'question_posted') {
            const professionNames = n.metadata?.professions?.join(', ') || 'a profession';
            return `${actorFullName} asked a new question relevant to ${professionNames}!`;
        }

        if (target === 'alert') {
            if (action === 'comment') return `${actorFullName} commented on your alert`;
            if (action === 'reply') return `${actorFullName} replied to your alert comment`;
        }

        if (action === 'like') return `${actorFullName} liked your ${target} post`;
        if (action === 'comment') return `${actorFullName} commented on your ${target} `;
        if (action === 'reply') return `${actorFullName} replied to your ${target} `;
        if (action === 'answer') return `${actorFullName} answered your question`;
        if (action === 'mention') return `${actorFullName} mentioned you in a ${target}`;
        if (action === 'attend_event') return `${actorFullName} is attending your event`;
        if (action === 'save') return `${actorFullName} saved your ${target} post`;

        return `${actorFullName} did something`;
    }

    // Function to mark a single notification as read
    async function markAsRead(notificationId) {
        try {
            await fetch(`${BASE_URL}/api/notifications/${notificationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, read: true } : n
                )
            );
            setUnreadCount((count) => count - 1);
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    }

    // New function to handle navigation
    // Inside your Notifications.jsx component

const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
        markAsRead(notification.id);
    }

    const postType = notification.target_type;
    const postId = notification.target_id;

    let path = '';
    if (postType && postId) {
        let urlSegment = '';
        switch (postType) {
            case 'discussion':
            case 'post': // <--- Add this case!
                urlSegment = 'discussions';
                break;
            case 'question':
            
                urlSegment = 'questions';
                break;
            case 'alert':
                urlSegment = 'alerts';
                break;
            case 'tip':
                urlSegment = 'tips';
                break;
            default:
                console.warn(`Unknown target_type for navigation: ${postType}`);
                return;
        }

        if (urlSegment) {
            path = `/${urlSegment}/${postId}`;
            navigate(path);
        } else {
            console.warn(`Could not determine URL segment for post type: ${postType}`);
        }
    } else {
        console.warn("Notification missing target_type or target_id for navigation:", notification);
    }
}, [navigate]);
    return (
        <div>
            <h2>
                Notifications{' '}
                {unreadCount > 0 && <span style={{ color: 'red' }}>({unreadCount})</span>}
            </h2>

            <button onClick={markAllRead}>Mark all as read</button>

            <ul>
                {notifications.length === 0 && <li>No notifications</li>}
                {notifications.map((n) => (
                    <li
                        key={n.id || `temp-${n.created_at}-${n.target_id}`}
                        onClick={() => handleNotificationClick(n)} // Use the new handler here
                        style={{
                            fontWeight: n.read ? 'normal' : 'bold',
                            marginBottom: '1em',
                            cursor: 'pointer',
                            backgroundColor: n.read ? '#fff' : '#f9f9ff',
                            padding: '10px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: n.read ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                            transition: 'background-color 0.3s ease, transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eef4ff';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = n.read ? '#fff' : '#f9f9ff';
                            e.currentTarget.style.transform = 'none';
                        }}
                    >
                        <img
                            src={n.actorProfilePicture || n.metadata?.senderProfilePicture || '/default-avatar.png'}
                            alt="actor"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                marginRight: 12,
                                objectFit: 'cover',
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{formatNotification(n)}</span>
                                {!n.read && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 8,
                                            height: 8,
                                            backgroundColor: 'red',
                                            borderRadius: '50%',
                                        }}
                                    />
                                )}
                            </div>

                            {n.metadata?.questionContent && n.action_type === 'question_posted' && (
                                <div style={{ fontStyle: 'italic', color: '#555' }}>
                                    "{n.metadata.questionContent}"
                                </div>
                            )}
                            {n.metadata?.alertDescription && n.action_type === 'alert_posted' && (
                                <div style={{ fontStyle: 'italic', color: '#555' }}>
                                    "{n.metadata.alertDescription}"
                                </div>
                            )}
                            {n.metadata?.comment_snippet && n.action_type !== 'question_posted' && n.action_type !== 'alert_posted' && (
                                <div style={{ fontStyle: 'italic', color: '#555' }}>
                                    "{n.metadata.comment_snippet}"
                                </div>
                            )}
                            {n.metadata?.post_snippet && n.action_type !== 'question_posted' && n.action_type !== 'alert_posted' && (
                                <div style={{ fontStyle: 'italic', color: '#555' }}>
                                    "{n.metadata.post_snippet}"
                                </div>
                            )}

                            <small style={{ color: '#999' }}>{format(n.created_at)}</small>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Notifications;