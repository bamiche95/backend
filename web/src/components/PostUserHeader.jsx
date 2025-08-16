const UserHeader = ({ user, currentUser, closeModal }) => {
  return (
    <div className="modal-header">
      <div className="user-info">
        
          <div className="d-flex align-items-center gap-2">
            <img src={`${user.profilePic}`} alt="profile" className="profile-pic" />
              <span>{currentUser ? <span className="name">{currentUser.name}</span> : 'Loading...'}</span>

          </div>
    
      
      </div>
     
    </div>
  );
};

export default UserHeader;
