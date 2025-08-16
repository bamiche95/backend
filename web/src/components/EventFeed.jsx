// EventFeed.js
import React, { useEffect, useState } from 'react';
import { Button, Spinner, Box, Text, Image, Flex } from '@chakra-ui/react';
import { BASE_URL, getToken } from "../config";
import { Tabs } from '@chakra-ui/react';
import { LuFolder, LuSquareCheck, LuUser } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { toaster } from '@/components/ui/toaster';
import EventCard from '@/components/EventCard';
import { socket } from '@/user/socket';
import RadiusSlider from '@/components/RadiusSlider' // adjust path as needed
import BusinessEvents from './BusinessEvents';
const token = getToken(); // Get the token for authentication
// Add refreshKey to props
const EventFeed = ({ onEditEvent, refreshKey }) => {
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const [rsvpLoading, setRsvpLoading] = useState({});

    const [attendingEvents, setAttendingEvents] = useState([]);
    const [attendingLoading, setAttendingLoading] = useState(true);
    const [attendingError, setAttendingError] = useState(null);

    const [myEvents, setMyEvents] = useState([]);
    const [myEventsLoading, setMyEventsLoading] = useState(true);
    const [myEventsError, setMyEventsError] = useState(null);
    const [userLocation, setUserLocation] = useState(null); // { latitude, longitude }
    const [radiusKm, setRadiusKm] = useState(10); // default radius 10 km


    const [businessEvents, setBusinessEvents] = useState([]);
const [businessEventsLoading, setBusinessEventsLoading] = useState(true);
const [businessEventsError, setBusinessEventsError] = useState(null);

const fetchBusinessEvents = () => {
  setBusinessEventsLoading(true);

  fetch(`${BASE_URL}/api/events/by-business`, {
    method: 'GET',
    headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch business events');
      return res.json();
    })
    .then(data => {
      const normalized = data.map(event => ({
        ...event,
        media: Array.isArray(event.media) ? event.media : [],
      }));
      setBusinessEvents(normalized);
      setBusinessEventsLoading(false);
    })
    .catch(err => {
      setBusinessEventsError(err.message);
      setBusinessEventsLoading(false);
    });
};

    useEffect(() => {
        if (user?.latitude && user?.longitude) {
            setUserLocation({
                latitude: parseFloat(user.latitude),
                longitude: parseFloat(user.longitude),
            });
        } else {
            setUserLocation(null);
        }
    }, [user]);


    useEffect(() => {
        if (userLocation) {
            fetchAllEvents();
        }
    }, [userLocation, radiusKm, refreshKey]);

    // Function to fetch all events
    const fetchAllEvents = () => {
        if (!userLocation) return;

        setLoading(true);

        const queryParams = new URLSearchParams({
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            radius: radiusKm,
        });

        fetch(`${BASE_URL}/api/events?${queryParams.toString()}`, {
            method: 'GET',
           headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch events');
                return res.json();
            })
            .then((data) => {
                const normalized = data.map((event) => ({
                    ...event,
                    media: Array.isArray(event.media) ? event.media : [],
                }));
                setEvents(normalized);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };



    useEffect(() => {
        // Make sure the socket is connected (if it's not managed globally elsewhere)
        // if (!socket.connected) {
        //   socket.connect(); // You might need this if your socket isn't auto-connecting on import
        // }

        // Handle new event
        socket.on('new-event', (newEvent) => {
            // Ensure media is normalized if the backend doesn't send it as array
            const normalizedNewEvent = {
                ...newEvent,
                media: Array.isArray(newEvent.media) ? newEvent.media : [],
            };
          setEvents((prevEvents = []) => [normalizedNewEvent, ...prevEvents]);
            // Also update 'My Events' if the new event was created by the current user
            if (user && normalizedNewEvent.user_id === user.id) {
                setMyEvents((prevMyEvents) => [normalizedNewEvent, ...prevMyEvents]);
            }
        });

        // Handle updated event
        socket.on('event-updated', (updatedEvent) => {
            // Ensure media is normalized
            const normalizedUpdatedEvent = {
                ...updatedEvent,
                media: Array.isArray(updatedEvent.media) ? updatedEvent.media : [],
            };

            setEvents((prevEvents) =>
                prevEvents.map((event) =>
                    event.id === normalizedUpdatedEvent.id ? { ...event, ...normalizedUpdatedEvent } : event
                )
            );
            setAttendingEvents((prevAttending) =>
                prevAttending.map((event) =>
                    event.id === normalizedUpdatedEvent.id ? { ...event, ...normalizedUpdatedEvent } : event
                )
            );
            setMyEvents((prevMyEvents) =>
                prevMyEvents.map((event) =>
                    event.id === normalizedUpdatedEvent.id ? { ...event, ...normalizedUpdatedEvent } : event
                )
            );
        });

        // Handle event deleted (optional, but good for completeness)
        socket.on('event-deleted', (deletedEventId) => {
            setEvents((prevEvents) => prevEvents.filter(event => event.id !== deletedEventId));
            setAttendingEvents((prevAttending) => prevAttending.filter(event => event.id !== deletedEventId));
            setMyEvents((prevMyEvents) => prevMyEvents.filter(event => event.id !== deletedEventId));
        });

        return () => {
            socket.off('new-event');
            socket.off('event-updated');
            socket.off('event-deleted'); // Clean up if you add a delete listener
            // DO NOT socket.disconnect() here unless it's explicitly designed to be a short-lived, component-specific socket connection
        };
    }, [user]); // Add `user` to dependency array if `user.id` is used in new-event logic


    // Function to fetch attending events
    const fetchAttendingEvents = () => {
        setAttendingLoading(true);
        fetch(`${BASE_URL}/api/events/attending`, {
            method: 'GET',
            headers: {
                authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch attending events');
                return res.json();
            })
            .then((data) => {
                const normalized = data.map((event) => ({
                    ...event,
                    media: Array.isArray(event.media) ? event.media : [],
                }));
                setAttendingEvents(normalized);
                setAttendingLoading(false);
            })
            .catch((err) => {
                setAttendingError(err.message);
                setAttendingLoading(false);
            });
    };

    // Function to fetch my events
    const fetchMyEvents = () => {
        setMyEventsLoading(true);
        fetch(`${BASE_URL}/api/events/mine`, {
            method: 'GET',
            headers: {
                authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch my events');
                return res.json();
            })
            .then((data) => {
                const normalized = data.map((event) => ({
                    ...event,
                    media: Array.isArray(event.media) ? event.media : [],
                }));
                setMyEvents(normalized);
                setMyEventsLoading(false);
            })
            .catch((err) => {
                setMyEventsError(err.message);
                setMyEventsLoading(false);
            });
    };

    // Initial fetch and fetch on refreshKey change
    useEffect(() => {
        fetchAllEvents();
        fetchAttendingEvents();
        fetchMyEvents();
        fetchBusinessEvents();  // add this line
    }, [refreshKey]); // This now handles all initial fetches and full refreshes

const handleRSVP = async (eventId, isAttending, isBusinessEvent = false) => {
  setRsvpLoading((prev) => ({ ...prev, [eventId]: true }));

  const updateEventInListOptimistic = (list, eventIdToUpdate, newRsvpStatus) => {
    return list.map((event) =>
      event.id === eventIdToUpdate
        ? { ...event, user_rsvp_status: newRsvpStatus }
        : event
    );
  };

  const originalEvents = events;
  const originalAttendingEvents = attendingEvents;
  const originalMyEvents = myEvents;
  const originalBusinessEvents = businessEvents;

  // Optimistically update correct list
  if (isBusinessEvent) {
    setBusinessEvents((prev) =>
      updateEventInListOptimistic(prev, eventId, isAttending ? null : 'interested')
    );
  } else {
    setEvents((prev) =>
      updateEventInListOptimistic(prev, eventId, isAttending ? null : 'interested')
    );
  }

  if (isAttending) {
    setAttendingEvents((prev) => prev.filter((event) => event.id !== eventId));
  } else {
    const eventToRsvp = (isBusinessEvent ? businessEvents : events).find((event) => event.id === eventId);
    if (eventToRsvp) {
      const normalizedEventToRsvp = {
        ...eventToRsvp,
        media: Array.isArray(eventToRsvp.media) ? eventToRsvp.media : [],
        user_rsvp_status: 'interested',
      };
      setAttendingEvents((prev) => [...prev, normalizedEventToRsvp]);
    }
  }

  setMyEvents((prev) =>
    updateEventInListOptimistic(prev, eventId, isAttending ? null : 'interested')
  );

  try {
    let res;

    if (!isAttending) {
      res = await fetch(
        isBusinessEvent
          ? `${BASE_URL}/api/businessevents/${eventId}/attend`
          : `${BASE_URL}/api/events/${eventId}/rsvp`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      res = await fetch(
        isBusinessEvent
          ? `${BASE_URL}/api/businessevents/${eventId}/attend`
          : `${BASE_URL}/api/events/${eventId}/rsvp`,
        {
          method: 'DELETE',
          headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update RSVP');

    toaster.create({
      title: 'RSVP updated',
      description: isAttending
        ? 'You are no longer attending.'
        : 'You have marked yourself as interested.',
      type: isAttending ? 'warning' : 'success',
      duration: 3000,
      isClosable: true,
    });
  } catch (err) {
    // Revert optimistic updates on error
    setEvents(originalEvents);
    setAttendingEvents(originalAttendingEvents);
    setMyEvents(originalMyEvents);
    setBusinessEvents(originalBusinessEvents);

    toaster.create({
      title: 'Error',
      description: err.message,
      type: 'error',
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setRsvpLoading((prev) => ({ ...prev, [eventId]: false }));
  }
};



    //Delete an Event

    const handleDeleteEvent = async (eventId) => {
        try {
            const res = await fetch(`${BASE_URL}/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete event');

            toaster.create({
                title: 'Event deleted',
                description: 'Your event has been successfully deleted.',
                type: 'success',
                duration: 3000,
                isClosable: true,
            });

            // Optimistic UI update
            setEvents((prev) => prev.filter((event) => event.id !== eventId));
            setMyEvents((prev) => prev.filter((event) => event.id !== eventId));
            setAttendingEvents((prev) => prev.filter((event) => event.id !== eventId));

            // No need to manually refresh since your socket handles deletion too
        } catch (err) {
            toaster.create({
                title: 'Error',
                description: err.message,
                type: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };


    const enrichEvents = (eventsList) =>
        (eventsList || []).map(event => ({
            ...event,
            isOwner: event.user_id === user?.id,
            isAttending: event.user_rsvp_status === 'interested',
        }));

    return (
        <div>
            <Tabs.Root defaultValue="Near me" variant="plain" size= "sm">
                <Tabs.List bg="bg.muted" rounded="l3" p="1" >
                    <Tabs.Trigger value="Near me">
                        <LuUser />
                        Near me
                    </Tabs.Trigger>
                    <Tabs.Trigger value="my events">
                        <LuFolder />
                        My events
                    </Tabs.Trigger>
                    <Tabs.Trigger value="Attending">
                        <LuSquareCheck />
                        Attending
                    </Tabs.Trigger>
                    <Tabs.Trigger value="Businesses">
                        <LuSquareCheck />
                        Business events
                    </Tabs.Trigger>
                    <Tabs.Indicator rounded="l2" />
                </Tabs.List>
                <Tabs.Content value="Near me">
                    <RadiusSlider radiusKm={radiusKm} setRadiusKm={setRadiusKm} />



                    <EventCard
                        events={enrichEvents(events)}
                        user={user}
                        handleRSVP={handleRSVP}
                        rsvpLoading={rsvpLoading}
                        onEditEvent={onEditEvent}
                        onDeleteEvent={handleDeleteEvent}
                    />
                </Tabs.Content >
                <Tabs.Content value="my events" >
                    {myEventsLoading ? ( // Use specific loading state for each tab
                        <Spinner />
                    ) : myEventsError ? (
                        <Text color="red.500">Error: {myEventsError}</Text>
                    ) : (
                        <EventCard
                            events={enrichEvents(myEvents)}
                            handleRSVP={handleRSVP}
                            rsvpLoading={rsvpLoading}
                            onEditEvent={onEditEvent}
                            onDeleteEvent={handleDeleteEvent}
                        />

                    )}
                </Tabs.Content>
                <Tabs.Content value="Attending">
                    {attendingLoading ? ( // Use specific loading state for each tab
                        <Spinner />
                    ) : attendingError ? (
                        <Text color="red.500">Error: {attendingError}</Text>
                    ) : (
                        <EventCard
                            events={enrichEvents(attendingEvents)}
                            handleRSVP={handleRSVP}
                            rsvpLoading={rsvpLoading}
                            onEditEvent={onEditEvent}
                            onDeleteEvent={handleDeleteEvent}
                        />

                    )}
                </Tabs.Content>
                 <Tabs.Content value="Businesses">


  {businessEventsLoading ? (
    <Spinner />
  ) : businessEventsError ? (
    <Text color="red.500">Error: {businessEventsError}</Text>
  ) : (
    <EventCard
      events={enrichEvents(businessEvents)}
      handleRSVP={handleRSVP}
      rsvpLoading={rsvpLoading}
      onEditEvent={onEditEvent}
      onDeleteEvent={handleDeleteEvent}
    />
  )}
</Tabs.Content>
            </Tabs.Root>
        </div>
    );
};

export default EventFeed;