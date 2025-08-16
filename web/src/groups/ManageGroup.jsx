
import React, { useState, useEffect } from 'react';
import './ManageGroup.css'; // Assuming you have some CSS for styling
import { BASE_URL, getToken } from '../config';

const token = getToken(); // Adjust the path if needed
import GroupUserList from '../components/GroupUserList'; // Adjust the path if needed
import AddUserToGroup from '../components/AddUserToGroup'; // Adjust the path if needed
const ManageGroup = ({ groupId, isAdmin }) => {
  // Here you could fetch or handle group-related logic
const [activeTab, setActiveTab] = useState('Banner');
const [bannerFile, setBannerFile] = useState(null);
const [uploading, setUploading] = useState(false);
const [uploadMessage, setUploadMessage] = useState('');
const [bannerPreview, setBannerPreview] = useState(null);
const [groupName, setGroupName] = useState('');
const [groupDescription, setGroupDescription] = useState('');
const [updateMessage, setUpdateMessage] = useState('');

const handleGroupUpdate = async () => {
  if (!groupName.trim() || !groupDescription.trim()) {
    setUpdateMessage('Group name and description cannot be empty');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/updateGroupDetails`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        groupId,
        groupName,
        groupDescription
      })
    });

    const result = await response.json();
    if (response.ok) {
      setUpdateMessage('Group details updated successfully!');
    } else {
      setUpdateMessage(result.error || 'Failed to update group');
    }
  } catch (err) {
    console.error('Update error:', err);
    setUpdateMessage('An error occurred while updating.');
  }
};


const handleTabClick = (tab) => {
    setActiveTab(tab);
  };


  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    setBannerFile(file);
    setUploadMessage('');
  
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setBannerPreview(null);
    }
  };
  
  const handleBannerUpload = async () => {
    if (!bannerFile) {
      setUploadMessage('Please select a file first.');
      return;
    }
  
    const formData = new FormData();
    formData.append('banner', bannerFile);
  
    try {
      setUploading(true);
      const response = await fetch(`${BASE_URL}/api/groupbanner/${groupId}/banner`, {
        method: 'POST',
         headers: {
          authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      const result = await response.json();
  
      if (response.ok) {
        setUploadMessage('Banner uploaded successfully!');
        handleRemoveBannerPreview(); // ✅ Clear preview & input
      } else {
        setUploadMessage(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Banner upload error:', err);
      setUploadMessage('An error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };
  

  const handleRemoveBannerPreview = () => {
    setBannerPreview(null);
    setBannerFile(null);
    document.getElementById('groupBanner').value = ''; // Reset file input
  };
  

  return (
    <>
      <p>Manage your group settings here.</p>
      

   




      <div className="manage-group-container">
            <div className="tabs d-flex justify-content-around mb-3">
              <div className={`tab ${activeTab === 'Banner' ? 'active' : ''}`} onClick={() => handleTabClick('Banner')}>
                <i className="bi bi-star"></i> Banner
              </div>
              <div className={`tab ${activeTab === 'Group' ? 'active' : ''}`} onClick={() => handleTabClick('Group')}>
                <i className="bi bi-fire"></i> Group
              </div>
              <div className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabClick('users')}>
                <i className="bi bi-person"></i> users
              </div>
             
            


            </div>

            {/* Tab Content */}
            <div className={`tab-content ${activeTab === 'Banner' ? 'active' : ''}`}>
            <div className="form-group">
                <label htmlFor="groupBanner">Change Group Banner</label>
                <input
                  type="file"
                  className="form-control"
                  id="groupBanner"
                  accept="image/*"
                  onChange={handleBannerChange}
                />
                {bannerPreview && (
                  <div className="mt-3 position-relative d-inline-block">
                    <img
                      src={bannerPreview}
                      alt="Banner Preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                    />
                    <button
                      onClick={handleRemoveBannerPreview}
                      className="btn btn-sm btn-danger position-absolute"
                      style={{ top: '5px', right: '5px', borderRadius: '50%' }}
                      aria-label="Remove preview"
                    >
                      ×
                    </button>
                  </div>
                )}


                <button
                  className="btn btn-secondary mt-2"
                  onClick={handleBannerUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                {uploadMessage && <div className="mt-2 alert alert-info">{uploadMessage}</div>}
              </div>

            </div>

            <div className={`tab-content ${activeTab === 'Group' ? 'active' : ''}`}>
            <div className='card shadow-sm p-3 mb-3'>
            <div className="form-group mt-3">
                <label htmlFor="groupName">Change Group Name</label>
                <input
                type="text"
                className="form-control"
                id="groupName"
                placeholder="Enter new group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <textarea
                className="form-control"
                id="groupDescription"
                rows="3"
                placeholder="Enter group description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              ></textarea>
              <button className="btn btn-primary mt-2" onClick={handleGroupUpdate}>
                Save Changes
              </button>
              {updateMessage && <div className="mt-2 alert alert-info">{updateMessage}</div>}

            </div>
        </div>
            </div>
            <div className={`tab-content ${activeTab === 'users' ? 'active' : ''}`}>
            <div className='card shadow-sm p-3 mb-3'>
            {isAdmin &&<AddUserToGroup groupId={groupId} /> }
            </div>
            <div className='card shadow-sm p-3  justify-content-between '>
                <p>Manage Users</p>
                
                {isAdmin && <GroupUserList groupId={groupId} />}    
            </div>
            </div>
            
          </div>

    </>
  );
};

export default ManageGroup;
