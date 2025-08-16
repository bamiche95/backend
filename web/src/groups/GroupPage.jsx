import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import LeftSidebar from '../user/leftSideBar';
import RightSidebar from '../user/RightSideBar';
import { BASE_URL, getToken } from '../config';

const token = getToken();
import AllFeeds from '../user/AllFeeds';
import Modal from '../components/Modal'; // Import Modal component
import useGroupPage from './hooks/useGroupPage'; 
import CreatePost from '../user/CreatePost'; 
import ManageGroup from './ManageGroup'; // Import ManageGroup modal
import { socket } from '../user/Socket'; // Import socket
import Lightbox from '../components/Lightbox';
import { useNavigate } from 'react-router-dom'; // at the top
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import GroupFeed from '@/components/GroupFeed'; // Import GroupFeed component
import CreateGroupPost from '../components/CreateGroupPost'; // Correct PascalCase import


const GroupPage = () => {
  const [postToEdit, setPostToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [bannerImage, setBannerImage] = useState(null); // New state for banner image
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupName, setGroupName] = useState('');
const [groupDescription, setGroupDescription] = useState('');
  const navigate = useNavigate();
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [flashMessage, setFlashMessage] = useState(null);
const { user } = useAuth(); // Get user info from context
  const { groupId } = useParams();
  const {
    group,
    isAdmin,
    error,
    posts,
    setPosts,
    loading,
    setLoading,
    isModalOpen,
    openModal,
    closeModal,
    content,
    setContent,
    mediaFiles,
    handleFileChange,
    handleRemoveFile,
    handlePostSubmit,
    handleLeaveGroup,
    handleJoinGroup,
    postCount,
    memberCount,
    fetchGroupData,
   
  } = useGroupPage(groupId);


  const [isMember, setIsMember] = useState(false);
  const [isManageGroupModalOpen, setIsManageGroupModalOpen] = useState(false); // State to control Manage Group modal

useEffect(() => {
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });

  return () => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('error');
  };
}, []);


  useEffect(() => {
    if (!groupId) return;
  
    const checkMembershipStatus = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/checkMembership`, {
          method: 'POST',
         
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ group_id: groupId }),
        });
  
        const result = await response.json();
        if (response.ok) {
          setIsMember(result.isMember);
        } else {
          console.error('Error checking membership:', result.error);
        }
      } catch (error) {
        console.error('Error checking membership:', error);
      }
    };
  
    checkMembershipStatus();
  }, [groupId, isMember]);

  const openLightbox = (items, index) => {
    setMediaItems(items);
    setCurrentIndex(index);
    setLightboxOpen(true);
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };




  useEffect(() => {
    // Join WebSocket room for this group
    socket.emit('joinGroup', groupId);
  
    // Fetch group banner on mount or when groupId changes
    fetch(`${BASE_URL}/api/groupbanner/${groupId}/banner`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const cacheBuster = Date.now();
        setBannerImage(`${data.banner_image}?v=${cacheBuster}`);
      })
      .catch(err => console.error('Failed to fetch group', err));
  
    // Listen for `groupUpdated` socket events
    socket.on('groupUpdated', ({ groupId: updatedId, bannerImage }) => {
      if (parseInt(updatedId) === parseInt(groupId)) {
        console.log('🎯 Received banner update:', bannerImage);
        const cacheBuster = Date.now();
        setBannerImage(`${bannerImage}?v=${cacheBuster}`);
      }
    });
  
    return () => {
      socket.off('groupUpdated');
    };
  }, [groupId]);
  
  useEffect(() => {
    const stringGroupId = groupId.toString();
   // console.log("🔗 Joining groupDetails room:", stringGroupId);
    socket.emit('joinGroupDetails', stringGroupId);
  
    fetch(`${BASE_URL}/api/groupdetails/${stringGroupId}`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setGroupName(data.groupName);
        setGroupDescription(data.groupDescription);
      });
  
    socket.on('groupDetailsUpdated', ({ groupId: updatedId, groupName, groupDescription }) => {
      console.log("📡 Received socket update:", updatedId, groupName, groupDescription);
      if (updatedId.toString() === stringGroupId) {
        setGroupName(groupName);
        setGroupDescription(groupDescription);
      }
    });
  
    return () => {
      socket.off('groupDetailsUpdated');
    };
  }, [groupId]);
  

  useEffect(() => {
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });
  
    return () => socket.off('connect');
  }, []);


  if (!groupId) {
    return <p>Error: Group ID is missing or invalid.</p>;
  }

  if (error) return <p>Error: {error}</p>;
  if (!group) return <p>Loading group info...</p>;

  const handleManageGroupClick = () => {
    setIsManageGroupModalOpen(true); // Open the Manage Group modal
  };

  const handleManageGroupClose = () => {
    setIsManageGroupModalOpen(false); // Close the Manage Group modal
  };

  // Function to handle group deletion

  const confirmDeleteGroup = async () => {
      console.log("🚨 Confirming delete...");
  try {
    const response = await fetch(`${BASE_URL}/api/deletegroup/${groupId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.ok) {
      setFlashMessage({
        type: 'success',
        message: 'Group deleted successfully.',
      });
      navigate('/groups');
    } else {
      setFlashMessage({
        type: 'error',
        message: result.error || 'Failed to delete the group',
      });
    }
  } catch (error) {
    console.error("Error deleting group:", error);
    setFlashMessage({
      type: 'error',
      message: 'An unexpected error occurred while deleting the group.',
    });
  }
};

  const handleDeleteGroup = () => {
     console.log('🧨 Delete Group button clicked');
  setShowDeleteModal(true); // Now this only shows the modal
};



  return (
    <div>
 
      <div className="container mt-5 mb-5">
        <div className="row align-items-start">
          {/* Left Sidebar */}
          <div className="col-md-3">
            <LeftSidebar />
          </div>

          {/* Main Content */}
          <div className="col-md-6">
            <div className="card shadow-sm p-3">
           
            <img
              src={
                bannerImage ||
                `https://imgenerate.com/generate?width=700&height=300&bg=1e3a8a&text_color=ffffff&font_size=24&angle=0&text=${group.group_name}`
              }
              alt="Group Banner"
              className="img-fluid cursor-pointer"
              onClick={() => openLightbox([bannerImage], 0)}

            />

          {lightboxOpen && (
            <Lightbox
              mediaItems={mediaItems}
              currentIndex={currentIndex}
              onClose={() => setLightboxOpen(false)}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}


              <div className="groupBannerFooter">
                <div className="groupBannerInfo">
                  <h5>{groupName || group.group_name}</h5>
                  <p>{groupDescription || group.description}</p>

                  
                  
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn dropdown-toggle inviteBtn"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Invite
                  </button>
                  <ul className="dropdown-menu">
                    <li><a className="dropdown-item" href="#">Action</a></li>
                    <li><a className="dropdown-item" href="#">Another action</a></li>
                    <li><a className="dropdown-item" href="#">Something else here</a></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><a className="dropdown-item" href="#">Separated link</a></li>
                  </ul>
                </div>

                <div className="groupBannerContainer">
                  {isMember ? (
                    <button
                      className="groupBannerBtn"
                      id="leaveGroupBtn"
                      onClick={handleLeaveGroup}
                    >
                      <i className="bi bi-dash-lg"></i>&nbsp;Leave Group
                    </button>
                  ) : (
                    <button
                      className="groupBannerBtn"
                      id="joinGroupBtn"
                      onClick={handleJoinGroup}
                    >
                      <i className="bi bi-plus-lg"></i>&nbsp;Join Group
                    </button>
                  )}

                  <button className="groupBannerBtn" onClick={openModal}>
                    <i className="bi bi-plus-lg"></i>&nbsp;Post
                  </button>
                  {isAdmin && (
                    <button className="groupBannerBtn btn btn-danger" onClick={handleDeleteGroup}>
                      <i className="bi bi-trash"></i>&nbsp;Delete Group
                    </button>
                  )}
                  

                </div>
              </div>
            </div>

            {/* Admin-specific info */}
            {isAdmin && (
              <div className="card shadow-sm p-3 mt-3">
                <h5>Hi, Admin</h5>
                <div className="container">
                  <div className="row row-cols-2">
                    <div className="col">
                      <strong>Posts:</strong> {postCount !== null ? postCount : '...'}
                    </div>
                    <div className="col">
                      <strong>Members:</strong> {memberCount !== null ? memberCount: '...'}
                    </div>
                    <div className="col">
                      <strong>Blocked Members:</strong> (coming soon)
                    </div>
                    <div className="col">
                      <button className="btn btn-primary" onClick={handleManageGroupClick}>
                        <i className="bi bi-plus-lg"></i>&nbsp;Manage Group
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts Section */}
            <div className="card shadow-sm p-3 mt-3">
              <h5>Posts</h5>
       <GroupFeed
       groupId={groupId}
       />
     
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-md-3">
            <RightSidebar />
          </div>
        </div>

        {/* Modal for Create Post */}
          <CreateGroupPost open={isModalOpen} onClose={closeModal} userId={user.id} groupId={groupId} />

        {/* Modal for Manage Group */}
        <Modal isOpen={isManageGroupModalOpen} onClose={handleManageGroupClose} title="Manage Group">
  <ManageGroup
    closeModal={handleManageGroupClose}
    groupId={groupId}
    isAdmin={isAdmin}
    setIsMember={setIsMember}
  />
</Modal>

        {/* Modal for Delete Group Confirmation */}
<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Group Deletion">
  <p>This action cannot be undone. Are you sure you want to delete this group?</p>
  <div className="d-flex justify-content-end mt-4">
    <button className="btn btn-secondary me-2" onClick={() => setShowDeleteModal(false)}>
      Cancel
    </button>
    <button className="btn btn-danger" onClick={() => {
      setShowDeleteModal(false);
      confirmDeleteGroup();
    }}>
      Delete
    </button>
  </div>
</Modal>
 


      </div>
    </div>
  );
};

export default GroupPage;
