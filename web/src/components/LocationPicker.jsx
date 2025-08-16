import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

const DEFAULT_POSITION = [51.505, -0.09];

// Helper function to extract a broader address
const getBroaderAddress = (addressComponents) => {
    // Log all address components to understand their structure.
    // console.log("Nominatim address components:", addressComponents);

    // Prioritize components from specific to broader,
    // or based on your desired level of detail.
    // Example order: suburb/village > town > city > county > state > country
    if (addressComponents.suburb) return addressComponents.suburb;
    if (addressComponents.village) return addressComponents.village;
    if (addressComponents.town) return addressComponents.town;
    if (addressComponents.city) return addressComponents.city;
    if (addressComponents.county) return addressComponents.county;
    if (addressComponents.state) return addressComponents.state;
    if (addressComponents.country) return addressComponents.country; // Fallback to country if nothing else.
    
    // If none of the above, fall back to a less specific but still useful part
    if (addressComponents.postcode) return addressComponents.postcode;
    if (addressComponents.road) return addressComponents.road;


    return 'Address not found'; // Fallback if no relevant component is found
};


function LocationMarker({ position, setPosition, onLocationChange, currentAddress, useDetailedAddress  }) {
    const map = useMap();
    const markerRef = useRef(null);

    const reverseGeocode = async ([lat, lng]) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            
            // Log the full data object to inspect its structure
            console.log("Nominatim response data:", data); 

            // Extract broader address using the helper function
const address = useDetailedAddress
  ? data.display_name  // full formatted address from Nominatim
  : getBroaderAddress(data.address || {});

            onLocationChange({ latitude: lat, longitude: lng, address });
            return address;
        } catch (err) {
            console.error('Reverse geocoding error:', err);
            onLocationChange({ latitude: lat, longitude: lng, address: 'Failed to fetch address' });
            return 'Failed to fetch address';
        }
    };

    useMapEvents({
        click(e) {
            const newPos = [e.latlng.lat, e.latlng.lng];
            setPosition(newPos);
            reverseGeocode(newPos);
            map.flyTo(newPos, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    if (!position) return null;

    return (
        <Marker
            position={position}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
                dragend() {
                    const marker = markerRef.current;
                    if (marker != null) {
                        const latLng = marker.getLatLng();
                        const newPos = [latLng.lat, latLng.lng];
                        setPosition(newPos);
                        reverseGeocode(newPos);
                    }
                },
            }}
        >
            <Popup>{currentAddress || 'Drag me to adjust location'}</Popup>
        </Marker>
    );
}

const LocationPicker = ({ onLocationChange, initialPosition, initialAddress, useDetailedAddress = false, }) => {
    const [position, setPosition] = useState(initialPosition);
    const [address, setAddress] = useState(initialAddress);
    const [error, setError] = useState('');
const [typedAddress, setTypedAddress] = useState('');
 const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
    useEffect(() => {
    if (initialPosition && (!position || initialPosition[0] !== position[0] || initialPosition[1] !== position[1])) {
        setPosition(initialPosition);
    }
    if (initialAddress && initialAddress !== address) {
        setAddress(initialAddress);
              setTypedAddress(initialAddress); // sync typed input with address on load

    }
    if (initialPosition && initialPosition.length === 2 && !initialAddress) {
        reverseGeocodeAndUpdate(initialPosition);
    }
}, [initialPosition, initialAddress, position, address]);


    const handleSetLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos = [pos.coords.latitude, pos.coords.longitude];
                setPosition(newPos);
                setError('');
                reverseGeocodeAndUpdate(newPos);
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Permission denied. Please allow location access.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable.');
                        break;
                    case err.TIMEOUT:
                        setError('The request to get your location timed out.');
                        break;
                    default:
                        setError('An unknown error occurred while fetching location.');
                }
                onLocationChange({ latitude: null, longitude: null, address: '' });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const reverseGeocodeAndUpdate = async ([lat, lng]) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            
            // Log the full data object to inspect its structure
            console.log("Nominatim response data (from reverseGeocodeAndUpdate):", data);

            // Extract broader address using the helper function
            const addr = useDetailedAddress
  ? data.display_name  // full formatted address from Nominatim
  : getBroaderAddress(data.address || {});

            setAddress(addr);
            onLocationChange({ latitude: lat, longitude: lng, address: addr });
        } catch (err) {
            console.error('Reverse geocoding error in LocationPicker:', err);
            setAddress('Failed to fetch address');
            onLocationChange({ latitude: lat, longitude: lng, address: 'Failed to fetch address' });
        }
    };
 const geocodeAddress = async (query) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const loc = data[0];
        const lat = parseFloat(loc.lat);
        const lon = parseFloat(loc.lon);
        const display_name = loc.display_name;

        setPosition([lat, lon]);
        setAddress(display_name);
        setError('');
        onLocationChange({ latitude: lat, longitude: lon, address: display_name });
        return true;
      } else {
        setError('Address not found.');
        return false;
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to fetch location for the address.');
      return false;
    }
  };

  // Fetch suggestions for autocomplete as user types
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Suggestions fetch error:', err);
      setSuggestions([]);
    }
  };

  // Handle input changes with debounce for suggestions
  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedAddress(val);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

    // Handle when user submits or leaves input field
 const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!typedAddress.trim()) {
      setError('Please enter an address.');
      return;
    }
    setShowSuggestions(false);
    await geocodeAddress(typedAddress);
  };

  // You can also do onBlur to geocode on losing focus if you want
  const handleAddressBlur = async () => {
    if (typedAddress.trim() && typedAddress !== address) {
      await geocodeAddress(typedAddress);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    const display_name = suggestion.display_name;

    setPosition([lat, lon]);
    setAddress(display_name);
    setTypedAddress(display_name);
    setShowSuggestions(false);
    setError('');
    onLocationChange({ latitude: lat, longitude: lon, address: display_name });
  };
    return (
        <div style={{ width: '100%', margin: '0 auto' }}>
            <button
                type="button"
                onClick={handleSetLocation}
                style={{
                    padding: '0.5rem 1rem',
                    marginBottom: '0.5rem',
                    fontSize: '1rem',
                    width: '100%',
                    borderRadius: 6,
                    cursor: 'pointer',
                }}
            >
                Set My Current Location
            </button>


     {/* New address input form */}
     <form onSubmit={handleAddressSubmit} style={{ marginBottom: 8, position: 'relative' }}>
        <input
          type="text"
          placeholder="Enter full address or Post code"
          value={typedAddress}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: 6,
            border: '1px solid #ccc',
            fontSize: '1rem',
          }}
          onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul
            style={{
              listStyleType: 'none',
              margin: 0,
              padding: '0.25rem 0',
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: 150,
              overflowY: 'auto',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '0 0 6px 6px',
              zIndex: 1000,
            }}
          >
            {suggestions.map((s) => (
              <li
                key={`${s.place_id}`}
                onClick={() => handleSuggestionClick(s)}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </form>

      {error && (
        <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: 8 }}>{error}</p>
      )}

      {address && !error && (
        <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>📍 {address}</p>
      )}

      <MapContainer
        center={position || DEFAULT_POSITION}
        zoom={13}
        style={{ height: 300, width: '100%', borderRadius: 8 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
       <LocationMarker
    position={position}
    setPosition={setPosition}
    onLocationChange={({ latitude, longitude, address }) => {
      setAddress(address);
      setTypedAddress(address);
      onLocationChange({ latitude, longitude, address });
      setError('');
    }}
    currentAddress={address}
    useDetailedAddress={useDetailedAddress} 
  />
      </MapContainer>
        </div>
    );
};

export default LocationPicker;