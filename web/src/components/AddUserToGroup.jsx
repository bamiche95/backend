import React, { useState } from 'react';
import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication

const AddUserToGroup = ({ groupId }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedUser(null);
    setMessage('');

    if (value.length > 1) {
      try {
        const res = await fetch(`${BASE_URL}/api/searchUsers?q=${value}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Search failed:', err);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (user) => {
    setSelectedUser(user);
    setQuery(`${user.firstname} ${user.lastname} (${user.email})`);
    setSuggestions([]);
  };

  const handleAddUser = async () => {
    if (!selectedUser) {
      setMessage('Please select a user to add.');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/addUserToGroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser.userid,
          groupId,
          role: 'member',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('User added to group!');
        setQuery('');
        setSelectedUser(null);
      } else {
        setMessage(data.error || 'Error adding user.');
      }
    } catch (err) {
      console.error('Add user failed:', err);
      setMessage('Error adding user.');
    }
  };

  return (
    <div className="add-user-to-group">
      <p>Add User to Group</p>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search by email or username"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions list-group mt-2">
          {suggestions.map(user => (
            <li
              key={user.userid}
              onClick={() => handleSelect(user)}
              className="list-group-item list-group-item-action"
              style={{ cursor: 'pointer' }}
            >
              {user.firstname} {user.lastname} ({user.email})
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-primary mt-2" onClick={handleAddUser}>
        Add User
      </button>
      {message && <div className="alert alert-info mt-2">{message}</div>}
    </div>
  );
};

export default AddUserToGroup;
