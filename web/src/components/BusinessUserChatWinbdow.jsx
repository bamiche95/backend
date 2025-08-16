// src/components/BusinessUserChatWindow.jsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../user/Socket';
import { BASE_URL, getToken } from "../config";
import {
    Box, TextField, Button, Typography, Paper, IconButton, CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import moment from 'moment';
import { getChatRoomId } from '@/utils/ChatUtils';

import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import EmojiPicker from 'emoji-picker-react';
import { ClickAwayListener } from '@mui/material';

const uploadFileAndGetUrl = async (file) => {
    const formData = new FormData();
    formData.append('mediaFile', file);

    try {
        const response = await fetch(`${BASE_URL}/api/upload/message-media`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${getToken()}`,
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


// Changed recipientUserId to be optional, as businessId is now key
const BusinessUserChatWindow = ({ currentUser, recipientUserId, businessId, business }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [attachedMedia, setAttachedMedia] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    // Derive the room ID using currentUser.id (user) and businessId (business)
    // The order in getChatRoomId should be consistent, ideally sorted by type then ID
    // Example: getChatRoomId(currentUser.id, 'user', businessId, 'business')
    // Or if you prefer business always first for room ID generation:
    const roomId = getChatRoomId(currentUser.id, 'user', businessId, 'business');


    const handleEmojiClick = (emojiData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };

    const handleClickAway = useCallback(() => {
        setShowEmojiPicker(false);
    }, []);

    useEffect(() => {
        if (!roomId || !currentUser || !businessId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            setLoading(true);
            try {
                // Adjust API endpoint if necessary, assuming it now fetches based on room_id
                const res = await fetch(`${BASE_URL}/api/businessmessages/${roomId}`, {
                    credentials: 'include',
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
    }, [roomId, currentUser?.id, businessId]); // Added businessId to dependencies

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        if (newMessage.trim() === '' && attachedMedia.length === 0) return;

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

        const messagePayload = {
            room_id: roomId,
            sender_id: currentUser.id,
            // recipient_id should be the businessId now, not recipientUserId
            recipient_id: businessId,
            text: newMessage.trim(),
            created_at: new Date().toISOString(),
            sender_type: 'user',
            recipient_type: 'business', // Explicitly set recipient_type to 'business'
            business_id: businessId, // Ensure business_id is passed
            media: uploadedMediaDetails,
        };

        socket.emit('send_message', messagePayload);
        setNewMessage('');
        setAttachedMedia([]);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Box>
        );
    }

    if (!currentUser || !businessId) {
        return <Typography>Cannot load chat. Missing user or business information.</Typography>;
    }

    return (
        <Box display="flex" flexDirection="column" height="100%" sx={{ border: '1px solid #ccc', borderRadius: '8px' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #eee', backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6">Chat with {business?.name || 'Business'}</Typography>
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
                    borderRadius: '0 0 8px 8px',
                }}
            >
                {messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        No messages yet. Start the conversation!
                    </Typography>
                ) : (
                    messages.map((msg, index) => (
                        <Box
                            key={index}
                            sx={{
                                alignSelf: msg.sender_type === 'user' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.sender_type === 'user' ? '#dcf8c6' : '#ffffff',
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
                                            {mediaItem.type === 'other' && (
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
                        <ClickAwayListener onClickAway={handleClickAway}> {/* Use the memoized handleClickAway */}
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

export default BusinessUserChatWindow;