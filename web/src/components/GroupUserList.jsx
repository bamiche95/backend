import React, { useEffect, useState } from 'react';
import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication
const GroupUserList = ({ groupId }) => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [manageUserMessage, setManageUserMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 50;

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`${BASE_URL}/api/getgroupUserList/${groupId}/users?page=${page}&limit=${limit}`, {
         headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

      });
      const data = await res.json();
      setUsers(data.users);
      setTotalUsers(data.total);
    };

    fetchUsers();
  }, [groupId, page]);

  const totalPages = Math.ceil(totalUsers / limit);

  const handleMakeAdmin = async (userId) => {
    const response = await fetch(`${BASE_URL}/api/makeGroupadmin/${groupId}/user/${userId}/makeAdmin`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    setManageUserMessage(response.ok ? 'User promoted to admin!' : data.error || 'Failed to promote user');
  };

  const handleDemoteAdmin = async (userId) => {
    const response = await fetch(`${BASE_URL}/api/demoteGroupAdmin/${groupId}/user/${userId}`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    setManageUserMessage(response.ok ? 'User demoted to member!' : data.error || 'Failed to demote user');
  };

  const handleRemoveUserClick = (userId) => {
    setUserToRemove(userId);
    setShowConfirmModal(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;
    const response = await fetch(`${BASE_URL}/api/removeUserFromGroup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId: userToRemove, groupId }),
    });
    const data = await response.json();
    if (response.ok) {
      setUsers(prev => prev.filter(user => user.userid !== userToRemove));
      setManageUserMessage('User removed from group!');
    } else {
      setManageUserMessage(data.error || 'Failed to remove user');
    }
    setShowConfirmModal(false);
    setUserToRemove(null);
  };

  // Filter users based on search query
  const filteredUsers = [...users]
  .filter(user =>
    user.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });


  return (
    <>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search users by name or username"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div>
        {filteredUsers.map(user => (
          <div key={user.userid} className="manage-user-card d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
            <div className="d-flex align-items-center">
              <img
                src={user.profile_picture || '/default-profile.jpg'}
                alt="Profile"
                className="rounded-circle border"
                style={{ width: '50px', height: '50px', marginRight: '15px' }}
              />
              <div>
                <h6>
                  {user.firstname} {user.lastname}
                  {user.role === 'admin' ? (
                    <span className="badge bg-primary ms-2">Admin</span>
                  ) : (
                    <span className="badge bg-secondary ms-2">Member</span>
                  )}
                </h6>
                <span className='badge rounded-pill bg-secondary'>@{user.username}</span>
              </div>
            </div>
            <div className="dropdown">
              <a href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="bi bi-three-dots"></i>
              </a>
              <ul className="dropdown-menu">
                {user.role === 'member' ? (
                  <li><button className="dropdown-item" onClick={() => handleMakeAdmin(user.userid)}>Make Admin</button></li>
                ) : (
                  <li><button className="dropdown-item" onClick={() => handleDemoteAdmin(user.userid)}>Demote to Member</button></li>
                )}
                <li><button className="dropdown-item text-danger" onClick={() => handleRemoveUserClick(user.userid)}>Remove User</button></li>
              </ul>
            </div>
          </div>
        ))}

        <div className="d-flex justify-content-between mt-3">
          <button className="btn btn-outline-primary" disabled={page === 1} onClick={() => setPage(prev => prev - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-outline-primary" disabled={page === totalPages} onClick={() => setPage(prev => prev + 1)}>Next</button>
        </div>

        {manageUserMessage && <div className="mt-3 alert alert-success">{manageUserMessage}</div>}
      </div>

      {/* Custom Modal */}
      {showConfirmModal && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Removal</h5>
              <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove this user from the group?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmRemoveUser}>Remove</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-modal-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1050;
        }
        .custom-modal {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 100%;
          padding: 1rem;
          box-shadow: 0 5px 15px rgba(0,0,0,.5);
        }
      `}</style>
    </>
  );
};

export default GroupUserList;
