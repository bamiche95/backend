import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { BASE_URL, getToken } from "../config";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '@/user/Socket';

const LIMIT = 10;

const YourProducts = () => {
  const { user } = useAuth();
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
  if (!socket.connected) {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', 'all_products');
    });
  } else {
    socket.emit('join', 'all_products');
  }

  socket.on('new-product', (product) => {
    console.log('Received new-product:', product);
    setProducts(prev => {
      const exists = prev.some(p => p.product_id === product.product_id);
      if (!exists) return [product, ...prev];
      return prev;
    });
  });

  return () => {
    socket.emit('leave', 'all_products');
    socket.off('new-product');
  };
}, []);


  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/products/all?limit=${LIMIT}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();

        if (!data.products || data.products.length < LIMIT) {
          setHasMore(false);
        }

        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.product_id));
          const newOnes = data.products
            ? data.products.filter(p => !existingIds.has(p.product_id))
            : [];
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

  if (!user) {
    return <Typography variant="body1">Loading user info...</Typography>;
  }

  const filteredProducts = products.filter(product => product.owner_id === user.id);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Your Products
      </Typography>

      {filteredProducts.length === 0 && !loading && (
        <Typography color="textSecondary">You have not posted any products yet.</Typography>
      )}

      <Grid container spacing={3}>
        {filteredProducts.map((product, index) => {
          const isLast = index === filteredProducts.length - 1;
          return (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              key={product.product_id}
              ref={isLast ? lastProductRef : null}
              onClick={() => navigate(`/products/${product.product_id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                {product.images[0] && (
                  <CardMedia
                    component="img"
                    image={product.images[0]}
                    alt={product.name}

                  
                    sx={{ objectFit: 'cover', height:'200px' }}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" noWrap>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {product.description}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    color={product.is_free ? 'success.main' : 'primary'}
                    sx={{ mt: 1 }}
                  >
                    {product.is_free ? 'Free' : `$${product.price}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Category: {product.category}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!hasMore && !loading && (
        <Typography variant="body2" align="center" sx={{ mt: 3 }} color="text.secondary">
          No more products to load.
        </Typography>
      )}
    </Box>
  );
};

export default YourProducts;
