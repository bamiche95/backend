import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the custom hook
import { BASE_URL, getToken } from '../config'; // Import the BASE_URL and getToken function
const token = getToken(); // Get the token for authentication

const Login = () => {
  const { setUser } = useAuth(); // Get the setUser function from AuthContext
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation(); // To get the current location

  // Check if there is a "from" location passed in the state
  const from = location.state?.from || '/feeds'; // Default to '/feeds' if no "from" is available

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
  const res = await fetch(`${BASE_URL}/api/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',

  },
  body: JSON.stringify(formData),
});

      const data = await res.json();

      if (res.ok) {
        setSuccess('Login successful!');
        setError('');
 localStorage.setItem('token', data.token); // ✅ Store JWT token


        // Update the user state in AuthContext (to reflect the login status)
        setUser(data.user); // Assuming data.user contains the logged-in user details

        // Redirect to the "from" location (or fallback to '/feeds')
        navigate(from);
      } else {
        setError(data.error || 'Invalid email or password');
        setSuccess('');
      }
    } catch (err) {
      setError('Server error');
      setSuccess('');
    }
  };

  return (
    <main>
      <div><h2>Nearby</h2></div>
      <div className="hero">
        <div className="login-form">
          <h2>Welcome Back</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              placeholder="Enter password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <p><a href="#">Forgot Password?</a></p>
            <button type="submit">Log in</button>
          </form>

          {error && <p style={{ color: 'red' }}>{error}</p>}
          {success && <p style={{ color: 'green' }}>{success}</p>}

          <hr />or<hr />
          <button>Continue with Google</button>
          <button>Continue with Apple</button>
          <p>
            <a href="/register">Don't have an account? Create one!</a>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;
