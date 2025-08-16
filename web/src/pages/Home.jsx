// src/pages/Home.jsx
import React from 'react';
import Header from '../pages/header';
import Footer from '../pages/Footer';
import RegistrationForm from '../pages/RegistrationForm'; 


const Home = () => {
  return (
    <div>
      {/* Import and include the Header */}
      <Header />

      {/* Body content */}
      <main>
        {/* Hero Section with Registration Form */}
        <div className="hero"
       
        >
          <div className="login-form">
            <h2>Discover your neighbourhood</h2>
            <button>Continue with Google</button>
            <button>Continue with Apple</button>

            <hr />
            or
            <hr />

            {/* Registration Form */}
            <RegistrationForm />
            <p>
              By signing up, you agree to our Privacy Policy, Cookie Policy, and Member Agreement.
            </p>
          </div>
        </div>

        {/* Other Sections */}
        <div className="other-section">
          <div>
            <h2>Get the most out of your neighbourhood with Nextdoor</h2>
          </div>
          <div>
            <p>
              It's where communities come together to greet newcomers, exchange recommendations, and read the latest local news. Where neighbours support local businesses and get updates from public services. Where neighbours borrow tools and sell sofas. It's how to get the most out of everything nearby. Welcome, neighbour.
            </p>
          </div>
        </div>

        {/* Points Section */}
        <div className="points">
          <div className="point">
            <i className="fa-solid fa-mobile-screen-button"></i>
            <h4>Essential</h4>
            <p>Relevant news and information from neighbours, businesses, and public agencies in real time.</p>
          </div>

          <div className="point">
            <i className="fa-solid fa-mobile-screen-button"></i>
            <h4>Essential</h4>
            <p>Relevant news and information from neighbours, businesses, and public agencies in real time.</p>
          </div>

          <div className="point">
            <i className="fa-solid fa-mobile-screen-button"></i>
            <h4>Essential</h4>
            <p>Relevant news and information from neighbours, businesses, and public agencies in real time.</p>
          </div>
        </div>
      </main>

      {/* Import and include the Footer */}
      <Footer />
    </div>
  );
};

export default Home;
