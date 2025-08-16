import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BASE_URL, getToken } from "../config";
import { useAuth } from '../context/AuthContext';

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  IconButton,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const MAX_IMAGES = 5;

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  price: Yup.number()
    .min(0, 'Price must be positive')
    .when('is_free', (isFree, schema) => {
      return isFree
        ? schema.notRequired()
        : schema.required('Price is required if not free');
    }),
  category: Yup.string().required('Category is required'),
});


const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [originalImages, setOriginalImages] = useState([]);
  const [images, setImages] = useState([]); // current existing images (urls)
  const [newImages, setNewImages] = useState([]); // new files
  const [newImagePreviews, setNewImagePreviews] = useState([]);
const [saving, setSaving] = useState(false);
const [success, setSuccess] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_free: false,
  });

  // Fetch product data on mount
  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`${BASE_URL}/api/editproducts/${id}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();

        if (data.product.owner_id !== user.id) {
          setError('You are not authorized to edit this product.');
          return;
        }

        setInitialValues({
          name: data.product.name,
          description: data.product.description || '',
          price: data.product.price || '',
          category: data.product.category_id || '',
          is_free: Boolean(data.product.is_free),
        });

        setImages(data.product.images || []);
        setOriginalImages(data.product.images || []);
      } catch (e) {
        setError('Failed to fetch product data.');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id, user]);

  // Handle new image uploads + previews
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImagesCount = images.length + newImages.length;

    const availableSlots = MAX_IMAGES - totalImagesCount;

    if (files.length > availableSlots) {
      alert(`You can only add ${availableSlots} more image(s).`);
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    setNewImages((prev) => [...prev, ...selectedFiles]);

    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setNewImagePreviews((prev) => [...prev, ...previews]);
  };

  // Cleanup previews URLs
  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviews]);

  // Remove existing image from current images array
  const handleRemoveExistingImage = (urlToRemove) => {
    setImages((prev) => prev.filter((url) => url !== urlToRemove));
  };

  // Remove new image (file + preview)
  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) return <Typography>Loading product...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError('');

        const deletedImages = originalImages.filter((img) => !images.includes(img));

        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', values.description);
        formData.append('price', values.price);
        formData.append('category_id', values.category);
        formData.append('is_free', values.is_free);
        formData.append('product_id', id);

        deletedImages.forEach((url) => formData.append('deletedImages[]', url));
        newImages.forEach((file) => formData.append('images', file));

        try {
          const res = await fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData,
          });

          if (!res.ok) throw new Error('Update failed');
          navigate(`/products/${id}`);
        } catch {
          setError('Failed to update product.');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, handleChange, handleBlur, isSubmitting, touched, errors, setFieldValue }) => (
        <Form noValidate>
          <Typography variant="h4" mb={3}>
            Edit Product
          </Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Name"
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.name && Boolean(errors.name)}
            helperText={touched.name && errors.name}
            required
          />

          <TextField
            fullWidth
            margin="normal"
            label="Description"
            name="description"
            multiline
            rows={4}
            value={values.description}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Price"
            name="price"
            type="number"
            inputProps={{ step: '0.01' }}
            value={values.price}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={values.is_free}
            error={touched.price && Boolean(errors.price)}
            helperText={touched.price && errors.price}
            required={!values.is_free}
          />

          <FormControlLabel
            control={
              <Checkbox
                name="is_free"
                checked={values.is_free}
                onChange={(e) => {
                  handleChange(e);
                  if (e.target.checked) {
                    setFieldValue('price', '');
                  }
                }}
              />
            }
            label="Free"
          />

          <TextField
            fullWidth
            margin="normal"
            label="Category"
            name="category"
            value={values.category}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.category && Boolean(errors.category)}
            helperText={touched.category && errors.category}
            required
          />

          <Box mt={4}>
            <Typography variant="h6" mb={1}>
              Existing Images
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {images.map((url, i) => (
                <Box key={url} position="relative" width={100} height={100}>
                  <img
                    src={url}
                    alt={`Product ${i}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveExistingImage(url)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,0,0,0.8)' },
                    }}
                  >
                    <CloseIcon fontSize="small" color="error" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box mt={4}>
            <Typography variant="h6" mb={1}>
              New Images Preview
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {newImagePreviews.map((src, i) => (
                <Box key={src} position="relative" width={100} height={100}>
                  <img
                    src={src}
                    alt={`New upload ${i}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveNewImage(i)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,0,0,0.8)' },
                    }}
                  >
                    <CloseIcon fontSize="small" color="error" />
                  </IconButton>
                </Box>
              ))}
            </Stack>

            <Button
              variant="contained"
              component="label"
              sx={{ mt: 2 }}
              disabled={images.length + newImages.length >= MAX_IMAGES}
            >
              Upload New Images
              <input
                hidden
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            <Typography variant="caption" display="block" mt={1}>
              {MAX_IMAGES - (images.length + newImages.length)} image(s) can still be added.
            </Typography>
          </Box>

          {error && (
            <Typography color="error" mt={2}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            type="submit"
            sx={{ mt: 4 }}
            disabled={isSubmitting}
          >
            Save
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default EditProduct;
