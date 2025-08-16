import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { BASE_URL, getToken } from "../config";
import { socket } from '../user/Socket';
import { Button, Card, HStack, Image, Text } from "@chakra-ui/react";
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import BusinessEventModal from './BusinnessEventsModal';
const BusinessEvents = ({ businessId, isBusinessProfilePage = false }) => {
  const [events, setEvents] = useState([]);
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [attendingEvents, setAttendingEvents] = useState([]);
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
  const [attendeesList, setAttendeesList] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

const token = getToken(); // Get the token for authentication

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const endpoint = businessId
          ? `${BASE_URL}/api/businesses/${businessId}/events`
          : `${BASE_URL}/api/events/by-business`;

        const res = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch events');

        const data = await res.json();
        let filteredEvents = [...data];

        if (!isBusinessProfilePage && user?.latitude && user?.longitude) {
          filteredEvents.sort((a, b) => {
            const distA = getDistanceFromLatLonInKm(user.latitude, user.longitude, a.latitude, a.longitude);
            const distB = getDistanceFromLatLonInKm(user.latitude, user.longitude, b.latitude, b.longitude);

            if (distA === distB) {
              return new Date(a.start_datetime) - new Date(b.start_datetime);
            }
            return distA - distB;
          });
        } else {
          filteredEvents.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        }

        setEvents(filteredEvents);
      } catch (err) {
        console.error(err);
      }
    };


    fetchEvents();
    if (businessId) {
      socket.emit('join_business_room', businessId);

      socket.on('newBusinessEvent', ({ businessId: eventBusinessId, event }) => {
        if (eventBusinessId === businessId) {
          setEvents((prevEvents) => [event, ...prevEvents]);
        }
      });

      socket.on('businessEventDeleted', ({ eventId }) => {
        setEvents((prevEvents) => prevEvents.filter(e => Number(e.id) !== Number(eventId)));
      });
    }

    return () => {
      if (businessId) {
        socket.emit('leave_business_room', businessId);
        socket.off('newBusinessEvent');
        socket.off('businessEventDeleted');
      }
    };

  }, [businessId, user, isBusinessProfilePage]);

  // Haversine formula to calculate distance between two lat/lng in km
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const deg2rad = (deg) => deg * (Math.PI / 180);
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };


  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await fetch(`${BASE_URL}/api/businesses/${businessId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete event');
      // No need to manually remove from state - socket will handle it
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const fetchOwnership = async () => {
      if (!isBusinessProfilePage || !businessId || !user?.id) return;

      try {
        const res = await fetch(`${BASE_URL}/api/businesses/${businessId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch business info');
        const business = await res.json();

        setIsOwner(business.user_id === user.id);
        console.log('Business user_id:', business.user_id, 'Logged-in user id:', user.id);
      } catch (err) {
        console.error('Ownership check failed:', err);
      }
    };

    fetchOwnership();
  }, [businessId, user, isBusinessProfilePage]);






  return (
    <Box>

      {events.length === 0 ? (
        <Typography>No events found.</Typography>
      ) : (
        <List>
          {events.map((event) => (
            <ListItem key={event.id} divider alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch' }}>


              <Card.Root maxW="sm" overflow="hidden">
                {/* Media files */}
                <Box flexWrap="wrap" gap={1} mt={1}>
                  <Card.Title>{event.title}</Card.Title>
                  <HStack>

                    {event.media && event.media.length > 0 ? (
                      event.media.map((mediaItem) => {
                        const isVideo = mediaItem.media_type.startsWith('video');
                        const mediaUrl = `${BASE_URL}${mediaItem.media_url}`;
                        return isVideo ? (
                          <video
                            key={mediaItem.id}
                            src={mediaUrl}
                            width={'100%'}
                            height={50}
                            controls
                            style={{ borderRadius: 4 }}
                          />
                        ) : (
                          <img
                            key={mediaItem.id}
                            src={mediaUrl}
                            alt={event.title}
                            width={'100%'}
                            height={50}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                        );
                      })
                    ) : (
                      <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                        No media
                      </Typography>

                    )}</HStack>
                  {event.start_datetime}
                </Box>
                <Card.Body gap="2">

                  <Card.Description>
                    {event.description}
                  </Card.Description>

                </Card.Body>
                <Card.Footer gap="2">
                  {!isOwner && (
                    <Button
                      variant="solid"
                      onClick={async () => {
                        try {
                          await fetch(`${BASE_URL}/api/businessevents/${event.id}/attend`, {
                            method: 'POST',
                            headers: {
                              Authorization: `Bearer ${getToken()}`
                            }
                          });
                          setAttendingEvents((prev) => [...prev, event.id]);
                        } catch (err) {
                          alert('Failed to mark attendance');
                        }
                      }}
                      isDisabled={attendingEvents.includes(event.id)}
                    >
                      {attendingEvents.includes(event.id) ? 'Attending' : 'I am attending'}
                    </Button>
                  )}


                  {isBusinessProfilePage && isOwner && (
                    <>
                      <Button
                        variant="ghost"
                        color="error"
                        onClick={() => handleDelete(event.id)}
                      >
                        Delete Event
                      </Button>
                      <Button onClick={() => {
                        setEditingEvent(event);
                        setModalOpen(true);
                      }}>Edit</Button>

                      <Button
                        onClick={async () => {
                          setSelectedEvent(event);
                          try {
                            const res = await fetch(`${BASE_URL}/api/businessevents/${event.id}/attendees`, {
                              headers: {
                                Authorization: `Bearer ${getToken()}`
                              }
                            });
                            if (!res.ok) throw new Error('Failed to fetch attendees');
                            const attendees = await res.json();
                            setAttendeesList(attendees);
                            setAttendeesModalOpen(true);
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                      >
                        View Attendees
                      </Button>

                    </>


                  )}



                </Card.Footer>
              </Card.Root>


            </ListItem>
          ))}
        </List>
      )}


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
          businessId={businessId}
          initialData={editingEvent}
          onEventSaved={(savedEvent) => {
            setEvents((prev) =>
              editingEvent
                ? prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
                : [savedEvent, ...prev]
            );
            setModalOpen(false);
            setEditingEvent(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={attendeesModalOpen}
        onClose={() => {
          setAttendeesModalOpen(false);
          setAttendeesList([]);
          setSelectedEvent(null);
        }}
        title={`Attendees for: ${selectedEvent ? selectedEvent.title : ''}`}
      >
        {attendeesList.length === 0 ? (
          <Typography>No attendees yet.</Typography>
        ) : (
          <List>
            {attendeesList.map((attendee) => (
              <ListItem key={attendee.userid} divider>
                <Image src={attendee.profile_picture} style={{ height: '80px', width: '80px', objectFit: 'cover', borderRadius: '50%' }} />
                <ListItemText
                  primary={`${attendee.full_name} (@${attendee.username})`}
                  secondary={`attending from: ${attendee.address}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Modal>


    </Box>
  );
};

export default BusinessEvents;
