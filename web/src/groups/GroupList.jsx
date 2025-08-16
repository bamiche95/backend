import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';  // Import Link for routing
import Header from '../components/Header';
import LeftSidebar from '../user/leftSideBar';
import RightSidebar from '../user/RightSideBar';
import Modal from '../components/Modal'; // Import reusable modal
import { BASE_URL, getToken } from '../config';

const token = getToken(); // Base URL for the API calls
import './Modal.css';

const GroupList = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [flashMessage, setFlashMessage] = useState(''); // Flash message state
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [groups, setGroups] = useState([]); // State for the groups fetched from the DB
  const [userGroups, setUserGroups] = useState([]); // State for groups the user is a member of
  const [memberCounts, setMemberCounts] = useState({});

  // Fetch groups from the backend when the component mounts
  useEffect(() => {
    const fetchGroups = async () => {
        try {
          const response = await fetch(`${BASE_URL}/api/getGroups`, {
            method: 'GET',
             headers: {
          authorization: `Bearer ${token}`,
        },
          });
      
          const result = await response.json();
      
          if (response.ok) {
            setGroups(result.groups); // Save the groups
            fetchMemberCounts(result.groups); // ✅ Call this after setting groups
          } else {
            setFlashMessage(result.error || 'Failed to fetch groups');
            setMessageType('error');
          }
        } catch (error) {
          console.error('Error fetching groups:', error);
          setFlashMessage('An unexpected error occurred');
          setMessageType('error');
        }
      };
      

    const fetchUserGroups = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/getUserGroups`, {
          method: 'GET',
          headers: {
          authorization: `Bearer ${token}`,
        }, // Send cookies/session
        });

        const result = await response.json();

        if (response.ok) {
          setUserGroups(result); // Set the user's groups
        } else {
          setFlashMessage(result.error || 'Failed to fetch user groups');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error fetching user groups:', error);
        setFlashMessage('An unexpected error occurred');
        setMessageType('error');
      }
    };

    // Fetch all groups and the user's groups
    fetchGroups();
    fetchUserGroups();
  }, []); // Run once when the component mounts

  const handleCreateGroup = async () => {
    // Validate inputs
    if (!groupName || !groupDescription) {
      setFlashMessage('Please fill out both the group name and description.');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/createGroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Send cookies/session
        body: JSON.stringify({
          group_name: groupName,
          description: groupDescription,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setFlashMessage('Group created successfully!');
        setMessageType('success');
        setGroupName('');
        setGroupDescription('');
        setIsModalOpen(false);
      
        const newGroup = {
          groupid: result.groupId,
          group_name: groupName,
          description: groupDescription
        };
      
        // Add the new group to the list of all groups
        setGroups((prevGroups) => [...prevGroups, newGroup]);
      
        // Add the new group to the user's groups
        setUserGroups((prevUserGroups) => [...prevUserGroups, newGroup]);
      
        // Optionally, initialize member count as 1 (since creator is a member)
        setMemberCounts((prevCounts) => ({
          ...prevCounts,
          [result.groupId]: 1
        }));
      } else {
        setFlashMessage(result.error || 'Failed to create group');
        setMessageType('error');
      }
      
    } catch (error) {
      console.error('Error creating group:', error);
      setFlashMessage('An unexpected error occurred');
      setMessageType('error');
    }

    // Clear flash message after 3 seconds
    setTimeout(() => {
      setFlashMessage('');
      setMessageType('');
    }, 3000);
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/joinGroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Send cookies/session
        body: JSON.stringify({
          group_id: groupId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setFlashMessage('Successfully joined the group!');
        setMessageType('success');
        // After joining, add the group to the user's groups list
        setUserGroups((prevUserGroups) => [
          ...prevUserGroups,
          { groupid: groupId, group_name: result.group_name },
        ]);
      } else {
        setFlashMessage(result.error || 'Failed to join the group');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      setFlashMessage('An unexpected error occurred');
      setMessageType('error');
    }

    // Clear flash message after 3 seconds
    setTimeout(() => {
      setFlashMessage('');
      setMessageType('');
    }, 3000);
  };

  const fetchMemberCounts = async (groups) => {
    for (const group of groups) {
      try {
        const response = await fetch(`${BASE_URL}/api/groupMemberCount/${group.groupid}` , {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
        
        });
        const result = await response.json();
  
        if (response.ok) {
          setMemberCounts((prev) => ({
            ...prev,
            [group.groupid]: result.memberCount,
          }));
        }
      } catch (error) {
        console.error(`Error fetching member count for group ${group.groupid}:`, error);
      }
    }
  };
  
  return (
    <div>

      <div className="container-fluid mt-3">
        <div className="row">
          {/* Left Sidebar */}
          <div className="col-md-3">
            <LeftSidebar />
          </div>

          {/* Main Content */}
          <div className="col-md-6">
            <h2 className="mb-4">All Groups</h2>
            <ul className="list-group">
              {groups.length > 0 ? (
                groups.map((group) => {
                    const isMember = userGroups.some(userGroup => userGroup.groupid === group.groupid);
                
                    return (
                    <li key={group.groupid} className="list-group-item d-flex justify-content-between align-items-center">
                     <span>
                        {/* Use Link component for navigation */}
                        <Link to={`/group/${group.groupid}`} className="fw-bold text-decoration-none text-primary">
                            {group.group_name}
                        </Link>
                        <br />
                        <p style={{ fontSize: '12px', marginBottom: 0 }}>
                            {memberCounts[group.groupid] !== undefined
                            ? `Members: ${memberCounts[group.groupid]}`
                            : 'Loading...'}
                        </p>
                    </span>

                
                        <button
                        className={`btn ${isMember ? 'btn-secondary' : 'btn-success'}`}
                        disabled={isMember}
                        onClick={() => !isMember && handleJoinGroup(group.groupid)}
                        >
                        {isMember ? 'Joined' : 'Join'}
                        </button>
                    </li>
                    );
                })
  
              ) : (
                <p>No groups found.</p>
              )}
            </ul>
          </div>

          {/* Right Sidebar */}
          <div className="col-md-3">
            <div className="card p-3">
              <button
                className="btn btn-primary mb-3 w-100"
                onClick={() => setIsModalOpen(true)}
              >
                + Create Group
              </button>
              <h5>Your Groups</h5>
              <ul className="list-group mt-2">
                {userGroups.length > 0 ? (
                  userGroups.map((group) => (
                    <li key={group.groupid} className="list-group-item">
                      {group.group_name}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">You are not a member of any groups.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Flash Message */}
      {flashMessage && (
        <div className={`flash-message ${messageType}`}>
          {flashMessage}
        </div>
      )}

      {/* Modal for Create Group */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a New Group">
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <textarea
          className="form-control mb-3"
          placeholder="Group description"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          rows={4}
        />
        <div className="d-flex justify-content-end">
          <button className="btn btn-secondary me-2" onClick={() => setIsModalOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCreateGroup}>
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default GroupList;
