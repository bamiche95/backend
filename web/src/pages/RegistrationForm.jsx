import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL, getToken } from "../config";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
// Material-UI Components
import {
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  Paper,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { styled } from '@mui/material';

// Import your LocationPicker component
import LocationPicker from '@/Components/LocationPicker'; // Adjust path if necessary

// --- Styled Components for Animation ---
const FormStepContainer = styled(Box)(({ theme, isActive, direction }) => ({
  width: '100%',
  flexShrink: 0,
  transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
  transform: isActive
    ? 'translateX(0)'
    : direction === 'next'
    ? 'translateX(-100%)'
    : 'translateX(100%)',
  opacity: isActive ? 1 : 0,
  position: isActive ? 'static' : 'absolute',
  top: 0,
  left: 0,
  padding: theme.spacing(3),
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const FormWrapper = styled(Box)({
  display: 'flex',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
});

const RootContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '500px',
  margin: 'auto',
  marginTop: theme.spacing(5),
  padding: theme.spacing(3),
  border: '1px solid #ccc',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
}));

// --- Helper for Debouncing ---
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};


// --- Step Components ---

const StepOne = ({ formData, handleChange, passwordValid, usernameCheckStatus, emailCheckStatus, usernameError, emailError }) => (
  <>
    <Typography variant="h6" gutterBottom>
      Step 1: Account Details
    </Typography>
    <TextField
      label="Username"
      name="username"
      value={formData.username}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
      error={!!usernameError}
      helperText={
        usernameCheckStatus === 'checking' ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} /> Checking availability...
          </Box>
        ) : usernameCheckStatus === 'available' ? (
          <Typography color="success.main" variant="caption">Username available!</Typography>
        ) : (
          usernameError
        )
      }
    />
    <TextField
      label="Email address"
      name="email"
      type="email"
      value={formData.email}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
      error={!!emailError}
      helperText={
        emailCheckStatus === 'checking' ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} /> Checking availability...
          </Box>
        ) : emailCheckStatus === 'available' ? (
          <Typography color="success.main" variant="caption">Email available!</Typography>
        ) : (
          emailError
        )
      }
    />
    <TextField
      label="Password"
      name="password"
      type="password"
      value={formData.password}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
      error={!!formData.password && !passwordValid}
      helperText={
        !!formData.password && !passwordValid
          ? 'Password must be at least 6 characters, contain one uppercase letter, and one special character.'
          : ''
      }
    />
    <TextField
      label="Confirm Password"
      name="confirmPassword"
      type="password"
      value={formData.confirmPassword}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
      error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
      helperText={
        formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
          ? 'Passwords do not match'
          : ''
      }
    />
  </>
);

const StepTwo = ({ formData, handleChange, handleImageUpload, profilePicturePreview }) => (
  <>
    <Typography variant="h6" gutterBottom>
      Step 2: Profile Setup
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle1">Profile Picture (Optional)</Typography>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="profile-picture-upload"
        type="file"
        onChange={handleImageUpload}
      />
      <label htmlFor="profile-picture-upload">
        <IconButton color="primary" component="span">
          <PhotoCamera sx={{ fontSize: 40 }} />
        </IconButton>
      </label>
      {profilePicturePreview && (
        <Avatar src={profilePicturePreview} sx={{ width: 100, height: 100 }} />
      )}
    </Box>
    <TextField
      label="First Name"
      name="firstname"
      value={formData.firstname}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Last Name"
      name="lastname"
      value={formData.lastname}
      onChange={handleChange}
      required
      fullWidth
      variant="outlined"
    />
  </>
);

