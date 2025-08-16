import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '@/user/Socket';
import { BASE_URL, getToken } from '../config';

const token = getToken();

import { useAuth } from '@/context/AuthContext';  // your auth hook

const UnreadMessageCountContext = createContext();

export const useUnreadMessageCount = () => useContext(UnreadMessageCountContext);

export const UnreadMessageCountProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth(); // get current user object

  useEffect(() => {
    if (!user?.id) return;  // wait until user.id is available

    const notificationRoom = `business_notifications:${user.id}`;

    // Join the notification room so socket can receive unread_count_updated events
    socket.emit('joinRoom', notificationRoom);
console.log("Joined notification room:", notificationRoom);
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/messages/unread-count`, {
          headers: {
         'Authorization': `Bearer ${token}`
       }
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      } catch (err) {
        console.error('Failed to fetch unread message count:', err);
      }
    };

    fetchUnreadCount();

    // Listen for server events about unread count updates
    socket.on('unread_count_updated', fetchUnreadCount);

    return () => {
      socket.off('unread_count_updated', fetchUnreadCount);
    };
  }, [user?.id]);  // re-run if user.id changes

  return (
    <UnreadMessageCountContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </UnreadMessageCountContext.Provider>
  );
};
