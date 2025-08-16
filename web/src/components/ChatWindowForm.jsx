import React, { useState, useRef, useEffect } from "react";
import { HStack, Input, Button, Box } from "@chakra-ui/react";
import { FaPaperclip, FaSmile } from "react-icons/fa";
import EmojiPicker from 'emoji-picker-react';
import { socket } from "../user/Socket";

const ChatWindowForm = ({
    handleSend,
    setMessage,
    message,
    mediaFiles,
    setMediaFiles,
    pickerRefs,
    inputPickerRef,
    reactionPickerOpen,
    setReactionPickerOpen,
   
  roomId,
  currentUser,
}) => {

const typingTimeoutRef = useRef(null);
const [isTyping, setIsTyping] = useState(false);

const handleInputChange = (e) => {
  const newText = e.target.value;
  setMessage(newText);

  if (!isTyping) {
    setIsTyping(true);
    socket.emit("typing", { roomId, userId: currentUser.id, isTyping: true });
  }

  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

  typingTimeoutRef.current = setTimeout(() => {
    setIsTyping(false);
    socket.emit("typing", { roomId, userId: currentUser.id, isTyping: false});
    console.log("User typing in roomid", roomId);
  }, 1500);
};




    return (
        <>
            <HStack mt="3" spacing="2" align="start" mb="5">
                {/* Emoji Picker Toggle */}
                <Box position="relative">
                    <Button onClick={() => setReactionPickerOpen("input")} variant="ghost" p="2">
                        <FaSmile />
                    </Button>

                    {reactionPickerOpen === "input" && (
                        <Box
                            position="absolute"
                            bottom="100%"
                            left="0"
                            mb="2"
                            zIndex="1000"
                            ref={inputPickerRef}
                        >
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setMessage((prev) => prev + emojiData.emoji);
                                    setReactionPickerOpen(null);
                                }}
                                height={350}
                                width={300}
                            />
                        </Box>
                    )}

                </Box>



                {/* File Upload Button */}
                <Input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    display="none"
                    id="file-upload"
                    onChange={(e) => {
                        const selected = Array.from(e.target.files);
                        const validMedia = selected.filter(
                            (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
                        );
                        setMediaFiles((prev) => [...prev, ...validMedia]);
                    }}
                />
                <label htmlFor="file-upload">
                    <Button as="span" variant="ghost" p="2">
                        <FaPaperclip />
                    </Button>
                </label>

                {/* Message Input */}
               <Input
  placeholder="Type a message..."
  value={message}
  onChange={handleInputChange}  // <-- update this
  onKeyDown={(e) => e.key === "Enter" && handleSend()}
  flex="1"
/>


                <Button onClick={handleSend} isDisabled={!message.trim() && mediaFiles.length === 0}>
                    Send
                </Button>
            </HStack>

            {/* Media Preview Section */}
            {mediaFiles.length > 0 && (
                <HStack mt="2" spacing="2" flexWrap="wrap">
                    {mediaFiles.map((file, index) => {
                        const url = URL.createObjectURL(file);
                        const isImage = file.type.startsWith("image/");
                        return (
                            <Box key={index} position="relative">
                                {isImage ? (
                                    <img
                                        src={url}
                                        alt="preview"
                                        style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }}
                                    />
                                ) : (
                                    <video
                                        src={url}
                                        style={{ width: "80px", height: "80px", borderRadius: "8px" }}
                                        muted
                                        loop
                                        autoPlay
                                    />
                                )}
                                <Button
                                    size="xs"
                                    colorScheme="red"
                                    position="absolute"
                                    top="-8px"
                                    right="-8px"
                                    rounded="full"
                                    onClick={() => {
                                        setMediaFiles((prev) => prev.filter((_, i) => i !== index));
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    ✕
                                </Button>
                            </Box>
                        );
                    })}
                </HStack>
            )}
        </>
    );

};
export default ChatWindowForm;