const StepThree = ({ formData, handleChange, professions, onLocationChange, locationError, selectedLocation }) => (
  <>
    <Typography variant="h6" gutterBottom>
      Step 3: Location & Occupation
    </Typography>
    <FormControl fullWidth variant="outlined" required>
      <InputLabel id="occupation-label">Occupation</InputLabel>
      <Select
        labelId="occupation-label"
        id="occupation"
        name="occupation"
        value={formData.occupation}
        onChange={handleChange}
        label="Occupation"
      >
        {!professions ? (
          <MenuItem disabled>
            <CircularProgress size={20} /> Loading professions...
          </MenuItem>
        ) : (
          professions.map((prof) => (
            <MenuItem key={prof.proid} value={prof.name}>
              {prof.name}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>

    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
      Location
    </Typography>
    {/* LocationPicker now passes latitude, longitude, and address */}
    <LocationPicker onLocationChange={onLocationChange} />
    {locationError && (
      <Typography color="error" variant="caption">
        {locationError}
      </Typography>
    )}
    {/* Display the selected broader address here */}
    {formData.address && (
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        Selected Area: <strong>{formData.address}</strong>
      </Typography>
    )}
  </>
);

// --- Main Multi-Step Form Component ---

const MultiStepRegistrationForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('next'); // 'next' or 'prev' for animation
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstname: '',
    lastname: '',
    occupation: '',
    address: '', // New field for the broader address string
    profile_picture: null, // Stores File object
    latitude: null,
    longitude: null,
  });
  const navigate = useNavigate(); // Initialize the navigate hook

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordValid, setPasswordValid] = useState(false);
  const [professions, setProfessions] = useState(null); // To store fetched professions
  const [profilePicturePreview, setProfilePicturePreview] = useState(null); // For image viewer
  const [selectedLocation, setSelectedLocation] = useState(null); // For location picker display (could be removed if not directly used)
  const [locationError, setLocationError] = useState('');

  // New states for duplicate checking
  const [usernameCheckStatus, setUsernameCheckStatus] = useState('idle'); // 'idle', 'checking', 'available', 'taken'
  const [emailCheckStatus, setEmailCheckStatusStatus] = useState('idle');   // 'idle', 'checking', 'available', 'taken'
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');

const { setUser } = useAuth();
  // Fetch professions on component mount
  useEffect(() => {
    const fetchProfessions = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/professions`); // Adjust API endpoint as needed
        if (!response.ok) {
          throw new Error('Failed to fetch professions');
        }
        const data = await response.json();
        setProfessions(data);
      } catch (err) {
        console.error('Error fetching professions:', err);
        // Optionally set an error state for the user
      }
    };
    fetchProfessions();
  }, []);

  // Password validation checker
  const validatePassword = (password) => {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValid = password.length >= minLength && hasUpperCase && hasSpecialChar;
    setPasswordValid(isValid);
  };

  // Async checker functions for username and email
  const checkUsername = async (username) => {
    if (!username) {
      setUsernameCheckStatus('idle');
      setUsernameError('');
      return;
    }
    if (username.length < 3) {
      setUsernameCheckStatus('idle');
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    setUsernameCheckStatus('checking');
    setUsernameError('');
    try {
      const res = await fetch(`${BASE_URL}/api/check-username?username=${username}`);
      const data = await res.json();
      if (data.exists) {
        setUsernameCheckStatus('taken');
        setUsernameError('This username is already taken.');
      } else {
        setUsernameCheckStatus('available');
        setUsernameError('');
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameCheckStatus('idle');
      setUsernameError('Could not check username. Please try again.');
    }
  };

  const checkEmail = async (email) => {
    if (!email) {
      setEmailCheckStatusStatus('idle');
      setEmailError('');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) { // Basic regex for email format
      setEmailCheckStatusStatus('idle');
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailCheckStatusStatus('checking');
    setEmailError('');
    try {
      const res = await fetch(`${BASE_URL}/api/check-email?email=${email}`);
      const data = await res.json();
      if (data.exists) {
        setEmailCheckStatusStatus('taken');
        setEmailError('This email is already registered.');
      } else {
        setEmailCheckStatusStatus('available');
        setEmailError('');
      }
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailCheckStatusStatus('idle');
      setEmailError('Could not check email. Please try again.');
    }
  };

  // Debounced versions of the checkers to avoid excessive API calls
  const debouncedCheckUsername = useCallback(debounce(checkUsername, 500), []);
  const debouncedCheckEmail = useCallback(debounce(checkEmail, 500), []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'password') {
      validatePassword(value);
    } else if (name === 'username') {
      debouncedCheckUsername(value);
    } else if (name === 'email') {
      debouncedCheckEmail(value);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        profile_picture: file,
      }));
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({
        ...prev,
        profile_picture: null,
      }));
      setProfilePicturePreview(null);
    }
  };

  // Updated handleLocationChange to accept the full object from LocationPicker
  const handleLocationChange = (locationData) => {
    // locationData will be { latitude, longitude, address }
    setSelectedLocation([locationData.latitude, locationData.longitude]); // Keep for map centering if needed
    setFormData((prev) => ({
      ...prev,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address, // Store the broader address string
    }));
    setLocationError('');
  };

  const handleNext = () => {
    setError('');

    // Validation for Step 1
    if (currentStep === 0) {
      // Basic field presence check
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields for Step 1.');
        return;
      }
      // Password match check
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      // Password complexity check
      if (!passwordValid) {
        setError('Password must be at least 6 characters long, contain one uppercase letter, and one special character');
        return;
      }

      // **Duplicate and Check Status Validation**
      if (usernameCheckStatus === 'checking' || emailCheckStatus === 'checking') {
        setError('Please wait for username/email availability check to complete.');
        return;
      }
      if (usernameCheckStatus === 'taken') {
        setError('Please choose a different username. It is already taken.');
        return;
      }
      if (emailCheckStatus === 'taken') {
        setError('Please use a different email. It is already registered.');
        return;
      }
      // If user typed something and immediately clicked next, forcing a final check
      if (formData.username && usernameCheckStatus === 'idle' && formData.username.length >= 3) {
        setError('Please wait for username availability to be confirmed.');
        checkUsername(formData.username); // Trigger check immediately
        return;
      }
      if (formData.email && emailCheckStatus === 'idle' && /\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please wait for email availability to be confirmed.');
        checkEmail(formData.email); // Trigger check immediately
        return;
      }

    }

    // Validation for Step 2
    if (currentStep === 1) {
      if (!formData.firstname || !formData.lastname) {
        setError('First Name and Last Name are mandatory.');
        return;
      }
    }

    setDirection('next');
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setDirection('prev');
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    setError('');
    setSuccess('');

    // Final validation for Step 3
    if (currentStep === 2) {
      if (!formData.occupation) {
        setError('Please select an occupation.');
        return;
      }
      if (!formData.latitude || !formData.longitude || !formData.address) { // Validate address presence
        setError('Please set your location on the map, including a recognized area.');
        return;
      }
    }

    const registrationData = new FormData();
    for (const key in formData) {
      // Exclude confirmPassword, profile_picture will be added separately if it exists
     if (key !== 'profile_picture') {// Ensure confirmPassword is excluded
        registrationData.append(key, formData[key]);
      }
    }
    if (formData.profile_picture) {
      registrationData.append('profile_picture', formData.profile_picture);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        body: registrationData,
          credentials: 'include',
      });

      const data = await res.json();

     if (res.ok) {
        setSuccess('Registration successful!');
        setError('');

        if (data?.user) {
          setUser(data.user);
        }

        navigate('/feeds');

        // Reset form data after successful submission
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          firstname: '',
          lastname: '',
          occupation: '',
          address: '', // Reset address field
          profile_picture: null,
          latitude: null,
          longitude: null,
        });
        setProfilePicturePreview(null);
        setSelectedLocation(null);
        setCurrentStep(0); // Go back to the first step
        setUsernameCheckStatus('idle'); // Reset check statuses
        setEmailCheckStatusStatus('idle');
        setUsernameError('');
        setEmailError('');
      } else {
        setError(data.error || 'Something went wrong');
        setSuccess('');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('Server error or network issue');
      setSuccess('');
    }
  };

  return (
    <RootContainer component={Paper} elevation={6}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        Create Your Account
      </Typography>

      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Step {currentStep + 1} of 3
      </Typography>

      <FormWrapper>
        <FormStepContainer isActive={currentStep === 0} direction={direction}>
          <StepOne
            formData={formData}
            handleChange={handleChange}
            passwordValid={passwordValid}
            usernameCheckStatus={usernameCheckStatus}
            emailCheckStatus={emailCheckStatus}
            usernameError={usernameError}
            emailError={emailError}
          />
        </FormStepContainer>

        <FormStepContainer isActive={currentStep === 1} direction={direction}>
          <StepTwo
            formData={formData}
            handleChange={handleChange}
            handleImageUpload={handleImageUpload}
            profilePicturePreview={profilePicturePreview}
          />
        </FormStepContainer>

        <FormStepContainer isActive={currentStep === 2} direction={direction}>
          <StepThree
            formData={formData}
            handleChange={handleChange}
            professions={professions}
            onLocationChange={handleLocationChange}
            locationError={locationError}
            selectedLocation={selectedLocation}
          />
        </FormStepContainer>
      </FormWrapper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 3 }}>
        {currentStep > 0 && (
          <Button variant="outlined" onClick={handleBack}>
            Back
          </Button>
        )}
        {currentStep < 2 && (
          <Button variant="contained" onClick={handleNext} sx={{ ml: 'auto' }}>
            Next
          </Button>
        )}
        {currentStep === 2 && (
          <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ ml: 'auto' }}>
            Register
          </Button>
        )}
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }}>
          {success}
        </Typography>
      )}
    </RootContainer>
  );
};

export default MultiStepRegistrationForm;