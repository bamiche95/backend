import React from 'react';
import Button from '@mui/material/Button';
import DirectionsIcon from '@mui/icons-material/Directions';

/**
 * GetDirectionsButton
 * --------------------------------------------------
 * @param {number|string|null} userLat   – user’s latitude (e.g. "52.504143")
 * @param {number|string|null} userLng   – user’s longitude
 * @param {number|string}      destLat   – business / event latitude
 * @param {number|string}      destLng   – business / event longitude
 */
const GetDirectionsButton = ({ userLat, userLng, destLat, destLng }) => {
  const openMaps = (originLat, originLng) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`;
    window.open(url, '_blank', 'noopener noreferrer');
  };

  const handleClick = () => {
    /* ---------- 1) try session coordinates ---------- */
    const hasSessionCoords =
      userLat !== undefined &&
      userLat !== null &&
      userLng !== undefined &&
      userLng !== null &&
      !Number.isNaN(parseFloat(userLat)) &&
      !Number.isNaN(parseFloat(userLng));

    if (hasSessionCoords) {
      openMaps(userLat, userLng);
      return;
    }

    /* ---------- 2) fallback to browser geolocation ---------- */
    if (!navigator.geolocation) {
      alert('Unable to get your current position.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        openMaps(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.error(err);
        alert('Unable to fetch your location – please enable GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<DirectionsIcon />}
      onClick={handleClick}
      sx={{ textTransform: 'none' }}
    >
      Get&nbsp;Directions
    </Button>
  );
};

export default GetDirectionsButton;
