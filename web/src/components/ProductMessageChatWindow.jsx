// src/components/ProductMessageChatWindow.jsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../user/Socket';
import { BASE_URL, getToken } from "../config";
import {
    Box, TextField, Button, Typography, Paper, IconButton, CircularProgress, Avatar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import moment from 'moment';
import EmojiPicker from 'emoji-picker-react';
import { ClickAwayListener } from '@mui/material';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
const token = getToken(); // Get the token for authentication
const uploadFileAndGetUrl = async (file) => {
    const formData = new FormData();
    formData.append('mediaFile', file);

    try {
        const response = await fetch(`${BASE_URL}/api/upload/message-media`, {
            method: 'POST',
            body: formData,
            headers: {
                authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other';
        const fullMediaUrl = `${BASE_URL}${data.filePath}`;

        return {
            media_url: fullMediaUrl,
            media_type: fileType,
        };
    } catch (error) {
        console.error("Error during file upload:", error);
        throw error;
    }
};

import { getProductChatRoomId } from '@/utils/ChatUtils';

/**
 * ProductMessageChatWindow component for business-to-user chat about a specific product.
 * @param {object} props - Component props.
 * @param {object} props.currentUser - The currently logged-in user object.
 * @param {('user'|'business')} props.currentUserType - The type of the current user ('user' or 'business').
 * @param {object} props.business - The business object (must have .id, .name, .logo_url, .owner_id).
 * @param {object} props.product - The product object (must have .product_id, .name).
 * @param {object} props.onBack - Callback function to navigate back.
 * @param {object} props.recipientUser - The user object (can be a regular user or a business owner) who is receiving the message.
 */
const ProductMessageChatWindow = ({ currentUser, currentUserType, business, product, onBack, recipientUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [attachedMedia, setAttachedMedia] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    // Validate essential props
    const isReady = currentUser?.id && currentUserType && business?.id && product?.product_id && recipientUser?.id;
//console.log('recipientUser:', recipientUser);
    // Determine the user ID and business ID for room generation regardless of current user type
    const chatUserId = currentUserType === 'user' ? currentUser.id : recipientUser.id;
    const chatBusinessId = currentUserType === 'business' ? currentUser.id : business.id; // Correctly get the business ID (either from currentUser if they are business, or from the business prop)
    const actualBusinessId = business.id; // This is always the ID of the business associated with the product

    // Generate the product-specific room ID.
    // getProductChatRoomId takes (userId, businessId, productId)
    const roomId = isReady ? getProductChatRoomId(chatUserId, actualBusinessId, product.product_id) : null;

    const handleEmojiClick = (emojiData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };

    const handleClickAway = useCallback(() => {
        setShowEmojiPicker(false);
    }, []);

    useEffect(() => {
        if (!isReady || !roomId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/api/productmessages/${roomId}`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                setMessages(data);
                socket.emit('join_room', roomId);
                console.log(`Chat: Joined room ${roomId}`);
            } catch (err) {
                console.error('Failed to fetch product messages:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        socket.on('receive_message', (message) => {
            if (message.room_id === roomId) {
            //    console.log("Received message in ProductMessageChatWindow:", message);
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        });

        return () => {
            socket.off('receive_message');
            socket.emit('leave_room', roomId);
            console.log(`Chat: Left room ${roomId}`);
        };
    }, [roomId, isReady, currentUser.id, currentUserType, business.id, product.product_id, recipientUser.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
    if (!roomId || !isReady) return;

    socket.emit('mark_message_read', {
        room_id: roomId,
        recipient_id: currentUser.id,
    });
}, [roomId, isReady, currentUser.id]);


    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        const newMedia = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other',
        }));
        setAttachedMedia((prev) => [...prev, ...newMedia]);
        event.target.value = null;
    };

    const handleRemoveMedia = (indexToRemove) => {
        setAttachedMedia((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSendMessage = async () => {
        if (!isReady || (newMessage.trim() === '' && attachedMedia.length === 0)) {
            console.warn("Attempted to send message but chat window is not ready or message is empty.");
            return;
        }

        let uploadedMediaDetails = [];
        if (attachedMedia.length > 0) {
            for (const mediaItem of attachedMedia) {
                try {
                    const uploaded = await uploadFileAndGetUrl(mediaItem.file);
                    uploadedMediaDetails.push(uploaded);
                } catch (error) {
                    console.error("Failed to upload media:", error);
                    return;
                }
            }
        }

        const senderType = currentUserType;
        const recipientType = currentUserType === 'user' ? 'business' : 'user';

        const messagePayload = {
            room_id: roomId,
            sender_id: currentUser.id,
            recipient_id: recipientUser.id,
            text: newMessage.trim(),
            created_at: new Date().toISOString(),
            sender_type: senderType,
            recipient_type: recipientType,
            business_id: business.id, // Always the ID of the product's business
            product_id: product.product_id,
            media: uploadedMediaDetails,
        };

   //     console.log("Sending message payload:", messagePayload);

        socket.emit('send_message', messagePayload);
        setNewMessage('');
        setAttachedMedia([]);
    };

    if (!isReady) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                    Loading product chat...
                </Typography>
                {!currentUser?.id && <Typography variant="caption" color="error">Error: Current user ID missing.</Typography>}
                {!currentUserType && <Typography variant="caption" color="error">Error: Current user type missing.</Typography>}
                {!business?.id && <Typography variant="caption" color="error">Error: Business ID missing.</Typography>}
                {!product?.product_id && <Typography variant="caption" color="error">Error: Product ID missing.</Typography>}
                {!recipientUser?.id && <Typography variant="caption" color="error">Error: Recipient user ID missing.</Typography>}
            </Box>
        );
    }

    // Determine whose avatar/name to show in the header
    const chatPartnerDisplayName = currentUserType === 'user' ? business.name : recipientUser.username;
    const chatPartnerAvatar = currentUserType === 'user' ? business.logo_url : recipientUser.profile_picture_url;


    return (
        <Box display="flex" flexDirection="column" height="100%" sx={{ border: 'none', borderRadius: 0 }}>
            <Box
                sx={{
                    p: 2,
                    borderBottom: '1px solid #eee',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    gap: 1,
                }}
            >
                {onBack && (
                    <IconButton onClick={onBack} size="small">
                        <ArrowBackIcon />
                    </IconButton>
                )}
                {/* Display recipient's avatar (business logo or user profile pic) */}
                <Avatar src={chatPartnerAvatar} sx={{ width: 30, height: 30 }} />
                <Typography variant="h6">Chat about "{product.name}" with {chatPartnerDisplayName}</Typography>
            </Box>

            <Paper
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 0,
                }}
            >
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                    </Box>
                ) : messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        No messages yet for this product. Start the conversation!
                    </Typography>
                ) : (
                    messages.map((msg, index) => (
                        <Box
                            key={index}
                            sx={{
                                // Align based on the sender_type property of the message itself
                                alignSelf: msg.sender_type === currentUserType ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.sender_type === currentUserType ? '#dcf8c6' : '#ffffff',
                                borderRadius: '10px',
                                p: 1.5,
                                maxWidth: '70%',
                                wordBreak: 'break-word',
                                boxShadow: 1,
                            }}
                        >
                            {msg.text && <Typography variant="body2">{msg.text}</Typography>}
                            {/* --- MODIFICATION START --- */}
                            {msg.media && msg.media.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: msg.text ? 1 : 0 }}>
                                    {msg.media.map((mediaItem, mediaIndex) => (
                                        // Only render the media box if media_url exists
                                        mediaItem.media_url ? (
                                            <Box key={mediaIndex} sx={{ position: 'relative', width: 100, height: 100, overflow: 'hidden', borderRadius: '8px' }}>
                                                {mediaItem.media_type === 'image' && (
                                                    <img
                                                        src={mediaItem.media_url}
                                                        alt="Attached media"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                    />
                                                )}
                                                {mediaItem.media_type === 'video' && (
                                                    <Box sx={{
                                                        width: '100%', height: '100%', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        backgroundColor: 'grey.200', borderRadius: '4px'
                                                    }}>
                                                        <VideocamOutlinedIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                                                    </Box>
                                                )}
                                                {!['image', 'video'].includes(mediaItem.media_type) && (
                                                    <Box sx={{
                                                        width: '100%', height: '100%', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        backgroundColor: 'grey.200', color: 'grey.600',
                                                        fontSize: '0.75rem', textAlign: 'center'
                                                    }}>
                                                        Unsupported Media
                                                    </Box>
                                                )}
                                             
                                            </Box>
                                        ) : null // Don't render if media_url is missing
                                    ))}
                                </Box>
                            )}
                            {/* --- MODIFICATION END --- */}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {moment(msg.created_at).calendar()}
                            </Typography>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Paper>

            {attachedMedia.length > 0 && (
                <Box sx={{ p: 1, borderTop: '1px solid #eee', display: 'flex', gap: 1, overflowX: 'auto' }}>
                    {attachedMedia.map((mediaItem, index) => (
                        <Box key={index} sx={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                            {mediaItem.type === 'image' && (
                                <img
                                    src={mediaItem.preview}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                />
                            )}
                            {mediaItem.type === 'video' && (
                                <Box sx={{
                                    width: '100%', height: '100%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'grey.200', borderRadius: '4px'
                                }}>
                                    <VideocamOutlinedIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                                </Box>
                            )}
                            {mediaItem.type === 'other' && (
                                <Box sx={{
                                    width: '100%', height: '100%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'grey.200', borderRadius: '4px'
                                }}>
                                    <AttachFileIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                                </Box>
                            )}
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveMedia(index)}
                                sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}

            <Box display="flex" alignItems="center" gap={1} p={2} borderTop="1px solid #eee" position="relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    multiple
                    accept="image/*,video/*"
                />
                <IconButton onClick={() => fileInputRef.current.click()} color="primary" sx={{ flexShrink: 0 }}>
                    <AttachFileIcon />
                </IconButton>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSendMessage();
                        }
                    }}
                    size="small"
                    InputProps={{
                        endAdornment: (
                            <>
                                <IconButton
                                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                                    size="small"
                                >
                                    <InsertEmoticonIcon />
                                </IconButton>
                            </>
                        )
                    }}
                />
                <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    endIcon={<SendIcon />}
                    sx={{ flexShrink: 0 }}
                >
                    Send
                </Button>

                {showEmojiPicker && (
                    <Box
                        ref={emojiPickerRef}
                        sx={{
                            position: 'absolute',
                            bottom: 60,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 999,
                            boxShadow: 3,
                            width: 'min(320px, 90vw)',
                        }}
                    >
                        <ClickAwayListener onClickAway={handleClickAway}>
                            <Box>
                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </Box>
                        </ClickAwayListener>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default ProductMessageChatWindow;