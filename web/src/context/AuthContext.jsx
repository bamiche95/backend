import React, { createContext, useEffect, useState, useContext } from 'react';
import { BASE_URL, getToken } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the current authenticated user from /api/me
  const fetchUser = async () => {
    setLoading(true);
    const token = getToken(); // Get the latest token dynamically
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser(); // Initial fetch on mount
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for easy access to auth context
export const useAuth = () => useContext(AuthContext);
