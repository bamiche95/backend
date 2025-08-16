import React from 'react';
import { Link } from 'react-router-dom';
import {useNotificationCount} from '@/context/NotificationCountContext';
import { useUnreadMessageCount } from '@/context/UnreadMessageCountContext';


const LeftSidebar = ({ onCreateGroupClick }) => {

  const {count} = useNotificationCount();
  const { unreadCount } = useUnreadMessageCount();

  return (
    <div className="left-sidebar">
      {/* Main Navigation Links */}
      <div>
        <ul>
          <li>
            <Link to="/feeds"><i className="bi bi-house-door"></i> Home</Link>
          </li>
          <li>
            <Link to="/sale-free"><i className="bi bi-tag"></i> Sell or give Free</Link>
          </li>
          <li>
            <Link to="/InboxPage"><i className="bi bi-chat-dots"></i> Chats {unreadCount > 0 && <span style={{
              backgroundColor: 'coral',
              padding: '5px',
              borderRadius: '50%',
              color: 'white'
            }}>{unreadCount}</span>}</Link>
          </li>
          <Link to="/notifications" className="notification-link">
      <i className="bi bi-bell"></i> Notifications{' '}
      {count > 0 && <span style={{
        backgroundColor: 'coral',
        padding: '5px',
        borderRadius:'50%',
        color: 'white'
      }}>{count}</span>}
    </Link>
          <li>
          <Link to="/groups"><i className="bi bi-people-fill"></i> Groups</Link>

          </li>
          
          <li>
            <Link to="/events"><i className="bi bi-calendar-event"></i> Events</Link>
          </li>
          <li>
            <Link to="#"><i className="bi bi-person-walking"></i> Invite neighbours</Link>
          </li>
        </ul>
      </div>

      {/* Post Button */}
      <div>
        <button className="post-btn">Post</button>
      </div>

      {/* Settings and Help Links */}
      <div className="second-li">
        <ul>
          <li>
            <Link to="#"><i className="bi bi-gear-fill"></i> Settings</Link>
          </li>
          <li>
            <Link to="#"><i className="bi bi-info-circle-fill"></i> Help & Support</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LeftSidebar;
