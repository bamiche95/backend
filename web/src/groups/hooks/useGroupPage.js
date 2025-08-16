import { useState, useEffect } from 'react';
import { BASE_URL, getToken } from '../../config'; // Adjust the import path as necessary
import { useFlashMessage } from '../../context/FlashMessageContext'; // Import the context
import { useAuth } from '../../context/AuthContext'; // Import the AuthContext
const useGroupPage = (groupId) => {
  const [group, setGroup] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [postCount, setPostCount] = useState(null);
  const [memberCount, setMemberCount] = useState(null);
  const { setFlashMessage } = useFlashMessage(); // Get setFlashMessage from context
  const { isAuthenticated } = useAuth(); // Get authentication status from AuthContext

  const token = getToken();

  const checkMembershipStatus = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/checkMembership`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsMember(result.isMember); // Update membership status
      } else {
        console.error('Error checking membership:', result.error);
      }
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };
  
  useEffect(() => {
    if (!groupId) return;

    const fetchGroupData = async () => {
      try {
        const [groupRes, userGroupsRes] = await Promise.all([
          fetch(`${BASE_URL}/api/getGroup/${groupId}`, {
            method: 'GET',
            headers: {
              authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BASE_URL}/api/getUserGroups`, {
            method: 'GET',
            headers: {
              authorization: `Bearer ${token}`,
            },
          })
        ]);
  
        const groupData = await groupRes.json();
        const userGroups = await userGroupsRes.json();
  
        if (groupRes.ok) {
          setGroup(groupData);
          setIsAdmin(groupData.isAdmin);
        } else {
          setError(groupData.error || 'Failed to fetch group details');
        }
  
        if (userGroupsRes.ok) {
          const member = userGroups.some(g => g.groupid === groupId);
          setIsMember(member);
        } else {
          setError(userGroups.error || 'Failed to check group membership');
        }
      } catch (error) {
        console.error('Error fetching group or user groups:', error);
        setError('An unexpected error occurred');
      }
    };

    fetchGroupData();
  }, [groupId]);

  

  const handlePostSubmit = async () => {
    if (!content && mediaFiles.length === 0) {
      setError('Content or media is required');
      return;
    }

    const formData = new FormData();
    formData.append('content', content);
    mediaFiles.forEach((file) => {
      formData.append('media', file);
    });

    try {
      const response = await fetch(`${BASE_URL}/api/creategrouppost/${groupId}/post`, {
        method: 'POST',
        body: formData,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setContent('');
        setMediaFiles([]);
        setIsModalOpen(false);
      } else {
        setError(result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      setError('An unexpected error occurred while submitting the post');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleRemoveFile = (index) => {
    setMediaFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setPostToEdit(null);
    setIsEditing(false);
  };
  
  const handleUpdatePost = async (post) => {
    const formData = new FormData();
    formData.append('content', content);
    mediaFiles.forEach((file) => formData.append('media', file));
  
    try {
      const response = await fetch(`${BASE_URL}/api/updatePost/${post._id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
  
      const result = await response.json();
  
      if (response.ok) {
        const updatedPosts = posts.map(p => p._id === post._id ? result.updatedPost : p);
        setPosts(updatedPosts);
        closeModal();
      } else {
        alert(result.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('An unexpected error occurred while updating the post');
    }
  };
  

  // Function to handle leaving the group
    const handleJoinGroup = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/joinGroup`, {
        method: 'POST',
     
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      const data = await response.json();

      if (response.ok) {
        setFlashMessage({
          type: 'success',
          message: 'You have joined the group.',
        });
        setIsMember(true); // Update isMember immediately after joining
        checkMembershipStatus(); // Now this function is accessible
      } else {
        setFlashMessage({
          type: 'error',
          message: data.error || 'Failed to join the group',
        });
      }
    } catch (err) {
      console.error('Join group error:', err);
      setFlashMessage({
        type: 'error',
        message: 'An unexpected error occurred.',
      });
    }
  };

  
// Function to handle group deletion

// inside the component


  
  const handleLeaveGroup = async () => {
    setIsMember(false); // Optimistically update state
    try {
      const response = await fetch(`${BASE_URL}/api/leaveGroup`, {
        method: 'POST',
        
         headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      const data = await response.json();

      if (response.ok) {
        setFlashMessage({
          type: 'success',
          message: 'You have left the group.',
        });
        checkMembershipStatus(); // Re-check membership status after leaving
      } else {
        setIsMember(true); // Revert if the leave action fails
        const errorMessage = data.error || 'Failed to leave the group';
        setFlashMessage({
          type: 'error',
          message: errorMessage,
        });
      }
    } catch (err) {
      console.error('Leave group error:', err);
      setIsMember(true); // Revert if there's an error
      setFlashMessage({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  useEffect(() => {
    if (isAdmin && groupId) {
      fetch(`${BASE_URL}/api/grouppostcount/${groupId}/postCount`)
        .then(res => res.json())
        .then(data => setPostCount(data.postCount))
        .catch(err => console.error('Failed to fetch post count:', err));
    }
  }, [groupId, isAdmin]);

  useEffect(() => {
    if (isAdmin && groupId) {
      fetch(`${BASE_URL}/api/groupMemberCount/${groupId}`)
        .then(res => res.json())
        .then(data => setMemberCount(data.memberCount))
        .catch(err => console.error('Failed to fetch post count:', err));
    }
  }, [groupId, isAdmin]);

  

  return {
    group,
    isAdmin,
    isMember,
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
    handleUpdatePost,
    postToEdit,
    setPostToEdit,
    isEditing,
    setIsEditing,
    postCount,
    memberCount,
    setMemberCount,
    checkMembershipStatus,
  };
};

export default useGroupPage;
