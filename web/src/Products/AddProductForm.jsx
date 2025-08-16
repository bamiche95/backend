import React, { useState, useEffect, useRef } from 'react';

import { BASE_URL, getToken } from "../config";

const AddProduct = ({ isOpen, onClose, onProductAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saleType, setSaleType] = useState('private');
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const fileInputRef = useRef(null);



  useEffect(() => {
    if (saleType === 'business') {
      const fetchBusinesses = async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/my-businesses`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          setUserBusinesses(data.businesses || []);
        } catch (err) {
          console.error('Failed to fetch businesses:', err);
        }
      };
      fetchBusinesses();
    }
  }, [saleType]);



  // Effect to fetch categories when the modal opens and reset form when it closes
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/categories`, {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          });
          const data = await res.json();
          setCategories(data.categories || []);
        } catch (err) {
          console.error('Failed to fetch categories:', err);
        }
      };
      fetchCategories();
    } else {
      // Reset all form fields when the modal closes
      setName('');
      setDescription('');
      setPrice('');
      setIsFree(false);
      setCategoryId('');
      setImages([]);
      setImagePreviews([]); // Clear previews on close
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Effect for cleaning up image object URLs to prevent memory leaks
  useEffect(() => {
    // This runs when the component unmounts OR when imagePreviews change
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Product name is required.');
      setLoading(false);
      return;
    }
    if (!categoryId) {
      setError('Category is required.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('is_free', isFree);
    formData.append('category_id', categoryId);
    // Append the actual file objects to formData
    images.forEach((img) => formData.append('images', img));
    if (saleType === 'business') {
      if (!selectedBusinessId) {
        setError('Please select a business.');
        setLoading(false);
        return;
      }
      formData.append('business_id', selectedBusinessId);
    } else {
      formData.append('is_private', '1'); // optional, for backend tracking
    }

    try {
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Failed to create product');

      onProductAdded?.();
      onClose(); // This will trigger the useEffect to reset the form
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const newlySelectedFiles = Array.from(e.target.files);
    let currentCombinedFiles = [...images]; // Start with existing images
    let currentCombinedPreviews = [...imagePreviews]; // Start with existing previews

    // Process newly selected files
    newlySelectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        // Check if file is already selected (e.g., by name and size) to avoid duplicates
        const isDuplicate = currentCombinedFiles.some(
          existingFile => existingFile.name === file.name && existingFile.size === file.size
        );

        if (!isDuplicate && currentCombinedFiles.length < 5) { // Ensure limit is not exceeded
          const previewUrl = URL.createObjectURL(file);
          currentCombinedFiles.push(file);
          currentCombinedPreviews.push(previewUrl);
        } else if (!isDuplicate && currentCombinedFiles.length >= 5) {
          console.warn(`File ${file.name} could not be added. Maximum 5 images allowed.`);
        } else {
          console.warn(`File ${file.name} is already selected.`);
        }
      } else {
        console.warn(`File ${file.name} is not an image and will be skipped.`);
      }
    });

    setImages(currentCombinedFiles);
    setImagePreviews(currentCombinedPreviews);
    // Clear the file input value to allow selecting the same files again if needed
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    // Revoke the URL of the image being removed
    URL.revokeObjectURL(imagePreviews[indexToRemove]);

    // Filter out the image and its preview at the specified index
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    const updatedImagePreviews = imagePreviews.filter((_, index) => index !== indexToRemove);

    setImages(updatedImages);
    setImagePreviews(updatedImagePreviews);
  };


  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1040,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1050,
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 0 20px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()} // Prevent modal close on clicking inside
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Add New Product</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              fontWeight: 'bold',
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          <label style={{ display: 'block', marginBottom: 10 }}>
            Post As:
            <div style={{ marginTop: 4 }}>
              <label>
                <input
                  type="radio"
                  value="private"
                  checked={saleType === 'private'}
                  onChange={() => setSaleType('private')}
                  style={{ marginRight: 6 }}
                />
                Private Sale
              </label>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="radio"
                  value="business"
                  checked={saleType === 'business'}
                  onChange={() => setSaleType('business')}
                  style={{ marginRight: 6 }}
                />
                Business
              </label>
            </div>
          </label>

          {saleType === 'business' && (
            <label style={{ display: 'block', marginBottom: 10 }}>
              Select Business *
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              >
                <option value="">-- Choose a Business --</option>
                {userBusinesses.map((biz) => (
                  <option key={biz.business_id} value={biz.business_id}>
                    {biz.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: 'block', marginBottom: 10 }}>
            Product Name *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            Category *
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            Price (set 0 or leave empty for Free)
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isFree}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={isFree}
              onChange={() => setIsFree(!isFree)}
              style={{ marginRight: '8px' }}
            />
            Mark as Free
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            Images (up to 5)
           <input
  type="file"
  multiple
  accept="image/*"
  onChange={handleFileChange}
  ref={fileInputRef}
  style={{ display: 'block' }} // Hides the file input
/>

          </label>

          {/* Image Previews with Remove Buttons */}
          
    
<div
  style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '10px',
    marginBottom: '10px',
  }}
>
  {imagePreviews.map((url, index) => (
    <div
      key={url}
      style={{
        position: 'relative',
        width: '80px',
        height: '80px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <img
        src={url}
        alt={`Preview ${index + 1}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <button
        onClick={() => handleRemoveImage(index)}
        style={{
          position: 'absolute',
          top: '0px',
          right: '0px',
          background: 'rgba(255, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '0 4px 0 4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          padding: '2px 6px',
          lineHeight: '1',
          zIndex: 1,
        }}
        aria-label={`Remove image ${index + 1}`}
      >
        &times;
      </button>
    </div>
  ))}

  {/* Always show the + box */}
  <div
    onClick={() => {
      if (images.length < 5) fileInputRef.current?.click();
    }}
    style={{
      width: '80px',
      height: '80px',
      border: '2px dashed #aaa',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: images.length < 5 ? 'pointer' : 'not-allowed',
      fontSize: '2rem',
      color: '#aaa',
      userSelect: 'none',
      opacity: images.length < 5 ? 1 : 0.4,
    }}
    title={images.length < 5 ? 'Click to add image' : 'Maximum 5 images allowed'}
  >
    +
  </div>
</div>


   

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          width: '100%',
        }}
      >
        {loading ? 'Adding...' : 'Add Product'}
      </button>
    </form >
      </div >
    </>
  );
};

export default AddProduct;