import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BASE_URL, getToken } from "../config";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

const ViewAlertMap = ({ latitude, longitude }) => {
  const [position] = useState([parseFloat(latitude), parseFloat(longitude)]);
  const [locationName, setLocationName] = useState('Loading location...');

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Fetch from your backend API instead of directly from Nominatim
        const res = await fetch(
          `${BASE_URL}/api/reverse-geocode?lat=${latitude}&lon=${longitude}`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch location: ${res.status}`);
        }

        const data = await res.json();
        const address = data.address || {};

        const road = address.road || address.pedestrian || '';
        const town = address.town || address.city || address.village || '';

        const location = [road, town].filter(Boolean).join(', ');
        setLocationName(location || 'Unknown location');
      } catch (err) {
        console.error(err);
        setLocationName('Location not available');
      }
    };

    fetchLocation();
  }, [latitude, longitude]);

  return (
    <div style={{ height: 300, width: '100%' }}>
      <MapContainer
        center={position}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{locationName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ViewAlertMap;
