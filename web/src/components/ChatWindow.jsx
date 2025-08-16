import React, { useEffect, useRef, useState } from "react";
import { Box, Button, HStack, Text, VStack, Menu, For, IconButton, Portal, Skeleton } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { socket } from "../user/Socket";
import { BASE_URL, getToken } from "../config";
import { SmilePlus, ChartNoAxesGantt, MessageSquareReply, SquarePen, Trash2, EllipsisVertical, Ellipsis } from 'lucide-react'

import EmojiPicker from 'emoji-picker-react';
import './ChatWindow.css';
import MediaLightbox from "./MediaLightbox";

import { formatMessageTimeWithDay } from '../utils/formatMessageTime';

import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowForm from "./ChatWindowForm";
import { ro } from "date-fns/locale";

const ChatWindow = ({ recipient, currentUser, productId, productTitle, productImage, businessId }) => {
  const pickerRefs = useRef({});
  const inputPickerRef = useRef(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(null);
  const scrollRef = useRef(null);
  const roomId = productId
    ? [currentUser.id, recipient.userid, productId].sort().join("-")
    : [currentUser.id, recipient.userid].sort().join("-");

  const [mediaFiles, setMediaFiles] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const messageRefs = useRef({});
  const [editMessage, setEditMessage] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
const token = getToken();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  const openLightboxWith = (mediaArray) => {
    const slides = mediaArray.map((item) => {
      const src = item.media_url || item.src || "";
      const type =
        item.media_type === "video" ||
          src.endsWith(".mp4") ||
          src.includes("video")
          ? "video"
          : "image";

      return { src, type };
    });

    setLightboxSlides(slides);
    setLightboxOpen(true);
  };

  useEffect(() => {
    socket.on("userTyping", ({ userId, isTyping, roomId }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.includes(userId)) return [...prev, userId];
        } else {
          return prev.filter((id) => id !== userId);
        }
        return prev;
      });
      console.log("🔥 User typing event received:", { userId, isTyping, roomId });
    });

    return () => {
      socket.off("userTyping");
    };
  }, []);




  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInMessagePicker = Object.values(pickerRefs.current).some((ref) =>
        ref?.contains(event.target)
      );

      const clickedInInputPicker =
        inputPickerRef.current?.contains(event.target);

      // If clicked inside either picker, do nothing
      if (clickedInMessagePicker || clickedInInputPicker) return;

      // Otherwise, close all
      setReactionPickerOpen(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  useEffect(() => {
    if (!socket || !roomId) return;

    // Leave previous room (if any)
    if (socket.currentRoomId && socket.currentRoomId !== roomId) {
      socket.emit("leaveRoom", socket.currentRoomId);
    }

    // Join the new room
    socket.emit("joinRoom", roomId);
    socket.currentRoomId = roomId;

    // Fetch messages for the room
    const url = new URL(`${BASE_URL}/messages/${roomId}`);
    if (productId) {
      url.searchParams.append("productId", productId);
    }

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) =>
        setMessages(
          data.map((msg) => ({
            ...msg,
            from: String(msg.sender_id),
            reactions: msg.reactions || [],
            replyToMessageId: msg.replyTo?.message_id || null,
          }))
        )
      )
      .catch(console.error);

    // Attach socket listeners
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, { ...data, reactions: [] }]);
    });

    socket.on("messageReaction", (data) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.message_id === parseInt(data.messageId)
            ? {
              ...msg,
              reactions: [...msg.reactions, { userId: data.userId, emoji: data.emoji }],
            }
            : msg
        )
      );
    });

    socket.on("messageReactionRemoved", (data) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.message_id === parseInt(data.messageId)
            ? {
              ...msg,
              reactions: msg.reactions.filter(
                (r) => !(r.userId === data.userId && r.emoji === data.emoji)
              ),
            }
            : msg
        )
      );
    });

    socket.on("messageEdited", (editedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === editedMessage.message_id
            ? { ...msg, text: editedMessage.text, media: editedMessage.media }
            : msg
        )
      );
    });

    socket.on("messageDeleted", ({ message_id }) => {
      setMessages((prev) => prev.filter((msg) => msg.message_id !== message_id));
    });

    // Cleanup on unmount or room change
    return () => {
      socket.off("receiveMessage");
      socket.off("messageReaction");
      socket.off("messageReactionRemoved");
      socket.off("messageEdited");
      socket.off("messageDeleted");
    };
  }, [roomId, productId]); // ensure roomId is here



  // mark messages as read when the chat is opened
  useEffect(() => {

    if (!socket || !currentUser || !recipient) return;

    socket.emit("markMessagesAsRead", {

      userId: currentUser.id,     // ✅ Make sure this is correct
      roomId,  // ✅ Make sure this matches DB `room_id`

    });
  }, [socket, currentUser, recipient]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() && mediaFiles.length === 0) return;

    // Handle editing
    if (editMessage) {
      try {
        const formData = new FormData();
        formData.append("messageId", editMessage.message_id);
        formData.append("text", message);
        formData.append("roomId", roomId);

        if (productId) formData.append("productId", productId); // <-- Add this
        mediaFiles.forEach((file) => formData.append("media", file));

        const response = await fetch(`${BASE_URL}/messages/edit`, {
          method: "POST",
          body: formData,
           headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        });

        const result = await response.json();
        if (result.success) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === editMessage.message_id
                ? { ...msg, text: message, media: result.media || msg.media }
                : msg
            )
          );
          setEditMessage(null);
          setMessage("");
          setMediaFiles([]);
        } else {
          alert("Failed to edit message");
        }
      } catch (err) {
        console.error("Edit message failed", err);
      }
      return;
    }

    const now = new Date().toISOString();

    const newMsg = {
      from: currentUser.id,
      to: recipient.userid,
      text: message,
      roomId,
      created_at: now,
      replyToMessageId: replyTo?.message_id || null,

      ...(productId && { productId }), // <-- Add this

    };

    if (mediaFiles.length > 0) {
      const formData = new FormData();
      formData.append("from", currentUser.id);
      formData.append("to", recipient.userid);
      formData.append("roomId", roomId);
      formData.append("message", message);

      if (productId) formData.append("productId", productId); // <-- Add this
      formData.append("replyToMessageId", replyTo?.message_id || "");
      mediaFiles.forEach((file) => formData.append("media", file));

      try {
        const response = await fetch(`${BASE_URL}/messages/send`, {
          method: "POST",
          body: formData,
           headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        });
        const result = await response.json();
        if (result.success) {
          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              message_id: result.messageId,
              reactions: [],
              media: mediaFiles.map((file) => ({
                media_url: URL.createObjectURL(file),
                media_type: file.type.startsWith("video/") ? "video" : "image",
              })),
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to send message with media", err);
      }
    } else {
      socket.emit("sendMessage", newMsg); // already includes productId
    }

    // Reset form state
    setMessage("");
    setMediaFiles([]);
    setReplyTo(null);
  };



  const handleReaction = (messageId, emoji) => {
    const emojiChar = typeof emoji === "string" ? emoji : emoji.emoji;
    const message = messages.find((msg) => msg.message_id === messageId);
    const userReaction = message?.reactions?.find(
      (r) => r.userId === currentUser.id && r.emoji === emojiChar
    );

    if (userReaction) {
      socket.emit("removeReaction", {
        messageId,
        userId: currentUser.id,
        emoji: emojiChar,
        roomId,
      });
    } else {
      socket.emit("sendReaction", {
        messageId,
        userId: currentUser.id,
        emoji: emojiChar,
        roomId,
      });
    }

    setReactionPickerOpen(null);
  };


  //Handle message
  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/${messageId}?roomId=${roomId}`, {
        method: "DELETE",
         headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });


      const result = await response.json();
      if (result.success) {
        setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId));
      } else {
        alert(result.error || "Failed to delete message");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
    }
  };

  //Delete entire chat
  const handleDeleteChat = async (roomId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/chat/${roomId}/delete`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      const result = await res.json();

      if (result.success) {
        setConversations((prev) => prev.filter(conv => conv.room_id !== roomId));
      } else {
        alert(result.error || "Failed to delete chat");
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
      alert("Could not delete chat");
    }
  };



  return (
    <Box border="1px solid #ccc" rounded="md" p="4" h="750px" display="flex" flexDirection="column" className="ChatWindowHeight" >
      <div className="d-flex justify-content-between border rounded-pill align-items-center shadow-sm p">
        <ChatWindowHeader
          selectedUser={recipient}
          productId={productId}
          productTitle={productTitle}
          productImage={productImage}
        
        />

        {/* Chat window Menu trigger button */}
        <Menu.Root>
          <Menu.Trigger asChild>
            <EllipsisVertical />
          </Menu.Trigger>

          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="new-txt">Report</Menu.Item>
              <Menu.Item value="new-file">Block</Menu.Item>
              <Menu.Item value="new-win">
                <Button onClick={() => handleDeleteChat(roomId)} colorScheme="red" size="sm">
                  Delete Chat
                </Button>

              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>

        </Menu.Root>
      </div>





      <VStack
        ref={scrollRef}
        spacing="2"
        overflowY="auto"
        flex="1"
        px="2"
        align="stretch"
        maxHeight="calc(100% - 40px)"
      >
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              alignSelf: String(msg.from) === String(currentUser.id) ? "flex-end" : "flex-start",
              display: "flex"
            }}
          >
            <Box

              ref={(el) => {
                if (el) messageRefs.current[msg.message_id] = el;
              }}

              bg={String(msg.from) === String(currentUser.id) ? "blue.100" : "gray.100"}
              px="3"
              py="2"
              rounded="lg"
              width="400px"
              position="relative"
            >


              <div className='messageCard'>
                {msg.replyToMessageId && (() => {
                  const repliedMessage = messages.find(m => m.message_id === msg.replyToMessageId);
                  return (
                    <Box
                      fontSize="xs"
                      mb="1"
                      p="2"
                      bg="gray.200"
                      borderLeft="3px solid blue"
                      rounded="md"
                      maxW="full"
                      _hover={{ bg: "gray.300", cursor: "pointer" }}
                      onClick={() => {
                        const el = messageRefs.current[msg.replyToMessageId];
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.style.boxShadow = "0 0 0 2px #3182ce"; // Optional highlight
                          setTimeout(() => {
                            if (el) el.style.boxShadow = "none";
                          }, 1500);
                        }
                      }}
                    >
                      <Text isTruncated>
                        Replying to: {repliedMessage?.text || "Original message"}
                      </Text>

                      {repliedMessage?.media?.length > 0 && (
                        <Box mt="1" display="flex" gap="2" flexWrap="wrap">
                          {repliedMessage.media.map((media, idx) => (
                            <Box key={idx}>
                              {media.media_type === "image" ? (
                                <img
                                  src={media.media_url}
                                  alt="reply media"
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                  }}
                                />
                              ) : (
                                <video
                                  src={media.media_url}
                                  controls
                                  style={{
                                    width: "80px",
                                    height: "60px",
                                    borderRadius: "4px",
                                  }}
                                />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })()}

                <div className='messageTextheader'>


                  <span><Text
                    fontSize={/^\p{Emoji}+$/u.test(msg.text.trim()) ? "3xl" : "sm"}
                    mb="1"
                    lineHeight="1.2"
                    textAlign="center"
                  >
                    {msg.text}
                  </Text></span>
                  <span className='text-muted'>

                    <Menu.Root>



                      <Menu.Trigger asChild>
                        <HStack wrap="wrap" gap="8">
                          <For each={["ghost"]}>
                            {(variant) => (
                              <VStack key={variant}>
                                <IconButton
                                  aria-label="message menu"
                                  key={variant}
                                  variant={variant}
                                >
                                  <ChartNoAxesGantt size={16} color="#8a8a8a" />
                                </IconButton>

                              </VStack>
                            )}
                          </For>
                        </HStack>
                      </Menu.Trigger>

                      <Menu.Positioner >
                        <Menu.Content zIndex={1800}>
                          <Menu.Item
                            value="reply"
                            onClick={() => {
                              setReplyTo(msg);
                              setReactionPickerOpen(null);
                            }}
                          >
                            <MessageSquareReply size={16} color="#8a8a8a" /> Reply
                          </Menu.Item>

                          {String(msg.from) === String(currentUser.id) && (
                            <>
                              <Menu.Item
                                value="edit"
                                onClick={() => {
                                  setEditMessage(msg);
                                  setMessage(msg.text);
                                  setReactionPickerOpen(null);
                                }}
                              >
                                <SquarePen size={16} color="#8a8a8a" /> Edit
                              </Menu.Item>

                              <Menu.Item onClick={() => handleDeleteMessage(msg.message_id)}>

                                <Trash2 size={16} color="#8a8a8a" /> Delete
                              </Menu.Item>

                            </>
                          )}
                        </Menu.Content>


                      </Menu.Positioner>

                    </Menu.Root></span>
                </div>
                {msg.media && msg.media.length > 0 && (
                  <Box mt="2" display="flex" gap="2" flexWrap="wrap">
                    {msg.media.map((media, idx) => (
                      <Box key={idx}>
                        {media.media_type === "image" ? (
                          <img
                            src={media.media_url}
                            alt="media"
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              openLightboxWith(
                                msg.media.map((m) => ({
                                  src: m.media_url,
                                  type: m.media_type === "video" ? "video" : "image",
                                }))
                              )
                            }
                          />
                        ) : (
                          <video
                            src={media.media_url}
                            controls
                            style={{
                              width: "160px",
                              height: "120px",
                              borderRadius: "8px",
                            }}
                            onClick={() =>
                              openLightboxWith(
                                msg.media.map((m) => ({
                                  src: m.media_url,
                                  type: m.media_type === "video" ? "video" : "image",
                                }))
                              )
                            }
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}

                <div className='Messagefooter'>
                  <div>



                    {/* Reaction Picker trigger */}
                    {!msg.reactions.some((r) => r.userId === currentUser.id) && (
                      <Box position="relative" display="inline-block">
                        <div
                          style={{ cursor: "pointer", fontSize: "1.5em" }}
                          onClick={() => {
                            const isOpen = reactionPickerOpen === msg.message_id;
                            setReactionPickerOpen(isOpen ? null : msg.message_id);
                          }}
                        >
                          <SmilePlus size={18} color="#8a8a8a" />

                        </div>

                        {reactionPickerOpen === msg.message_id && (
                          <Box
                            className={`emoji-picker-container ${String(msg.from) === String(currentUser.id)
                              ? "emoji-align-right"
                              : "emoji-align-left"
                              }`}
                            ref={(el) => (pickerRefs.current[msg.message_id] = el)}
                          >
                            <EmojiPicker reactionsDefaultOpen={true}
                              onEmojiClick={(emojiData) => {
                                handleReaction(msg.message_id, emojiData.emoji);
                                setReactionPickerOpen(null);
                              }}
                              height={300}
                              width={200}
                            />
                          </Box>

                        )}

                      </Box>

                    )}

                    {/* Show all reactions */}
                    <Box mt="1" display="flex" gap="0.5rem" flexWrap="wrap">
                      {msg.reactions.map((reaction, idx) => (
                        <Box
                          key={idx}
                          title={`User ${reaction.userId}`}
                          onClick={() =>
                            reaction.userId === currentUser.id &&
                            handleReaction(msg.message_id, reaction.emoji)
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: reaction.userId === currentUser.id ? "#D1FAE5" : "#E5E7EB", // light green or gray
                            padding: "4px",
                            borderRadius: "8px",
                            cursor: reaction.userId === currentUser.id ? "pointer" : "default",
                            opacity: reaction.userId === currentUser.id ? 1 : 0.7,
                          }}
                        >
                          <span style={{ fontSize: "1.5rem" }}>{reaction.emoji}</span>

                        </Box>
                      ))}
                    </Box>



                  </div>
                  <div className="text-muted MessageTime">
                    {formatMessageTimeWithDay(msg.created_at)}
                  </div>
                </div>


              </div>
            </Box>


          </motion.div>



        ))}




      </VStack>


      {replyTo && (
        <Box
          bg="gray.100"
          p="2"
          rounded="md"
          mb="2"
          borderLeft="4px solid blue"
          maxW="full"
        >
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                Replying to {replyTo.from === currentUser.id ? "yourself" : recipient.firstname}:
              </Text>
              {replyTo.text?.trim() ? (
                <Text fontSize="sm" noOfLines={1} maxW="300px">
                  {replyTo.text}
                </Text>
              ) : replyTo.media?.length > 0 ? (
                <Box mt="1">
                  {replyTo.media[0].media_type === "image" ? (
                    <img
                      src={replyTo.media[0].media_url}
                      alt="media"
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  ) : (
                    <video
                      src={replyTo.media[0].media_url}
                      style={{ width: "100px", height: "80px", borderRadius: "6px" }}
                      muted
                      controls
                    />
                  )}
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  [No preview available]
                </Text>
              )}
            </Box>
            <Button size="xs" variant="ghost" onClick={() => setReplyTo(null)}>
              ✕
            </Button>
          </HStack>
        </Box>
      )}



      {typingUsers.length > 0 && (
        <Box h="40px" px="3" py="1" color="gray.500" fontSize="sm" display="flex" alignItems="center">
          <Text fontSize="sm" color="gray.500" ml="2" display="flex" alignItems="center">
            {typingUsers.length === 1 ? (
              <>
                <div class="ticontainer">
                  <div class="tiblock">
                    <div class="tidot"></div>
                    <div class="tidot"></div>
                    <div class="tidot"></div>
                  </div>
                </div>
              </>
            ) : (
              `${typingUsers.length} users are typing...`
            )}
          </Text>


        </Box>
      )}

      <ChatWindowForm
        handleSend={handleSend}
        setMessage={setMessage}
        message={message}
        mediaFiles={mediaFiles}
        setMediaFiles={setMediaFiles}
        pickerRefs={pickerRefs}
        inputPickerRef={inputPickerRef}
        reactionPickerOpen={reactionPickerOpen}
        setReactionPickerOpen={setReactionPickerOpen}
        currentUser={currentUser}
        roomId={roomId}
      />
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={lightboxSlides}
      />

    </Box>
  );
};

export default ChatWindow;
