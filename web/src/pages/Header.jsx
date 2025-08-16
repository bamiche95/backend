// src/components/Header.jsx

import React from 'react';
import { Link } from 'react-router-dom';


const Header = () => {
  return (
    <header className='homeHeader'>
    <div>
        <h2>Nearby</h2>
    </div>

    <div className="index-menu-items">
        <ul>
         
           
            <li><Link to="/">Neighbours</Link></li>
            <li><Link to="/">What is new?</Link></li>
        </ul>
    </div>

    <div>
    <Link to="/login">
          <button className="login-button">Log in</button>
        </Link>
    </div>
</header>

  );
};

export default Header;
