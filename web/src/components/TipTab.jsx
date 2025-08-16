import React, { useState, useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { BASE_URL, getToken } from "../config";

function TipForm({ tipData, setTipData }) {
  const [categories, setCategories] = useState([]);
  const editorRef = useRef(null);
  const quillRef = useRef(null);

 useEffect(() => {
        // Fetch categories when component mounts
        fetch(`${BASE_URL}/api/nearby_tips_categories`, {
            headers: {
                authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error('Failed to fetch tip categories:', err));
    }, []);

    const handleCategoryChange = (e) => {
        setTipData(prev => ({
            ...prev,
            categoryId: e.target.value, // Set state with the string value from the select
        }));
    };


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
        setTipData(prev => ({ ...prev, content: quillRef.current.root.innerHTML }));
      });
    }
  }, [setTipData]);

  useEffect(() => {
    if (quillRef.current && tipData.content !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = tipData.content;
    }
  }, [tipData.content]);

  // No handleSubmit or form element here anymore.

  return (
    <div>
      <div>
        <label>Title:</label><br />
        <input
          type="text"
          value={tipData.title}
          onChange={e => setTipData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label>Tip Category:</label><br />
         <select
                value={tipData.categoryId} // This value should match the 'value' of an <option>
                onChange={handleCategoryChange}
                required
            >
                <option value="">Select category</option> {/* Empty value for initial selection */}
                {categories.map(cat => (
                    <option key={cat.id} value={String(cat.id)}> {/* IMPORTANT: value should be a string */}
                        {cat.name}
                    </option>
                ))}
            </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Content:</label>
        <div ref={editorRef} style={{ height: 300, backgroundColor: 'white' }} />
      </div>
    </div>
  );
}
export default TipForm;