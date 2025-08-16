import React from 'react';
import { Link } from 'react-router-dom';
import '@/user/Profile.css'
import {
  House,
  ShoppingCart,
  MessageSquareMore,
  BellRing,
  UsersRound,
  CalendarClock,
  BadgeInfo,
  Cog
} from 'lucide-react';
import { Button } from 'bootstrap';

const SidebarMenu = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height:'90vh', marginTop:'40px'}}>
      <div>
        <ul className='ul-items'>
          <li >
            <Link to="/feeds" className='link-items'><House strokeWidth={1.25} />Home</Link>
          </li>
          <li>
            <Link to="/sale-free" className='link-items'><ShoppingCart strokeWidth={1.25} /> Sell or give Free</Link>
          </li>
          <li>
            <Link to="/InboxPage" className='link-items'><MessageSquareMore strokeWidth={1.25} /> Chats</Link>
          </li>
          <li>
            <Link to="/user/notifications" className="notification-link">
              <BellRing strokeWidth={1.25} /> Notifications
            </Link>
          </li>
          <li>
            <Link to="/groups" className='link-items'><UsersRound strokeWidth={1.25} /> Groups</Link>
          </li>
          <li>
            <Link to="#" className='link-items'><CalendarClock strokeWidth={1.25} /> Events</Link>
          </li>
          <li>
            <Link to="#" className='link-items'><UsersRound strokeWidth={1.25} /> Invite neighbours</Link>
          </li>
        </ul>
      </div>

      <div style={{}}>
        <ul className='ul-items'>
          <li>
            <Link to="#" className='link-items'><BadgeInfo strokeWidth={1.25} /> Help & Support</Link>
          </li>
          <li>
            <Link to="#" className='link-items'><Cog strokeWidth={1} /> Settings</Link>
          </li>
        </ul>
      </div>

      <div style={{padding: '20px', borderRadius:'8px', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', margin:'20px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignContent: 'center'}}>
            <h5>Events near you</h5>
            <button>+ Add</button>
            
            </div>

      </div>
    </div>
  );
};

export default SidebarMenu;
