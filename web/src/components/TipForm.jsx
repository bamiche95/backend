import React, { useEffect, useState, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { BASE_URL, getToken } from "../config";
const token = getToken(); // Get the token for authentication
function TipForm() {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [content, setContent] = useState('');
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    // Load categories from backend
    fetch(`${BASE_URL}/api/nearby_tips_categories`, {
      headers: {
        authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
     modules: {
  toolbar: {
    container: [
      ['bold', 'italic', 'underline'],
      ['link'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  },
},
      });

      quillRef.current.on('text-change', () => {
        setContent(quillRef.current.root.innerHTML);
      });
    }
  }, []);

  // Sync external content change (optional)
  useEffect(() => {
    if (quillRef.current && content !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = content;
    }
  }, [content]);

  // Upload image helper
  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

  const res = await fetch(`${BASE_URL}/api/upload-tip-image`, {
  method: 'POST',
  body: formData,
  headers: {
    authorization: `Bearer ${token}`,
  },
});


    if (!res.ok) throw new Error('Upload failed');

    const data = await res.json();
    return data.url; // URL returned by backend
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim() || !categoryId || !content.trim()) {
      alert('Please fill all fields');
      return;
    }

 const res = await fetch(`${BASE_URL}/api/nearby_tips`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ title, categoryId, content })
});


    if (res.ok) {
      alert('Tip submitted!');
      setTitle('');
      setCategoryId('');
      setContent('');
      quillRef.current.root.innerHTML = '';
    } else {
      alert('Failed to submit tip');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Title:</label><br />
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Tip Category:</label><br />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          required
        >
          <option value="">Select category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Content:</label>
        <div ref={editorRef} style={{ height: 300, backgroundColor: 'white' }} />
      </div>

      <button type="submit" style={{ marginTop: 16 }}>
        Submit Tip
      </button>
    </form>
  );
}

export default TipForm;
