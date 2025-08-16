// components/AuthenticatedLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

const AuthenticatedLayout = () => {
  return (
    <>
      <Header /> {/* One global header only */}
      <div className="container-fluid pt-3 pb-5 min-vh-100">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
};

export default AuthenticatedLayout;
