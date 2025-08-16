// AddressAutocompleteInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

function AddressAutocompleteInput({ onPlaceSelect }) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
  const handleMouseDown = (e) => {
    const pacContainer = document.querySelector('.pac-container');
    if (pacContainer && pacContainer.contains(e.target)) {
      e.stopPropagation(); // prevent focus trap
    }
  };

  document.addEventListener('mousedown', handleMouseDown, true);

  return () => {
    document.removeEventListener('mousedown', handleMouseDown, true);
  };
}, []);


  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      types: ['address'],
    };
    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    const handlePlaceChanged = () => {
      const place = placeAutocomplete.getPlace();
      if (place.geometry) {
        onPlaceSelect(place);
        // You might want to clear the input after selection, or leave it with the formatted address
        inputRef.current.value = place.formatted_address || ''; // Keep formatted address
      } else {
        console.log('Place not found or incomplete:', place.name);
      }
    };

    const listener = placeAutocomplete.addListener('place_changed', handlePlaceChanged);

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [placeAutocomplete, onPlaceSelect]);

  return (
    <div className="autocomplete-container" style={{ marginBottom: '15px' }}>
      <div className="field-root">
        <label htmlFor="autocomplete-address" className="field-label">Search Address (Autocomplete)</label>
        <input
          id="autocomplete-address"
          ref={inputRef}
          placeholder="Start typing your address..."
          className="input-field"
        />
      </div>
    </div>
  );
}

export default AddressAutocompleteInput;