// src/components/BusinessChatWindow.jsx
"use client"; // Assuming you are using app directory with client components

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../user/Socket';
import { BASE_URL, getToken } from "../config";
import {
    Box, TextField, Button, Typography, Paper, IconButton, CircularProgress,
    Avatar, // Added Avatar for recipient info
    ClickAwayListener, // Import ClickAwayListener for emoji picker
} from '@mui/material'; // Using MUI components for the chat window content
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import back icon (from @mui/icons-material)
import AttachFileIcon from '@mui/icons-material/AttachFile'; // For attaching files
import CloseIcon from '@mui/icons-material/Close'; // For close button on media preview
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'; // For image placeholder
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'; // For video placeholder
import moment from 'moment';
import EmojiPicker from 'emoji-picker-react';
import { getChatRoomId } from '@/utils/ChatUtils';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon'; // Import emoji icon
const token = getToken(); // Get the token for authentication
// Placeholder for actual file upload (YOU NEED TO IMPLEMENT THIS)
// This function should take a File object and return a Promise that resolves
// with an object containing { media_url: string, media_type: 'image' | 'video' }
const uploadFileAndGetUrl = async (file) => {
    // Create FormData to send the file
    const formData = new FormData();
    formData.append('mediaFile', file); // 'mediaFile' should match the field name Multer expects on your server (e.g., uploadMessageMedia.single('mediaFile'))

    try {
        const response = await fetch(`${BASE_URL}/api/upload/message-media`, {
            method: 'POST',
            body: formData, // fetch will automatically set Content-Type: multipart/form-data
            // credentials: 'include', // Include if your backend uses session cookies for authentication
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json(); // Assuming your backend returns JSON
        // Example expected data: { filePath: '/uploads/message_media/media-12345.jpg' }

        const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other';

        // IMPORTANT: Construct the full URL. If your backend serves static files from `/uploads`,
        // then BASE_URL + data.filePath will give you the full public URL.
        const fullMediaUrl = `${BASE_URL}${data.filePath}`; // Assuming data.filePath is something like /uploads/message_media/media-unique.jpg

        return {
            media_url: fullMediaUrl,
            media_type: fileType,
        };
    } catch (error) {
        console.error("Error during file upload:", error);
        throw error; // Re-throw to be caught by handleSendMessage
    }
};

const BusinessChatWindow = ({ currentUser, recipient, businessId, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [attachedMedia, setAttachedMedia] = useState([]); // State to hold selected files for preview
    const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility
    const emojiPickerRef = useRef(null); // Ref for emoji picker container

    // Validate essential props before proceeding
    const isReady = currentUser?.id && recipient?.id && businessId;

    // The crucial change: Use businessId when 'business' type is involved in room ID generation
    // This ensures the room ID is consistent regardless of which side initiates the chat.
    const roomId = isReady ? getChatRoomId(businessId, 'business', recipient.id, 'user') : null;

    // Callback for emoji selection
    const handleEmojiClick = (emojiData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };

    // Callback to close emoji picker when clicking away
    const handleClickAway = useCallback(() => {
        setShowEmojiPicker(false);
    }, []);

    useEffect(() => {
        // Only proceed if all necessary props are available and roomId is generated
        if (!isReady || !roomId) {
            setLoading(false); // Stop loading if essential props are missing
            return;
        }

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/api/businessmessages/${roomId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                setMessages(data);
                socket.emit('join_room', roomId);
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        socket.on('receive_message', (message) => {
            if (message.room_id === roomId) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        });

        return () => {
            socket.off('receive_message');
            socket.emit('leave_room', roomId);
        };
    }, [roomId, currentUser?.id, recipient?.id, businessId, isReady]); // Added isReady to dependencies

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        const newMedia = files.map(file => ({
            file,
            preview: URL.createObjectURL(file), // Create a local URL for preview
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other',
        }));
        setAttachedMedia((prev) => [...prev, ...newMedia]);
        event.target.value = null; // Clear the input value
    };

    const handleRemoveMedia = (indexToRemove) => {
        setAttachedMedia((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSendMessage = async () => {
        // Add a check here as well to prevent sending if not ready
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
                    return; // Stop sending if upload fails
                }
            }
        }

        const messagePayload = {
            room_id: roomId,
            sender_id: currentUser.id, // Business owner's user ID (as stored in nearby_users)
            recipient_id: recipient.id, // Customer's user ID (as stored in nearby_users)
            text: newMessage.trim(),
            created_at: new Date().toISOString(),
            sender_type: 'business', // Sender is the business
            recipient_type: 'user', // Recipient is a user
            business_id: businessId, // Pass the actual businessId
            media: uploadedMediaDetails, // Include the uploaded media details
        };

        socket.emit('send_message', messagePayload);
        setNewMessage('');
        setAttachedMedia([]); // Clear attached media after sending
    };

    // Display loading or error message if essential props are not yet available
    if (!isReady) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                    Loading chat... Please ensure all chat participants are loaded.
                </Typography>
                {!currentUser?.id && <Typography variant="caption" color="error">Error: Current user ID missing.</Typography>}
                {!recipient?.id && <Typography variant="caption" color="error">Error: Recipient ID missing.</Typography>}
                {!businessId && <Typography variant="caption" color="error">Error: Business ID missing.</Typography>}
            </Box>
        );
    }

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
                <IconButton onClick={onBack} size="small">
                    <ArrowBackIcon />
                </IconButton>
                <Avatar src={recipient.profile_picture} sx={{ width: 30, height: 30 }} />
                <Typography variant="h6">{recipient.firstname} {recipient.lastname}</Typography>
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
                        No messages yet. Start the conversation!
                    </Typography>
                ) : (
                    messages.map((msg, index) => (
                        <Box
                            key={index}
                            sx={{
                                alignSelf: msg.sender_type === 'business' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.sender_type === 'business' ? '#dcf8c6' : '#ffffff',
                                borderRadius: '10px',
                                p: 1.5,
                                maxWidth: '70%',
                                wordBreak: 'break-word',
                                boxShadow: 1,
                            }}
                        >
                            {msg.text && <Typography variant="body2">{msg.text}</Typography>}
                            {msg.media && msg.media.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: msg.text ? 1 : 0 }}>
                                    {msg.media.map((mediaItem, mediaIndex) => (
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
                                            {/* Fallback for other types or broken media */}
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
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {moment(msg.created_at).calendar()}
                            </Typography>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Paper>

            {/* Media Preview Area */}
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

            {/* Message Input Area */}
            <Box display="flex" alignItems="center" gap={1} p={2} borderTop="1px solid #eee" position="relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    multiple // Allow multiple file selection
                    accept="image/*,video/*" // Accept images and videos
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

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <Box
                        ref={emojiPickerRef}
                        sx={{
                            position: 'absolute',
                            bottom: 60, // Position above the input field
                            left: '50%', // Center horizontally
                            transform: 'translateX(-50%)', // Adjust for centering
                            zIndex: 999, // Ensure it's on top
                            boxShadow: 3, // Add some shadow
                            width: 'min(320px, 90vw)', // Ensure it fits on small screens
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

export default BusinessChatWindow;
