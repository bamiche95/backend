import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';

import './Address.css';

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
import { BASE_URL, getToken } from "../config";

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
function MyAddressForm({ onClose, initialData = {}, isEditMode = false }) {

const [categories, setCategories] = useState([]);

const [logoFile, setLogoFile] = useState(null);
const [bannerFile, setBannerFile] = useState(null);
const [logoPreview, setLogoPreview] = useState(null);
const [bannerPreview, setBannerPreview] = useState(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitSuccess, setSubmitSuccess] = useState(false);
  // Initialize state with initialData or default empty values
  const [businessName, setBusinessName] = useState(initialData.name || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [selectedCategory, setSelectedCategory] = useState(initialData.category_id?.toString() || '');
  const [address, setAddress] = useState({
    formattedAddress: initialData.address || '',
    latitude: initialData.latitude || null,
    longitude: initialData.longitude || null,
  });
 const businessId = initialData.id || null;

// Handle file previews
const handleLogoChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }
};

const handleBannerChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }
};

const removeLogo = () => {
  setLogoFile(null);
  setLogoPreview(null);
};

const removeBanner = () => {
  setBannerFile(null);
  setBannerPreview(null);
};



const uploadBoxStyle = {
  width: '150px',
  height: '150px',
  border: '2px dashed #ccc',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '#f9f9f9',
};

const removeButtonStyle = {
  position: 'absolute',
  top: '5px',
  right: '5px',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '16px',
  zIndex: 1,
};



//To avoid memory leaks
useEffect(() => {
  return () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
  };
}, [logoPreview, bannerPreview]);


useEffect(() => {
  fetch(`${BASE_URL}/api/business_categories`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    })
    .then(data => {
      setCategories(data.categories || []); // Adjust according to your API response structure
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id.toString()); // select first by default
      }
    })
    .catch(err => {
      console.error('Error loading categories:', err);
    });
}, []);



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

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!businessName || !selectedCategory || !address.formattedAddress || !address.latitude || !address.longitude) {
    alert('Please fill in all required fields.');
    return;
  }

  setIsSubmitting(true);
  setSubmitSuccess(false);

  const formData = new FormData();
  formData.append('name', businessName);
  formData.append('description', description || '');
  formData.append('address', address.formattedAddress);
  formData.append('latitude', address.latitude);
  formData.append('longitude', address.longitude);
  formData.append('category_id', selectedCategory);
  formData.append('phone', phone || '');

  if (logoFile) formData.append('logo', logoFile);
  if (bannerFile) formData.append('banner', bannerFile);

  try {
    const url = isEditMode
      ? `${BASE_URL}/api/businesses/${businessId}`
      : `${BASE_URL}/api/businesses`;

    const method = isEditMode ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      alert(`Failed: ${result.error}`);
      setIsSubmitting(false);
      return;
    }

    setSubmitSuccess(true);

    if (!isEditMode) {
      // Reset form only if creating new
      setTimeout(() => {
        setBusinessName('');
        setPhone('');
        setDescription('');
        setSelectedCategory(categories.length ? categories[0].id.toString() : '');
        setAddress({ formattedAddress: '', latitude: null, longitude: null });
        setLogoFile(null);
        setBannerFile(null);
        setLogoPreview(null);
        setBannerPreview(null);
        setIsSubmitting(false);
        setSubmitSuccess(false);
      }, 2000);
    } else {
      // Optionally do something after update
      setIsSubmitting(false);
    }

    onClose();
  } catch (err) {
    console.error('Error submitting:', err);
    alert('An error occurred while submitting the form.');
    setIsSubmitting(false);
  }
};

useEffect(() => {
  if (isEditMode && initialData) {
    if (initialData.logo_url) {
      setLogoPreview(initialData.logo_url);
      setLogoFile(null); // no new file selected yet
    }
    if (initialData.banner_url) {
      setBannerPreview(initialData.banner_url);
      setBannerFile(null);
    }
  }
}, [isEditMode, initialData]);



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


      <Fieldset.Content>
       <Field.Root>
  <Field.Label>Business name</Field.Label>
  <Input
    name="businessName"
    placeholder="ABC ltd"
    value={businessName}
    onChange={e => setBusinessName(e.target.value)}
  />
</Field.Root>

<Field.Root>
  <Field.Label>Phone</Field.Label>
  <Input
    name="phone"
    type="tel"
    placeholder="123 133 1234"
    value={phone}
    onChange={e => setPhone(e.target.value)}
  />
</Field.Root>

<Field.Root>
  <Field.Label>Describe your Business</Field.Label>
  <Textarea
    value={description}
    onChange={e => setDescription(e.target.value)}
    placeholder="Describe your Business"
  />
</Field.Root>

<Field.Root>
  <Field.Label>Business Category</Field.Label>
  <NativeSelect.Root>
    <NativeSelect.Field
      name="category"
      value={selectedCategory}
      onChange={e => setSelectedCategory(e.target.value)}
    >
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </NativeSelect.Field>
    <NativeSelect.Indicator />
  </NativeSelect.Root>
</Field.Root>


<Field.Root>
  <Field.Label>Logo (optional)</Field.Label>
  <div style={uploadBoxStyle} onClick={() => !logoPreview && document.getElementById('logo-input').click()}>
    {logoPreview ? (
      <>
        <button style={removeButtonStyle} type="button" onClick={removeLogo}>×</button>
        <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </>
    ) : (
      <span style={{ fontSize: '2rem', color: '#888' }}>+</span>
    )}
    <input
      id="logo-input"
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={handleLogoChange}
    />
  </div>
</Field.Root>


<Field.Root>
  <Field.Label>Banner (optional)</Field.Label>
  <div
    style={{ ...uploadBoxStyle, width: '100%', height: '200px' }}
    onClick={() => !bannerPreview && document.getElementById('banner-input').click()}
  >
    {bannerPreview ? (
      <>
        <button style={removeButtonStyle} type="button" onClick={removeBanner}>×</button>
        <img src={bannerPreview} alt="Banner preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </>
    ) : (
      <span style={{ fontSize: '2rem', color: '#888' }}>+</span>
    )}
    <input
      id="banner-input"
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={handleBannerChange}
    />
  </div>
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
        
        

{isSubmitting ? (
  <Button isDisabled alignSelf="flex-start">
    <span className="spinner" /> {isEditMode ? 'Updating...' : 'Submitting...'}
  </Button>
) : submitSuccess ? (
  <Button isDisabled alignSelf="flex-start" colorScheme="green">
    {isEditMode ? 'Business updated successfully!' : 'Business registered successfully!'}
  </Button>
) : (
  <Button onClick={handleSubmit} type="submit" alignSelf="flex-start">
    {isEditMode ? 'Update Business' : 'Submit'}
  </Button>
)}

    </Fieldset.Root>

      </Box>

      <style jsx> {
        `
   .pac-container {
  background-color: White !important;
  color: white !important;
  font-size: 14px !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.8) !important;
  z-index: 10000 !important;
}

.pac-item {
  padding: 8px 12px !important;
}

.pac-item:hover {
  background-color: #444 !important;
  color: white !important;
}

.pac-item span {
padding: 7px;
font-size: 16px
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

        
        `}
      </style >
    </APIProvider>
  );
}

export default MyAddressForm;