import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BASE_URL, getToken } from "../config";
import { useNavigate } from 'react-router-dom';
import { socket } from '@/user/Socket';

const token = getToken(); // Get the token for authentication
const LIMIT = 10;

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef();
const navigate = useNavigate();

  const lastProductRef = useCallback(
    node => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
       if (entries[0].isIntersecting && hasMore && !loading) {
            setOffset(prevOffset => prevOffset + LIMIT);
            }

      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    const fetchProducts = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${BASE_URL}/api/products/all?limit=${LIMIT}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();
   //console.log('Fetched products data:', data);

    if (!data.products || data.products.length < LIMIT) {
      setHasMore(false);
    }

    setProducts(prev => {
      const existingIds = new Set(prev.map(p => p.product_id));
      const newOnes = data.products ? data.products.filter(p => !existingIds.has(p.product_id)) : [];
      return [...prev, ...newOnes];
    });
  } catch (err) {
    console.error('Error fetching products:', err);
  } finally {
    setLoading(false);
  }
};

    fetchProducts();
  }, [offset]);


useEffect(() => {
  socket.emit('join', 'all_products'); // Join room on mount

  socket.on('new-product', (product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.product_id === product.product_id);
      if (!exists) return [product, ...prev];
      return prev;
    });
  });

  return () => {
    socket.emit('leave', 'all_products'); // Leave room on unmount
    socket.off('new-product');
  };
}, []);



  return (
    <div>
      <h4>All Products</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', cursor:'pointer' }}>
        {products.map((product, index) => {
          const isLast = index === products.length - 1;
          
          return (
            <div
                key={`${product.product_id}-${index}`}
              ref={isLast ? lastProductRef : null}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '10px',
                width: '250px',
              }}
              onClick={() => navigate(`/products/${product.product_id}`)}
            >
              {product.images[0] && (
                <img
                  src={ product.images[0]}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
              )}
              <h5>{product.name}</h5>
              <p>{product.description}</p>
              <p><strong>{product.is_free ? 'Free' : `$${product.price}`}</strong></p>
              <p style={{ fontSize: '0.85em', color: '#666' }}>
                Category: {product.category}<br />
                By: {product.owner}
              </p>
            </div>
          );
        })}
      </div>
      {loading && <p>Loading more products...</p>}
      {!hasMore && <p>No more products to load.</p>}
       
    </div>
  );
};

export default AllProducts;
