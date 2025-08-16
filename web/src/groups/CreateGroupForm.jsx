import React, { useState, useEffect } from 'react';
import { BASE_URL, getToken } from '../config';

const token = getToken();
import './Modal.css'; // Optional for custom styling



const CreateGroupForm = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Close the modal automatically if it's opened
    if (isOpen) {
      const modalElement = document.getElementById('createGroupModal');
      const modal = new window.bootstrap.Modal(modalElement);
      modal.show();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName || !description) {
      setMessage('Both group name and description are required');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/createGroup`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ group_name: groupName, description }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error creating group');
      console.error('Error:', error);
    }
  };

  // Close the modal when it's closed in React state
  const handleClose = () => {
    onClose();
    const modalElement = document.getElementById('createGroupModal');
    const modal = new window.bootstrap.Modal(modalElement);
    modal.hide();
  };

  return (
    <div
      className={`modal fade ${isOpen ? 'show' : ''}`}
      id="createGroupModal"
      tabIndex="-1"
      aria-labelledby="createGroupModalLabel"
      aria-hidden={!isOpen}
      style={{ display: isOpen ? 'block' : 'none' }} // Bootstrap modal display override for React
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="createGroupModalLabel">Create a New Group</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="groupName" className="form-label">Group Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  className="form-control"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Create Group</button>
            </form>
            {message && <p className="mt-3">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupForm;
