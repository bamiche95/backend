import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Divider, Button,
  TextField, IconButton, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams } from 'react-router-dom';
import SidebarMenu from './SideBarMenu';
import { BASE_URL, getToken } from "../config";
import { socket } from '../user/Socket';
import Modal from './Modal';
import CreateBusinessModal from './CreateBusinessModal'
import ReviewsSection from './REviewsSection';
import { Tabs } from "@chakra-ui/react"
import { LuFolder, LuSquareCheck, LuUser } from "react-icons/lu"
import Autocomplete from '@mui/material/Autocomplete';
import BusinessEventModal from './BusinnessEventsModal';
import BusinessEvents from './BusinessEvents';
import ChatWindow from './ChatWindow';
import EventCard from './EventCard';
import { useAuth } from '../context/AuthContext';
import BusinessProductList from './BusinessProductList';
import BusinessMessage from './BusinessMessage';
import BusinessMessageList from './BusinessMessageList'

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'
];

const BusinessView = (initialData = {}, initialReview) => {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  const [newReview, setNewReview] = useState('');
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  // State to handle editing hours
  const [editingHours, setEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  //Services state handling:
  const [allServices, setAllServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [editingServices, setEditingServices] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  //Events
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { user } = useAuth();
  const [eventBeingEdited, setEventBeingEdited] = useState(null);

 const currentBusinessId = id;





  useEffect(() => {

    const fetchBusiness = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/businesses/${id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();

        // Normalize reviews to ensure flat structure
        const normalizedReviews = (data.reviews || []).map(r => ({
          ...r,
          name: r.name || r.user?.name || '',
          avatar: r.avatar || r.user?.avatar || '',
          location: r.location || r.user?.location || '',
        }));

        setBusiness(data);
        setReviews(normalizedReviews);
        setEvents(data.events || []);
        setServices(data.services || []);
        setSelectedServices(data.services || []);  // <-- Move this here inside try block

        // Fetch all services
        const allServicesRes = await fetch(`${BASE_URL}/api/services`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const allServicesData = await allServicesRes.json();
        setAllServices(allServicesData);

      } catch (err) {
        console.error('Failed to load business data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Join the business-specific room
    socket.emit('join_business_room', id);

    return () => {
      // Leave the room when component unmounts
      socket.emit('leave_business_room', id);
    };
  }, [id]);



  useEffect(() => {
    socket.on('new_review', ({ business_id, review }) => {
      if (currentBusinessId === business_id) {
        setReviews(prev => [review, ...prev]);
      }
    });
    return () => {
      socket.off('new_review');
    };
  }, [])


  useEffect(() => {
    // Listen for real-time updates
    socket.on('businessHoursUpdated', ({ businessId, hours }) => {
      if (businessId === id) {
        setBusiness(prev => ({ ...prev, hours }));
        if (editingHours) {
          setHoursForm(hours);
        }
      }
    });

    return () => {
      socket.off('businessHoursUpdated');
    };
  }, [id, editingHours]);


  useEffect(() => {
    if (!business) return; // wait until business is loaded

    const handleUpdateBusiness = (updatedBusiness) => {
      if (updatedBusiness.businessId === business.id) {
        setBusiness(prev => ({
          ...prev,
          name: updatedBusiness.name,
          description: updatedBusiness.description,
          logo_url: updatedBusiness.logo_url,
          banner_url: updatedBusiness.banner_url,
          address: updatedBusiness.address,
          latitude: updatedBusiness.latitude,
          longitude: updatedBusiness.longitude,
          category_id: updatedBusiness.category_id,
          phone: updatedBusiness.phone,
          updatedAt: updatedBusiness.updatedAt,
          // Add any other fields you want to sync here
        }));
      }
    };

    socket.on('update_business', handleUpdateBusiness);

    return () => {
      socket.off('update_business', handleUpdateBusiness);
    };
  }, [business]);



  const handleReviewSubmit = async ({ rating, review }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          business_id: business.id,
          rating,
          review,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit review');
      const newReview = await res.json();

      const normalizedReview = {
        ...newReview,
        name: newReview.name || newReview.user?.name || '',
        avatar: newReview.avatar || newReview.user?.avatar || '',
        location: newReview.location || newReview.user?.location || '',
      };

      setReviews(prev => [normalizedReview, ...prev]);
    } catch (err) {
      alert(err.message);
    }
  };






  const isOpenNow = (hours) => {
    if (!hours || hours.length === 0) return false;

    const now = new Date();
    const todayIndex = now.getDay(); // Sunday=0 ... Saturday=6
    const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Sunday mapped to index 6

    const todayHours = hours[dayMap[todayIndex]];
    if (!todayHours) return false;

    const [openHour, openMin] = todayHours.open_time.split(':');
    const [closeHour, closeMin] = todayHours.close_time.split(':');

    const openDate = new Date(now);
    openDate.setHours(parseInt(openHour, 10), parseInt(openMin, 10), 0);

    const closeDate = new Date(now);
    closeDate.setHours(parseInt(closeHour, 10), parseInt(closeMin, 10), 0);

    return now >= openDate && now <= closeDate;
  };

  const openStatus = isOpenNow(business?.hours);

  // Handle input change in hours form
  const handleHoursChange = (index, field, value) => {
    setHoursForm(prev =>
      prev.map((h, i) => i === index ? { ...h, [field]: value } : h)
    );
  };

  // Submit updated hours to backend
  const handleSaveHours = async () => {
    try {
      // Example POST or PUT request to save hours
      const res = await fetch(`${BASE_URL}/api/businesses/${id}/hours`, {
        method: 'PUT', // or POST based on your API
       
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ hours: hoursForm }),
      });
      if (!res.ok) throw new Error('Failed to save hours');
      const updated = await res.json();
      setBusiness(prev => ({ ...prev, hours: updated.hours }));
      setEditingHours(false);
    } catch (err) {
      console.error(err);
      alert('Error saving hours');
    }
  };

   const isBusinessOwner = user && business && user.id === business.user_id;

  if (loading) {
    return <Box p={4}><CircularProgress /></Box>;
  }

  if (!business) {
    return <Box p={4}><Typography color="error">Business not found.</Typography></Box>;
  }

  const handleSaveServices = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/businesses/${id}/services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          service_ids: selectedServices.map(s => s.serviceid),

        }),
      });

      if (!res.ok) throw new Error('Failed to save services');

      const updated = await res.json();
      setServices(updated.services);
      setEditingServices(false);
    } catch (err) {
      console.error(err);
      alert('Error saving services');
    }
  };



  const handleEventCreated = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleEditEvent = (event) => {
    setEventBeingEdited(event);
    setIsCreateEventModalOpen(true);
  };



  return (
    <Box display="flex" width="100%" minHeight="100vh">
      {/* Sidebar */}
      <Box width="20%" bgcolor="#f5f5f5" p={2}>
        <SidebarMenu />
      </Box>

      {/* Main Content */}
      <Box width="60%" p={3}>
        {/* Banner */}
        <Box
          height="200px"
          sx={{
            backgroundImage: `url(${business.banner_url || 'https://source.unsplash.com/1200x400/?business'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '8px',
            position: 'relative',

          }}
        >
          <Button
            variant="contained"
            size="small"
            sx={{ position: 'absolute', top: 16, right: 16, bgcolor: '#1976d2' }}
            onClick={() => setIsEditModalOpen(true)}  // open modal on click
          >
            Edit Business
          </Button>
        </Box>

        {/* Business Info */}
        <Box display="flex" alignItems="center" mt={-6} pl={2}  >
          <Avatar
            src={business.logo_url}
            sx={{ width: 100, height: 100, border: '3px solid white', boxShadow: 2, mr: 2 }}
          />
          <Box sx={{ zIndex: 999, backgroundColor: 'white', padding: '5px', borderRadius: '8px' }}>
            <Typography variant="h5">{business.name}</Typography>
            <Typography color="text.secondary">
              {business.address} · {business.category?.name} · ⭐ {business.average_rating || 'N/A'}
            </Typography>
            <Typography color={openStatus ? 'green' : 'error'}>
              {openStatus ? 'Open Now' : 'Closed'}
            </Typography>
          </Box>

        </Box>

        <Divider sx={{ my: 3 }} />

        {/* About */}
        <Typography variant="h6" gutterBottom>About</Typography>
        <Typography variant="body1">
          {business.description || 'No description available.'}
        </Typography>



        {/* HOURS DISPLAY AND EDIT */}
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Business Hours</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (!editingHours) {
                  // When opening the form, initialize hoursForm with current hours or default template
                  setHoursForm(
                    business.hours && business.hours.length > 0
                      ? business.hours
                      : daysOfWeek.map(day => ({
                        day,
                        open_time: '09:00',
                        close_time: '17:00',
                      }))
                  );
                }
                setEditingHours(prev => !prev);
              }}
            >
              {editingHours ? 'Cancel' : (business.hours?.length > 0 ? 'Edit Hours' : 'Add Hours')}
            </Button>
          </Box>

          {editingHours ? (
            <Box>
              {hoursForm.map((h, i) => (
                <Box key={i} display="flex" alignItems="center" mb={1} gap={2}>
                  <Typography sx={{ width: 100 }}>{h.day}</Typography>
                  <TextField
                    type="time"
                    label="Open"
                    value={h.open_time}
                    onChange={(e) => handleHoursChange(i, 'open_time', e.target.value)}
                    inputLabelProps={{ shrink: true }}
                    inputprops={{ step: 300 }} // 5 min step
                    size="small"
                  />
                  <TextField
                    type="time"
                    label="Close"
                    value={h.close_time}
                    onChange={(e) => handleHoursChange(i, 'close_time', e.target.value)}
                    inputLabelProps={{ shrink: true }}
                    inputprops={{ step: 300 }}
                    size="small"
                  />

                </Box>
              ))}
              <Button variant="contained" onClick={handleSaveHours}>Save Hours</Button>
            </Box>
          ) : (
            business.hours && business.hours.length > 0 ? (
              business.hours.map((h, i) => (
                <Typography key={i} variant="body2">
                  {h.day}: {h.open_time.slice(0, 5)} - {h.close_time.slice(0, 5)}
                </Typography>
              ))
            ) : (
              <Typography variant="body2">No hours listed.</Typography>
            )
          )}
        </Box>


        {/* Contact Info */}
        <Box mt={3}>
          <Typography variant="h6">Contact</Typography>
          <Typography>📞 {business.phone || 'N/A'}</Typography>
          {business.website && <Typography>🌐 {business.website}</Typography>}
     <Box mt={4}>
        <Typography variant="h6">Chat</Typography>
        {isBusinessOwner ? (
          <BusinessMessageList businessId={business.id} currentUser={user} />
        ) : (
          // For a regular user, BusinessMessage needs to know who they are,
          // who they are chatting with (the business owner or the business itself),
          // and the business ID.
          // Assuming BusinessMessage takes businessId and currentUser.
          // You might need to adjust BusinessMessage to accept a 'recipientType' of 'business'
          // and the business's user_id as the recipient_id.
          <BusinessMessage businessId={business.id} recipientUserId={business.user_id} currentUser={user} business={business}/>
        )}
      </Box>

        </Box>

        <Divider sx={{ my: 3 }} />



        {/* Tabs section */}
        <Tabs.Root defaultValue="Reviews" variant="plain">
          <Tabs.List bg="bg.muted" rounded="l3" p="1">
            <Tabs.Trigger value="Reviews">
              <LuUser />
              Reviews
            </Tabs.Trigger>
            <Tabs.Trigger value="Events">
              <LuFolder />
              Events
            </Tabs.Trigger>
            <Tabs.Trigger value="Products">
              <LuSquareCheck />
              Products
            </Tabs.Trigger>
            <Tabs.Trigger value="Services">
              <LuSquareCheck />
              Services
            </Tabs.Trigger>
            <Tabs.Indicator rounded="l2" />
          </Tabs.List>
          <Tabs.Content value="Reviews">
            {/* Reviews */}
            <ReviewsSection reviews={reviews} onSubmitReview={handleReviewSubmit} />
          </Tabs.Content>
          <Tabs.Content value="Events">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">Upcoming Events</Typography>
              <Button variant="outlined" onClick={() => {
                setEditingEvent(null);
                setModalOpen(true);
              }}>
                Add Event
              </Button>
            </Box>
            <BusinessEvents businessId={id} isBusinessProfilePage={true} onEditEvent={handleEditEvent} />
          </Tabs.Content>

          <Tabs.Content value="Products">
            <BusinessProductList businessId={id} />
          </Tabs.Content>
          <Tabs.Content value="Services">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">Services</Typography>
              {!editingServices && (
                <Button
                  variant="outlined"
                  onClick={() => setEditingServices(true)}
                >
                  {services.length === 0 ? 'Add Services' : 'Edit Services'}
                </Button>
              )}
            </Box>

            {editingServices ? (
              <>
                <Autocomplete
                  multiple
                  id="services-selector"
                  options={allServices}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedServices}
                  onChange={(event, newValue) => {
                    setSelectedServices(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Select Services"
                      placeholder="Search services..."
                    />
                  )}
                />
                <Box mt={2}>
                  <Button variant="contained" onClick={handleSaveServices}>
                    Save Services
                  </Button>
                  <Button onClick={() => setEditingServices(false)} sx={{ ml: 2 }}>
                    Cancel
                  </Button>
                </Box>
              </>
            ) : (
              <>
                {services.length === 0 ? (
                  <Typography>No services listed.</Typography>
                ) : (
                  services.map(service => (
                    <Typography key={service.id} sx={{ ml: 1, mb: 1 }}>
                      🎉 {service.title}
                    </Typography>
                  ))
                )}
              </>
            )}
          </Tabs.Content>

        </Tabs.Root>


      </Box>


      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Business Details"
      >
        <CreateBusinessModal
          onClose={() => setIsEditModalOpen(false)}
          initialData={business} // pass your existing business info here
          isEditMode={true}
        />
      </Modal>


      {/* Right Sidebar */}
      <Box width="20%" bgcolor="#f9f9f9" p={2}>
        <Typography variant="h6">Promotions</Typography>
        <Typography variant="body2">{business.promotions || '🎁 No current promotions'}</Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6">Opening Hours</Typography>
        {business.hours ? (
          business.hours.map((line, idx) => (
            <Typography key={idx} variant="body2">
              {line.day}: {line.is_closed ? 'Closed' : `${line.open_time} - ${line.close_time}`}
            </Typography>
          ))
        ) : (
          <Typography variant="body2">No hours listed.</Typography>
        )}


        <Divider sx={{ my: 2 }} />

        <Typography variant="h6">Other Info</Typography>
        <Typography variant="body2">{business.features?.join(', ') || 'N/A'}</Typography>
        {/* Inside Right Sidebar */}


      </Box>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
      >
        <BusinessEventModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEvent(null);
          }}
          businessId={id} // use the actual businessId from `useParams`
          initialData={editingEvent}
          onEventSaved={(savedEvent) => {
            if (editingEvent) {
              setEvents(prev =>
                prev.map(e => e.id === savedEvent.id ? savedEvent : e)
              );
            } else {
              setEvents(prev => [savedEvent, ...prev]);
            }
            setModalOpen(false);
            setEditingEvent(null);
          }}
        />
      </Modal>




    </Box>
  );
};

export default BusinessView;
