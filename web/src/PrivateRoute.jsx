import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const checkToken = async () => {
    const token = localStorage.getItem('authToken');

    if (token) {
      // Optional: you can decode and check expiration here if you want
      setIsAuthenticated(true);
    } else {
      // Try refreshing the token using the refresh token in cookies
      try {
        const res = await fetch('http://localhost:5000/api/refresh-token', {
          method: 'POST',
          credentials: 'include', // allow cookie to be sent
        });

        const data = await res.json();

        if (res.ok && data.accessToken) {
          localStorage.setItem('authToken', data.accessToken);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Token refresh failed', err);
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
