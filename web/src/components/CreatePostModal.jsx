import React, { useState } from "react";
import {BASE_URL, getToken } from "../config"; // Adjust the import path as needed
const token = getToken(); // Get the token for authentication
const postTypes = ["Question", "Alert", "Tip", "Discussion"];

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  const [activeTab, setActiveTab] = useState(postTypes[0]);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleTabChange = (type) => {
    setActiveTab(type);
    setContent("");
    setMediaFiles([]);
    setError(null);
  };

  const handleFileChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Content cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("postType", activeTab.toLowerCase());
    mediaFiles.forEach((file) => formData.append("media", file));

    try {
      const res = await fetch(`${BASE_URL}/api/createPost`, {
        method: "POST",
         headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },

        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create post");
      }

      const data = await res.json();

      setLoading(false);
      setContent("");
      setMediaFiles([]);
      onPostCreated && onPostCreated(data); // callback to update UI if needed
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-lg relative">
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✖
        </button>

        <nav className="flex border-b mb-4">
          {postTypes.map((type) => (
            <button
              key={type}
              className={`flex-1 py-2 text-center font-semibold ${
                activeTab === type
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-600 hover:text-blue-600"
              }`}
              onClick={() => handleTabChange(type)}
              aria-selected={activeTab === type}
              role="tab"
            >
              {type}
            </button>
          ))}
        </nav>

        <textarea
          className="w-full p-3 border rounded resize-none mb-3"
          rows={5}
          placeholder={`Write your ${activeTab.toLowerCase()} here...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="mb-3"
          accept="image/*,video/*"
        />

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-2 rounded text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Posting..." : `Post ${activeTab}`}
        </button>
      </div>
    </div>
  );
}
