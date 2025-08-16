// src/components/BusinessMessageList.jsx
"use client";

import { Tabs } from "@chakra-ui/react";
import { LuFolder, LuSquareCheck, LuUser } from "react-icons/lu";
import {
    Button,
    CloseButton,
    Drawer,
    HStack,
    Portal, Stack, List, Avatar, Text, Box, Spinner, Badge // Import Badge
} from "@chakra-ui/react";


import { useRef, useState, useEffect } from "react";
import BusinessChatWindow from "./BusinessChatWindow";
import ProductMessageChatWindow from "./ProductMessageChatWindow";
import { BASE_URL, getToken } from "../config";
import { socket } from '../user/Socket'; // Ensure this socket instance is correctly initialized for the business user.

const BusinessMessageList = ({ businessId, currentUser }) => {
    const triggerRef = useRef(null);
    const [allConversations, setAllConversations] = useState([]);
    const [dmConversations, setDmConversations] = useState([]);
    const [productConversations, setProductConversations] = useState([]);

    const [selectedConversation, setSelectedConversation] = useState(null);
    const selectedConversationRef = useRef(null); // Ref for immediate access to selectedConversation
    const [selectedProductDetails, setSelectedProductDetails] = useState(null);
    const [selectedBusinessDetails, setSelectedBusinessDetails] = useState(null);
const token = getToken(); // Get the token for authentication
    // Update ref whenever selectedConversation changes
    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    // Ref for the fetch conversations function to be accessible inside useEffect hooks
    const fetchConversationsRef = useRef(null);

    useEffect(() => {
        const fetchConversations = async () => {
            console.log("Fetching conversations for businessId:", businessId);
            try {
                const res = await fetch(`${BASE_URL}/api/businesses/${businessId}/conversations`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch conversations: ${res.statusText}`);
                }
                const data = await res.json();
                console.log("Fetched conversations data:", data);

                setAllConversations(data.allConversations || []);
                setDmConversations(data.dmConversations || []);
                setProductConversations(data.productConversations || []);

            } catch (err) {
                console.error("Failed to fetch conversations:", err);
            }
        };

        fetchConversationsRef.current = fetchConversations; // Assign to ref

        if (businessId && currentUser?.id) {
            fetchConversationsRef.current(); // Initial fetch
            // Business needs to join its own notification room, using its businessId as the identifier
            // as per the backend's generalized notification logic
            socket.emit('join_room', `business_notifications:${businessId}`); // Use businessId here
            console.log(`Business joined notification room: business_notifications:${businessId}`);
        }

        return () => {
            if (businessId) {
                socket.emit('leave_room', `business_notifications:${businessId}`);
                console.log(`Business left notification room: business_notifications:${businessId}`);
            }
        };

    }, [businessId, currentUser]);


    // Listener for new unread messages (from users to this business)
    useEffect(() => {
        if (!socket) return;

        const handleNewUnreadMessage = (payload) => {
            // This event comes from the backend when a message is sent TO the current user (which is a business here)
            const { roomId, productId, lastMessageTime, preview } = payload; // Destructure all relevant parts

            console.log('BusinessMessageList: RECEIVED new_unread_business_message payload:', payload);

            const updateList = (prevList) => {
                let conversationFound = false;
                const updatedList = prevList.map(conv => {
                    if (conv.room_id === roomId) {
                        conversationFound = true;
                        // Only increment if the chat window for this conversation is NOT currently open
                        const isActive = selectedConversationRef.current?.room_id === roomId;
                        console.log(`BusinessMessageList: Matched room ${roomId}. Active: ${isActive}. Current unread: ${conv.unread_count}`);
                        return {
                            ...conv,
                            unread_count: isActive ? 0 : (conv.unread_count || 0) + 1,
                            last_message_time: lastMessageTime,
                            last_message_preview: preview // Update preview as well
                        };
                    }
                    return conv;
                });

                if (!conversationFound) {
                    console.warn(`BusinessMessageList: New unread notification for unknown room: ${roomId}. Triggering full conversation refetch.`);
                    // If a conversation isn't found, it might be a new one. Re-fetch all.
                    if (fetchConversationsRef.current) {
                        fetchConversationsRef.current();
                    }
                }
                return updatedList;
            };

            // Apply update to the relevant conversation state based on `productId`
            if (productId) {
                setProductConversations(updateList);
                console.log(`BusinessMessageList: Updated productConversations for room: ${roomId}`);
            } else {
                setDmConversations(updateList);
                console.log(`BusinessMessageList: Updated dmConversations for room: ${roomId}`);
            }
            // Also update allConversations to ensure the 'All' tab is correct
            setAllConversations(prev => {
                const updated = updateList(prev);
                if (!prev.find(c => c.room_id === roomId)) {
                    // If it was a new conversation, re-fetch to get its full details for 'All'
                    if (fetchConversationsRef.current) {
                         fetchConversationsRef.current();
                    }
                }
                return updated;
            });
        };

        socket.on("new_unread_business_message", handleNewUnreadMessage);

        return () => {
            console.log('BusinessMessageList: Cleaning up new_unread_business_message listener.');
            socket.off("new_unread_business_message", handleNewUnreadMessage);
        };
    }, [socket]); // No need for selectedConversation here, as it uses selectedConversationRef.current inside

    // Handle real-time message updates (receive_message)
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            console.log('BusinessMessageList: RECEIVED receive_message payload:', message);

            const updateLastMessageDetails = (prevList) =>
                prevList.map(conv =>
                    conv.room_id === message.room_id
                        ? {
                            ...conv,
                            last_message_time: message.created_at,
                            last_message_preview: message.text // Update preview
                        }
                        : conv
                );

            setAllConversations(updateLastMessageDetails);
            setDmConversations(updateLastMessageDetails);
            setProductConversations(updateLastMessageDetails);
        };

        socket.on("receive_message", handleReceiveMessage);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
        };
    }, [socket]);


    // Mark messages as read when a conversation is selected
    useEffect(() => {
        if (!selectedConversation || !currentUser?.id || !socket) return;

        console.log(`BusinessMessageList: Marking messages in room ${selectedConversation.room_id} as read for business ${businessId}`);
        socket.emit('mark_message_read', {
            room_id: selectedConversation.room_id,
            recipient_id: businessId, // The recipient is the business itself
            recipient_type: 'business' // Explicitly state recipient type for backend clarity
        });

        // Optimistically reset unread count in state
        const resetUnread = (prevList) =>
            prevList.map(conv =>
                conv.room_id === selectedConversation.room_id
                    ? { ...conv, unread_count: 0 }
                    : conv
            );

        setAllConversations(resetUnread);
        setDmConversations(resetUnread);
        setProductConversations(resetUnread);

    }, [selectedConversation, businessId, currentUser, socket]); // Depend on businessId and currentUser for socket emit


    // --- START OF MODIFIED useEffect BLOCK ---
    useEffect(() => {
        console.log("Product/Business Details useEffect triggered.");
        console.log("Current selectedConversation:", selectedConversation);

        if (!selectedConversation) {
            setSelectedProductDetails(null);
            setSelectedBusinessDetails(null);
            console.log("No conversation selected, resetting details.");
            return;
        }

        if (selectedConversation.conversation_type === 'product') {
            const fetchDetails = async () => {
                console.log("Selected conversation type is 'product'. Attempting to fetch details.");
                console.log("Product ID from selectedConversation:", selectedConversation.product_id);

                if (!selectedConversation.product_id) {
                    console.error("Error: selectedConversation.product_id is missing or null for product chat!");
                    setSelectedProductDetails(null);
                    setSelectedBusinessDetails(null);
                    return;
                }

                try {
                    const productRes = await fetch(`${BASE_URL}/api/products/${selectedConversation.product_id}`, {
                        headers: {
                            Authorization: `Bearer ${getToken()}`
                        }
                    });
                    if (!productRes.ok) {
                        const errorText = await productRes.text();
                        throw new Error(`Failed to fetch product (status: ${productRes.status}): ${errorText}`);
                    }
                    const productData = await productRes.json();
                    console.log("API Response - Fetched Product Data (raw):", productData);

                    if (productData && productData.product && productData.product.product_id) {
                        setSelectedProductDetails(productData.product);
                        console.log("Set selectedProductDetails to:", productData.product);
                    } else {
                        console.error("API did not return expected 'product' object or 'product_id'. Full response:", productData);
                        setSelectedProductDetails(null);
                    }

                    // Fetch business details (assuming businessId prop is sufficient)
                    // This is the current business's details
                    const businessRes = await fetch(`${BASE_URL}/api/businesses/${businessId}`, {headers: { Authorization: `Bearer ${getToken()}` }});
                    if (!businessRes.ok) {
                        const errorText = await businessRes.text();
                        throw new Error(`Failed to fetch business (status: ${businessRes.status}): ${errorText}`);
                    }
                    const businessData = await businessRes.json(); // This should return the business object directly
                    console.log("Fetched Business Data (raw):", businessData);
                    if (businessData && businessData.id) { // Assuming business data has an 'id'
                        setSelectedBusinessDetails(businessData);
                        console.log("Set selectedBusinessDetails to:", businessData);
                    } else {
                         console.error("API did not return expected business object or 'id'. Full response:", businessData);
                         setSelectedBusinessDetails(null);
                    }


                } catch (error) {
                    console.error("Error during product/business details fetch:", error);
                    setSelectedProductDetails(null);
                    setSelectedBusinessDetails(null);
                }
            };

            fetchDetails();
        } else {
            setSelectedProductDetails(null);
            setSelectedBusinessDetails(null);
            console.log("Conversation type is not 'product', resetting product/business details.");
        }
    }, [selectedConversation, businessId]);
    // --- END OF MODIFIED useEffect BLOCK ---


    const handleSelectConversation = (conversation) => {
        console.log("Conversation selected:", conversation);
        setSelectedConversation(conversation);
    };

    const handleBackToList = () => {
        setSelectedConversation(null);
    };

    const renderConversationList = (conversations) => {
        if (conversations.length === 0) {
            return (
                <Text textAlign="center" mt={4} color="gray.500">
                    No conversations yet.
                </Text>
            );
        }

        return (
            <List.Root spacing={2}>
                {conversations.map((conv) => (
                    <List.Item
                        key={conv.room_id}
                        p={2}
                        borderRadius="md"
                        bg={selectedConversation?.room_id === conv.room_id ? "blue.100" : "transparent"}
                        _hover={{ bg: "gray.50" }}
                        cursor="pointer"
                        onClick={() => handleSelectConversation(conv)}
                        display="flex"
                        alignItems="center"
                        gap={3}
                    >
                        <HStack gap="4" flex="1">
                            <Avatar.Root>
                                <Avatar.Fallback name={conv.user.name} />
                                <Avatar.Image src={conv.user.profile_picture} />
                            </Avatar.Root>
                            <Stack gap="0" flex="1">
                                <Text fontWeight="medium" isTruncated>
                                    {conv.user.name} @{conv.user.username}
                                </Text>
                                <Text fontSize="sm" color="gray.600" isTruncated>
                                    {conv.conversation_type === 'product'
                                        ? `Product Chat: ${conv.last_message_preview || 'No messages yet'}`
                                        : `DM: ${conv.last_message_preview || 'No messages yet'}`}
                                </Text>
                            </Stack>
                            {/* Display unread count badge */}
                            {conv.unread_count > 0 && (
                                <Badge colorPalette="red" borderRadius="full" px="2">
                                    {conv.unread_count}
                                </Badge>
                            )}
                        </HStack>
                    </List.Item>
                ))}
            </List.Root>
        );
    };


    return (
        <Drawer.Root >
            <Drawer.Trigger asChild>
                <Button variant="outline" size="sm" ref={triggerRef}>
                    Messages
                </Button>
            </Drawer.Trigger>

            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content maxWidth="100%" height="100vh">
                        <Drawer.Context>
                            {(store) => (
                                <>
                                    <Drawer.Body p="0" h="100%" display="flex" flexDirection="column">
                                        {selectedConversation ? (
                                            selectedConversation.conversation_type === 'dm' ? (
                                                <BusinessChatWindow
                                                    currentUser={{ id: currentUser.id, type: 'business' }}
                                                    recipient={selectedConversation.user}
                                                    businessId={businessId}
                                                    onBack={handleBackToList}
                                                />
                                            ) : ( // Must be 'product' type
                                                selectedProductDetails && selectedBusinessDetails ? (
                                                    <ProductMessageChatWindow
                                                        currentUser={{ id: currentUser.id, type: 'business' }} // Current business user
                                                        currentUserType="business"
                                                        business={selectedBusinessDetails} // The business details for the current business
                                                        product={selectedProductDetails} // The product details for the current product chat
                                                        recipientUser={selectedConversation.user} // The user from the selected conversation
                                                        onBack={handleBackToList}
                                                    />
                                                ) : (
                                                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                                        <Spinner size="sm" />
                                                        <Text ml={2}>Loading product details...</Text>
                                                    </Box>
                                                )
                                            )
                                        ) : (
                                            <>
                                                <Drawer.Header borderBottomWidth="1px">
                                                    <Drawer.Title>Conversations</Drawer.Title>
                                                </Drawer.Header>


                                                <Tabs.Root defaultValue="All" variant="plain">
                                                    <Tabs.List bg="bg.muted" rounded="l3" p="1">
                                                        <Tabs.Trigger value="All">
                                                            <LuUser />
                                                            All
                                                        </Tabs.Trigger>
                                                        <Tabs.Trigger value="DM">
                                                            <LuFolder />
                                                            Direct Messages
                                                        </Tabs.Trigger>
                                                        <Tabs.Trigger value="product chats">
                                                            <LuSquareCheck />
                                                            Product Chats
                                                        </Tabs.Trigger>
                                                        <Tabs.Indicator rounded="l2" />
                                                    </Tabs.List>
                                                    <Tabs.Content value="All"> {renderConversationList(allConversations)}</Tabs.Content>
                                                    <Tabs.Content value="DM"> {renderConversationList(dmConversations)}</Tabs.Content>
                                                    <Tabs.Content value="product chats"> {renderConversationList(productConversations)}</Tabs.Content>
                                                </Tabs.Root>
                                            </>
                                        )}
                                    </Drawer.Body>

                                    <Drawer.CloseTrigger asChild>
                                        <CloseButton
                                            size="sm"
                                            position="absolute"
                                            top="10px"
                                            right="10px"
                                            onClick={() => {
                                                store.setOpen(false);
                                                handleBackToList(); // Reset selected user/conversation when closing the drawer
                                            }}
                                        />
                                    </Drawer.CloseTrigger>
                                </>
                            )}
                        </Drawer.Context>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    )
}

export default BusinessMessageList;