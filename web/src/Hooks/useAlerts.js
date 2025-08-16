// src/Hooks/useAlerts.jsx
import { useState, useEffect } from 'react';
import { BASE_URL, getToken } from "../config";

export function useAlerts(initialRadius = 5) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState({});
  const [mediaFiles, setMediaFiles] = useState({});
  const [mediaPreview, setMediaPreview] = useState({});
  const [radius, setRadius] = useState(initialRadius);

useEffect(() => {
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        // Fetch alerts
        const alertsRes = await fetch(
          `${BASE_URL}/api/alerts?lat=${coords.latitude}&lng=${coords.longitude}&radius=${radius}`,
          { credentials: 'include' }
        );
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);

        // Fetch reverse geocode info
        const revGeoRes = await fetch(
          `${BASE_URL}/api/reverse-geocode?lat=${coords.latitude}&lon=${coords.longitude}`,
          { credentials: 'include' }
        );
        const revGeoData = await revGeoRes.json();
        console.log('Reverse geocode data:', revGeoData);
        // You could also set some state with this info if needed

      } catch (err) {
        console.error('Error fetching alerts or reverse geocode:', err);
      } finally {
        setLoading(false);
      }
      console.log('Current position:', coords);
    },
    (err) => {
      console.error('Geolocation error:', err);
      setLoading(false);
    }
  );
}, [radius]);


  // Your existing handleAlertSubmit can stay here

  return {
    alerts,
    loading,
    responseText,
    setResponseText,
    mediaFiles,
    setMediaFiles,
    mediaPreview,
    setMediaPreview,
    handleAlertSubmit: () => {}, // your existing submit logic
    radius,
    setRadius,
  };
}
