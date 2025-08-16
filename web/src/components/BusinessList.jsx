import React, { useEffect, useState } from 'react';
import './BusinessList.css';
import GetDirectionsButton from './GetDirectionsButton';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // ✅ Add this
import { BASE_URL, getToken } from "../config";
import { socket } from '../user/Socket';
import { he } from 'date-fns/locale';
const token = getToken(); // Get the token for authentication
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // in km
};

const BusinessList = () => {
  const [businesses, setBusinesses] = useState([]);
  const [categories, setCategories] = useState([]); // fetched categories
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('distance-asc');
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
const navigate = useNavigate(); // ✅ initialize

  // Fetch businesses and categories in parallel on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bizRes, catRes] = await Promise.all([
          fetch(`${BASE_URL}/api/businesses`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BASE_URL}/api/business_categories`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const bizData = await bizRes.json();
        const catData = await catRes.json();
        setBusinesses(bizData);
        setCategories(catData.categories);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Socket listener for new businesses
  useEffect(() => {
    socket.on('new_business', (biz) => {
      setBusinesses((prev) => [biz, ...prev]);
    });

    return () => {
      socket.off('new_business');
    };
  }, []);


  // Add distance
  const businessesWithDistance = businesses.map((biz) => {
    const distance = getDistance(
      user?.latitude,
      user?.longitude,
      biz.latitude,
      biz.longitude
    );
    return { ...biz, distance: parseFloat(distance) };
  });

  // Filtering
const filtered = businessesWithDistance
  .filter((biz) => {
    const searchTermLower = searchTerm.toLowerCase();

    const matchSearch =
      (biz.name?.toLowerCase().includes(searchTermLower) ||
       biz.address?.toLowerCase().includes(searchTermLower));

    const matchCategory =
      selectedCategory === 'All' || String(biz.category?.id) === selectedCategory;

    return matchSearch && matchCategory;

  })
  .sort((a, b) => {
    if (sortBy === 'distance-asc') return a.distance - b.distance;
    if (sortBy === 'distance-desc') return b.distance - a.distance;
    return 0;
  });


  // Categories options for filter dropdown (stringified ids)
  const categoryOptions = [
    { id: 'All', name: 'All' },
    ...categories.map((cat) => ({ id: cat.id.toString(), name: cat.name })),
  ];





  if (loading) {
    return <p>Loading businesses...</p>;
  }

  return (
    <div className="business-list">
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="distance-asc">Distance: Nearest First</option>
          <option value="distance-desc">Distance: Farthest First</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p>No businesses found.</p>
      ) : (
        filtered.map((biz) => (
          <div key={biz.id} className="business-card"
             onClick={() => navigate(`/business-profile/${biz.id}`)}

         
  style={{ cursor: 'pointer' }}
          >
            <img
              src={biz.logo_url || 'https://via.placeholder.com/100'}
              alt={biz.name}
              className="biz-image"
            />
            <div className="biz-info">
              <h3>{biz.name}</h3>
              <p className="biz-address">{biz.address}</p>
              <p className="biz-rating">
  ⭐ {biz.average_rating} | {biz.category?.name}
</p>

              <p className="biz-distance">{biz.distance} km away</p>

              <div className="biz-buttons">
                <button onClick={() => window.open(`tel:${biz.phone}`, '_self')}>
                  Contact
                </button>

                <GetDirectionsButton
                  userLat={user?.latitude}
                  userLng={user?.longitude}
                  destLat={biz.latitude}
                  destLng={biz.longitude}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BusinessList;
