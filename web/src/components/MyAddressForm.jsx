import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';



import {
  Button,
  Field,
  Fieldset,
  For,
  Input,
  NativeSelect,
  Stack,
  Box, Textarea 
} from "@chakra-ui/react"

// This component remains the same, it handles the Google Autocomplete logic
function AddressAutocompleteInput({ onPlaceSelect }) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const places = useMapsLibrary('places'); // Loads the Places library



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
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address;
        }
      } else {
        console.log('Place not found:', place.name);
      }
    };

    const listener = placeAutocomplete.addListener('place_changed', handlePlaceChanged);

    return () => {
      // It's crucial to remove listeners to prevent memory leaks,
      // especially in more complex component lifecycles.
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [placeAutocomplete, onPlaceSelect]);

  return (
    <div className="autocomplete-container">
   
    <Field.Root orientation="horizontal" mb={10}>
        
        <Input ref={inputRef}  placeholder="Enter your address" flex="1" />
      </Field.Root>
     
    </div>
  );
}

// ====================================================================
// NEW FUNCTIONALITY: MyLocationButton
// ====================================================================
function MyLocationButton({ onLocationFetched }) {
  const [isFetching, setIsFetching] = useState(false);
  const geocoding = useMapsLibrary('geocoding'); // Loads the Geocoding library

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetching(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Current location:", latitude, longitude);

        if (!geocoding) {
          console.error("Geocoding library not loaded.");
          setIsFetching(false);
          return;
        }

        const geocoder = new geocoding.Geocoder();
        const request = {
          location: { lat: latitude, lng: longitude },
        };

        try {
          const response = await geocoder.geocode(request);
          if (response.results[0]) {
            // Pass the first result (most accurate) to the parent component
            onLocationFetched(response.results[0]);
          } else {
            alert("No address found for your location.");
          }
        } catch (error) {
          console.error("Geocoding failed:", error);
          alert("Failed to find address for your location.");
        } finally {
          setIsFetching(false);
        }
      },
      (error) => {
        setIsFetching(false);
        console.error("Geolocation error:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Please enable location permissions in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
          default:
            alert("An unknown error occurred while getting your location.");
            break;
        }
      }
    );
  };

  return (
    <Button
      type="button"
      onClick={handleUseMyLocation}
      disabled={isFetching}
      style={{
        padding: '8px 12px',
        backgroundColor: isFetching ? '#ccc' : '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: '10px',
      }}
    >
      {isFetching ? 'Fetching...' : 'Use My Location'}
    </Button>
  );
}

// ====================================================================
// UPDATED: MyAddressForm
// ====================================================================
function MyAddressForm() {
  const [address, setAddress] = useState({
    formattedAddress: '',
    latitude: null,
    longitude: null,
  });

  // Use a ref to control the value of the Autocomplete input field
  const autocompleteInputRef = useRef(null);

  const handlePlaceSelect = (place) => {
    console.log('Selected Place:', place);

    const newAddress = {
      formattedAddress: place.formatted_address,
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    };

    setAddress(newAddress);
  };
  
  // This new handler will be called by the "Use My Location" button
  const handleLocationFetched = (placeResult) => {
    // The `placeResult` from the Geocoder API is very similar to the one
    // from the Places Autocomplete API. We can use the same logic.
    handlePlaceSelect(placeResult);


    setAddress({
      formattedAddress: placeResult.formatted_address,
      latitude: placeResult.geometry?.location?.lat(),
      longitude: placeResult.geometry?.location?.lng(),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted Address:', address);
    alert(`Submitting: ${address.formattedAddress} (Lat: ${address.latitude}, Lng: ${address.longitude})`);
  };

  return (
    <APIProvider apiKey="YOUR_Maps_API_KEY"> {/* REMEMBER TO REPLACE THIS WITH YOUR REAL KEY */}
     
        
      
                <Box
      component="form"
      sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}
      noValidate
      autoComplete="off"
    >
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Business Registration</h2>
        
        <Fieldset.Root  onSubmit={handleSubmit} size="lg" maxW="md">
      <Stack>
      
       
      </Stack>

      <Fieldset.Content>
        <Field.Root>
          <Field.Label>Business name</Field.Label>
          <Input name="Businessname" placeholder='ABC ltd'/>
        </Field.Root>

        <Field.Root>
          <Field.Label>Phone</Field.Label>
          <Input name="phone" type="tel" placeholder='123 133 1234'/>
        </Field.Root>
<Field.Root>
  <Textarea
            placeholder="Describe your Business"
          
          />

</Field.Root>
       

        <Field.Root>
          <Field.Label>Business Category</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field name="country">
              <For each={["Sales", "Cafe", "retail"]}>
                {(item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                )}
              </For>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </Fieldset.Content>

                <label htmlFor="addressInput" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Address:</label>
          <Box style={{ display: 'block', marginBottom: '30px'}}>
            {/* The Autocomplete input */}
            <AddressAutocompleteInput onPlaceSelect={handlePlaceSelect} />
            
            {/* The "Use My Location" button */}
            <MyLocationButton onLocationFetched={handleLocationFetched} />
          </Box>
       

        {/* Display the selected formatted address below the input (optional) */}
        {address.formattedAddress && (
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Selected:</strong> {address.formattedAddress}
            <br />
            {address.latitude && address.longitude && (
              <span>(Lat: {address.latitude}, Lng: {address.longitude})</span>
            )}
          </div>
        )}
         
        <input type="hidden" name="fullAddress" value={address.formattedAddress} />
        <input type="hidden" name="latitude" value={address.latitude || ''} />
        <input type="hidden" name="longitude" value={address.longitude || ''} />
        
        

      <Button type="submit" alignSelf="flex-start">
        Submit
      </Button>
    </Fieldset.Root>

      </Box>
    </APIProvider>
  );
}

export default MyAddressForm;