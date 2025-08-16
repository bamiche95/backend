import React, { useEffect, useState } from 'react';
import { BASE_URL, getToken } from "../config";

function BusinessProductList({ businessId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    fetch(`${BASE_URL}/api/businesses/${businessId}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`, // Use the token for authentication
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch products');
        }
        return response.json();
      })
      .then(data => {
        setProducts(data);
      })
      .catch(err => {
        setError(err.message || 'Error fetching products');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [businessId]);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Products for Business {businessId}</h2>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul>
          {products.map(product => (
            <li key={product.product_id}>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p>Price: {product.is_free ? 'Free' : `$${product.price}`}</p>
              <p>Category: {product.category_name}</p>
              {product.images.length > 0 && (
                <div>
                  {product.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={product.name}
                      style={{ maxWidth: 100, marginRight: 10 }}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BusinessProductList;
