import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Bell, Users, User, PlusCircle } from 'lucide-react';


const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <div className="nav-links">
        <NavLink to="/feeds" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Home className="h-6 w-6" />
          <span>Home</span>
        </NavLink>

        <NavLink to="/groups" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users className="h-6 w-6" />
          <span>Groups</span>
        </NavLink>

        {/* Floating Action Button */}
        <div className="fab-container">
          <NavLink to="/create-post" className="fab-button">
            <PlusCircle className="h-8 w-8" />
          </NavLink>
        </div>

        <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Bell className="h-6 w-6" />
          <span>Alerts</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <User className="h-6 w-6" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
