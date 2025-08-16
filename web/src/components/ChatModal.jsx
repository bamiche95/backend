"use client";

import {
    Button,
    CloseButton,
    Drawer,
    Portal,
} from "@chakra-ui/react";
import { useRef, useState, useEffect } from "react";
import ChatWindow from "./ChatWindow";
import { io } from 'socket.io-client';
import { BASE_URL, getToken } from "../config";

// recipient will now be the full object with all user or business details, including 'type'
const ChatModal = ({ recipient, currentUser }) => {
    const triggerRef = useRef(null);
    const [socket, setSocket] = useState(null);

    // Initialize socket when the modal opens
    useEffect(() => {
        let newSocket;
        if (recipient && currentUser && currentUser.id) { // Ensure currentUser.id exists
            newSocket = io(BASE_URL, {
                withCredentials: true,
                query: { userId: currentUser.id.toString(), userType: currentUser.type }, // Pass userType to socket connection
            });
            setSocket(newSocket);
            newSocket.emit("joinRoom", currentUser.id.toString()); // Join user's own room

            return () => {
                console.log("Disconnecting socket from ChatModal");
                newSocket.disconnect();
            };
        }
        // Cleanup socket when component unmounts or recipient/currentUser change to null
        return () => {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        };
    }, [recipient, currentUser]); // Re-run when recipient or currentUser changes

    return (
        <Drawer.Root>
            <Drawer.Trigger asChild>
                <Button variant="outline" size="sm" ref={triggerRef}>
                    Message {recipient?.username || recipient?.name || 'User'} {/* Display username or business name */}
                </Button>
            </Drawer.Trigger>

            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content maxWidth="100%" width="500px">
                        <Drawer.Context>
                            {(store) => (
                                <>
                                    <Drawer.Body p="0" h="100%">
                                        {socket && recipient && currentUser ? (
                                            <ChatWindow
                                                socket={socket}
                                                recipient={recipient} // This now includes type: 'user' or 'business'
                                                currentUser={currentUser} // This now includes type: 'user' or 'business'
                                                productId={recipient.product_id}
                                                productImage={recipient.product_image}
                                                productTitle={recipient.product_title}
                                            />
                                        ) : (
                                            <div>Loading chat...</div>
                                        )}
                                    </Drawer.Body>

                                    <Drawer.CloseTrigger asChild>
                                        <CloseButton
                                            size="sm"
                                            position="absolute"
                                            top="10px"
                                            right="10px"
                                            onClick={() => store.setOpen(false)}
                                        />
                                    </Drawer.CloseTrigger>
                                </>
                            )}
                        </Drawer.Context>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    );
};

export default ChatModal;