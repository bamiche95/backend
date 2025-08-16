import React, { useState, useEffect, useRef } from "react";
import ChatList from "../components/ChatList";
import DirectMessage from "../components/DirectMessage";
import MarketplaceMessages from "../components/MarketplaceMessages";
import ChatWindow from "../components/ChatWindow";
import { BASE_URL, getToken } from "../config";
import { Tabs } from "@chakra-ui/react";
import { LuFolder, LuSquareCheck, LuUser } from "react-icons/lu";
import '../components/ChatWindow.css';
import { io } from "socket.io-client";
import BusinessUserChatWindow from "../components/BusinessUserChatWinbdow";
import ProductMessageChatWindow from "../components/ProductMessageChatWindow";

const InboxPage = () => {
    const [conversations, setConversations] = useState([]);
    const [directConversations, setDirectConversations] = useState([]);
    const [businessConversations, setBusinessConversations] = useState([]);
    const [businessSalesConversations, setBusinessSalesConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const selectedUserRef = useRef(null);
const [activeTab, setActiveTab] = useState("AllChats");
const token = getToken(); // Get the token for authentication
    // Keep selectedUser ref updated - good
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // Function to fetch all conversation lists
    const fetchAllConversations = useRef(() => {}); // Using useRef to memoize the function


    
    useEffect(() => {
        if (!currentUser) return;

        // Define the fetching logic once
        const fetchFunc = async () => {
            try {
                const [
                    convRes,
                    directConvRes,
                    businessConvRes,
                    businessSalesConvRes
                ] = await Promise.all([
                    fetch(`${BASE_URL}/api/messages/conversations`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch(`${BASE_URL}/api/messages/conversations/direct`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch(`${BASE_URL}/api/messages/business-conversations`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch(`${BASE_URL}/api/messages/product-conversations`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }),
                ]);

                const [
                    convData,
                    directConvData,
                    businessConvData,
                    businessSalesConvData
                ] = await Promise.all([
                    convRes.json(),
                    directConvRes.json(),
                    businessConvRes.json(),
                    businessSalesConvRes.json()
                ]);

                setConversations(convData);
                setDirectConversations(directConvData);
                setBusinessConversations(businessConvData);
                setBusinessSalesConversations(businessSalesConvData);

                console.log("Fetched all conversations.");

            } catch (error) {
                console.error("Error fetching conversations:", error);
            }
        };
        fetchAllConversations.current = fetchFunc; // Assign to ref

        // Initial fetch
        fetchAllConversations.current();

    }, [currentUser]); // Re-run when currentUser changes

    // Fetch current user and initialize socket
    useEffect(() => {
        let newSocket;

        fetch(`${BASE_URL}/api/user/profile`, {
            headers: {
                authorization: `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(user => {
                setCurrentUser(user);
                console.log('Frontend current user:', user); // DEBUG: Confirm user object

                newSocket = io(BASE_URL, {
                    withCredentials: true,
                    query: { userId: user.userid.toString() },
                });

                setSocket(newSocket);

                // Join the user's general room
                newSocket.emit("join_room", user.userid.toString());
                console.log(`Frontend: Joined user room: ${user.userid}`);

                // All users (regular and business) should join their notification room
                // to receive new_unread_business_message if they are the recipient of a message from a business.
                const userNotificationRoom = `business_notifications:${user.userid}`; // Use user.userid
                newSocket.emit("join_room", userNotificationRoom);
                console.log(`Frontend: User ${user.userid} (is_business: ${user.is_business}) attempting to join notification room: ${userNotificationRoom}`);


                return () => {
                    console.log('Frontend: Disconnecting socket.');
                    newSocket.disconnect();
                };
            })
            .catch(console.error);
    }, []);


      useEffect(() => {
    if (!socket) return;

    const handler = ({ roomId, lastMessageTime }) => {
          console.log("newUnreadMessage received:", roomId, lastMessageTime);

      // Update general conversations
      setConversations(prev =>
        prev.map(conv => {
          if (conv.room_id === roomId) {
            if (roomId !== selectedUserRef.current?.room_id) {
              return {
                ...conv,
                unread_count: (conv.unread_count || 0) + 1,
                last_message_time: lastMessageTime,
              };
            } else {
              return {
                ...conv,
                last_message_time: lastMessageTime,
              };
            }
          }
          return conv;
        })
      );

      // Update direct conversations
      setDirectConversations(prev =>
        prev.map(conv => {
          if (conv.room_id === roomId) {
            if (roomId !== selectedUserRef.current?.room_id) {
              return {
                ...conv,
                unread_count: (conv.unread_count || 0) + 1,
                last_message_time: lastMessageTime,
              };
            } else {
              return {
                ...conv,
                last_message_time: lastMessageTime,
              };
            }
          }
          return conv;
        })
      );

      // Update business conversations
      setBusinessConversations(prev =>
        prev.map(conv => {
          if (conv.room_id === roomId) {
            if (roomId !== selectedUserRef.current?.room_id) {
              return {
                ...conv,
                unread_count: (conv.unread_count || 0) + 1,
                last_message_time: lastMessageTime,
              };
            } else {
              return {
                ...conv,
                last_message_time: lastMessageTime,
              };
            }
          }
          return conv;
        })
      );
    };

    socket.on("newUnreadMessage", handler);

    return () => {
      socket.off("newUnreadMessage", handler);
    };
  }, [socket]);
    // Listener for new_unread_business_message
    useEffect(() => {
        if (!socket) return;

        const handleNewUnreadMessage = (payload) => {
            const { roomId, productId, lastMessageTime } = payload; // lastMessageTime is directly from backend

           

            const updateList = (prevList) => {
                let conversationFound = false;
                const updatedList = prevList.map(conv => {
                    console.log(`Frontend: Checking conversation room_id: ${conv.room_id} against incoming roomId: ${roomId}`);
                    if (conv.room_id === roomId) {
                        conversationFound = true;
                        const isActive = selectedUserRef.current?.room_id === roomId;
                        console.log(`Frontend: Match found for ${roomId}. Active: ${isActive}. Current unread: ${conv.unread_count}`);
                        return {
                            ...conv,
                            // Increment unread_count only if the chat window for this conversation is NOT currently open
                            unread_count: isActive ? 0 : (conv.unread_count || 0) + 1,
                            last_message_time: lastMessageTime,
                        };
                    }
                    return conv;
                });

                if (!conversationFound) {
                    console.warn(`Frontend: New unread notification for unknown room: ${roomId}. Triggering full conversation refetch.`);
                    // If a conversation isn't found, it might be a new one not yet in state.
                    // Re-fetch all conversations to ensure the UI is up-to-date.
                    if (fetchAllConversations.current) {
                        fetchAllConversations.current();
                    }
                }
                return updatedList;
            };

            // Apply update to the relevant conversation state based on `productId`
            if (productId) {
                setBusinessSalesConversations(updateList);
                console.log(`Frontend: Updated businessSalesConversations for room: ${roomId}`);
            } else {
                setBusinessConversations(updateList);
                console.log(`Frontend: Updated businessConversations for room: ${roomId}`);
            }

     
        };

        socket.on("new_unread_business_message", handleNewUnreadMessage);
        // Remove the old 'newUnreadMessage' listener if the backend doesn't use it anymore
        // socket.off("newUnreadMessage"); // Ensure this isn't causing issues if it existed

        return () => {
            console.log('Frontend: Cleaning up new_unread_business_message listener.');
            socket.off("new_unread_business_message", handleNewUnreadMessage);
        };
    }, [socket, selectedUser]); // `selectedUser` is important here for `selectedUserRef.current` to be up-to-date.

    // Reset unread count when a conversation is selected - This logic is good.
    useEffect(() => {
        if (!selectedUser || !currentUser) return;

        const updateUnread = (prevConversations) =>
            prevConversations.map(conv =>
                conv.room_id === selectedUser.room_id
                    ? { ...conv, unread_count: 0 }
                    : conv
            );

        setConversations(updateUnread);
        setDirectConversations(updateUnread);
        setBusinessConversations(updateUnread);
        setBusinessSalesConversations(updateUnread);
        
        // Also, mark message read on the backend
        socket.emit('mark_message_read', {
            room_id: selectedUser.room_id,
            recipient_id: currentUser.userid // The current user is the recipient
        });
        console.log(`Frontend: Emitted 'mark_message_read' for room ${selectedUser.room_id} for user ${currentUser.userid}`);

    }, [selectedUser, currentUser, socket]); // Add socket to dependencies for mark_message_read emit

    // Handle real-time message updates (receiveMessage) - This logic is good.
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            // Update last_message_time for the relevant conversation list
            const updateLastMessageTime = (prevConversations) =>
                prevConversations.map(conv =>
                    conv.room_id === message.room_id
                        ? { ...conv, last_message_time: message.created_at }
                        : conv
                );

            // Apply to all relevant lists
            setConversations(updateLastMessageTime);
            setDirectConversations(updateLastMessageTime);
            setBusinessConversations(updateLastMessageTime);
            setBusinessSalesConversations(updateLastMessageTime); // Apply to business sales as well
        };

        socket.on("receive_message", handleReceiveMessage); // Use 'receive_message' as per backend emit

        return () => {
            socket.off("receive_message", handleReceiveMessage);
        };
    }, [socket]); // No need for selectedUser here, as it uses selectedUserRef.current inside


    const mergeUniqueByRoomId = (...lists) => {
  const seen = new Set();
  return lists.flat().filter(conv => {
    if (seen.has(conv.room_id)) return false;
    seen.add(conv.room_id);
    return true;
  });
};


    return (
        <div className="container-fluid h-100">
            <div className="row h-100">
                <div className={`container ${selectedUser ? "show-chat" : ""}`}>
                    <div className="panel panel-left">
                        <Tabs.Root defaultValue="AllChats" variant="plain"  onValueChange={setActiveTab}>
                            <Tabs.List bg="bg.muted" rounded="l3" p="1">
                                <Tabs.Trigger value="AllChats">
                                    <LuUser /> All
                                </Tabs.Trigger>
                                <Tabs.Trigger value="DirectMessage">
                                    <LuFolder /> DM
                                </Tabs.Trigger>
                                <Tabs.Trigger value="Marketplace">
                                    <LuSquareCheck /> Marketplace
                                </Tabs.Trigger>
                                <Tabs.Trigger value="Business">
                                    <LuSquareCheck /> Business
                                </Tabs.Trigger>
                                <Tabs.Trigger value="BusinessSales">
                                    <LuSquareCheck /> Business Sales
                                </Tabs.Trigger>
                                <Tabs.Indicator rounded="l2" />
                            </Tabs.List>

                            <Tabs.Content value="AllChats">
                                <ChatList
  key={activeTab}
  conversations={[...conversations, ...businessConversations, ...businessSalesConversations]
    .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))}
  onSelect={setSelectedUser}
  selectedUser={selectedUser}
/>

                            </Tabs.Content>

                            <Tabs.Content value="DirectMessage">
                                <ChatList
                                 key={activeTab}
                                    onSelect={setSelectedUser}
                                    selectedUser={selectedUser}
                                    conversations={directConversations}
                                />
                            </Tabs.Content>

                            <Tabs.Content value="Marketplace">
                               <MarketplaceMessages
  onSelect={(user) => {
    user._source = "Marketplace";
    setSelectedUser(user);
  }}
  selectedUser={selectedUser}
  conversations={conversations.filter(c => c.product_id && c.userid !== currentUser.userid)}
/>
                            </Tabs.Content>

                            <Tabs.Content value="Business">
                                <ChatList
                                    conversations={businessConversations}
                                    onSelect={setSelectedUser}
                                    selectedUser={selectedUser}
                                />
                            </Tabs.Content>

                            <Tabs.Content value="BusinessSales">
                                <ChatList
                                    conversations={businessSalesConversations}
                                    onSelect={setSelectedUser}
                                    selectedUser={selectedUser}
                                />
                            </Tabs.Content>
                        </Tabs.Root>
                    </div>

                    <div className="panel panel-right">
                        <button onClick={() => setSelectedUser(null)}>← Back</button>

                     {selectedUser && currentUser ? (
  selectedUser._source === "Marketplace" ? (
    // Force ChatWindow for Marketplace
    <ChatWindow
      socket={socket}
      recipient={selectedUser}
      currentUser={{ id: currentUser.userid }}
      productId={selectedUser.product_id}
      productImage={selectedUser.product_image}
      productTitle={selectedUser.product_title}
    />
  ) : selectedUser.product_id ? (
    <ProductMessageChatWindow
      currentUser={{ id: currentUser.userid }}
      currentUserType="user"
      business={{
        id: selectedUser.userid,
        name: selectedUser.business_name,
        logo_url: selectedUser.profile_picture,
      }}
      product={{
        product_id: selectedUser.product_id,
        name: selectedUser.product_title,
        image: selectedUser.product_image,
      }}
      recipientUser={{
        id: selectedUser.userid,
        username: selectedUser.business_name,
        profile_picture_url: selectedUser.profile_picture,
      }}
      onBack={() => setSelectedUser(null)}
    />
  ) : selectedUser.room_id?.startsWith("chat_business_") ? (
    <BusinessUserChatWindow
      socket={socket}
      currentUser={{ id: currentUser.userid }}
      businessId={selectedUser.userid}
      business={selectedUser}
    />
  ) : (
    <ChatWindow
      socket={socket}
      recipient={selectedUser}
      currentUser={{ id: currentUser.userid }}
      productId={selectedUser.product_id}
      productImage={selectedUser.product_image}
      productTitle={selectedUser.product_title}
    />
  )
) : (
  <div className="text-muted m-auto">Select a conversation to begin chatting.</div>
)}


                    </div>
                </div>
            </div>
        </div>
    );
};

export default InboxPage;