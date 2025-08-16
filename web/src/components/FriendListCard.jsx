import React from 'react';

const FriendListCard = ({ title = "Your friends", onSeeAllClick, friends = [] }) => {
  return (
    <div className="friend-list-card" style={{ padding: '20px', borderRadius: '8px',  boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', marginBottom: '20px'  }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h5>{title}</h5>
        <span
          style={{ fontSize: '12px', color: '#888', cursor: onSeeAllClick ? 'pointer' : 'default' }}
          onClick={onSeeAllClick}
        >
          see all
        </span>
      </div>

      {/* Friends Avatars Section */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {friends.length > 0 ? (
          friends.map((friend, index) => (
            <img
              key={friend.id || index} // Use a unique ID if available, otherwise index (less ideal for dynamic lists)
              src={friend.imageUrl}
              alt={friend.name || `Friend ${index + 1}`}
              style={{
                borderRadius: '50%',
                marginRight: '10px',
                width: '80px',
                height: '80px',
                flexShrink: 0, // Prevent images from shrinking in flex container
                objectFit: 'cover' // Ensure images cover the area without distortion
              }}
            />
          ))
        ) : (
          <p style={{ color: '#666', fontSize: '0.9em' }}>No friends to display yet.</p>
        )}
        
        {/* Placeholder images if no 'friends' prop is passed or it's empty */}
        {friends.length === 0 && (
            <>
                <img src="https://picsum.photos/id/1005/80/80" alt="Friend 1" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
                <img src="https://picsum.photos/id/1011/80/80" alt="Friend 2" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
                <img src="https://picsum.photos/id/1012/80/80" alt="Friend 3" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
                <img src="https://picsum.photos/id/1015/80/80" alt="Friend 4" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
                <img src="https://picsum.photos/id/1018/80/80" alt="Friend 5" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
                <img src="https://picsum.photos/id/1019/80/80" alt="Friend 6" style={{ borderRadius: '50%', marginRight: '10px', width: '80px', height: '80px', flexShrink: 0, objectFit: 'cover' }} />
            </>
        )}
      </div>
    </div>
  );
};

export default FriendListCard;