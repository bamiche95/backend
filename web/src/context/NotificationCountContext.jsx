import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '@/user/Socket';
import { BASE_URL, getToken } from '../config';

const token = getToken();


const NotificationCountContext = createContext();

export const useNotificationCount = () => useContext(NotificationCountContext);

export const NotificationCountProvider = ({ children }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/notifications/count`, {
          headers: {
         'Authorization': `Bearer ${token}`
       }
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };

    fetchCount();

    socket.on('notification_count_update', fetchCount);

    return () => {
      socket.off('notification_count_update', fetchCount);
    };
  }, []);

  return (
    <NotificationCountContext.Provider value={{ count, setCount }}>
      {children}
    </NotificationCountContext.Provider>
  );
};
