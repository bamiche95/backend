import React from 'react';
import { Box, Text, Flex, Image, Button, Stack, HStack, Avatar, Menu, Portal } from '@chakra-ui/react';
import EventAttendees from './EventAttendees';
import { EllipsisVertical } from 'lucide-react';

// Add onEditEvent to props
const EventCard = ({ events, user, handleRSVP, rsvpLoading, onEditEvent, onDeleteEvent }) => {
  if (!events || events.length === 0) {
    return <Text>No events to display in this category.</Text>;
  }
  return (
    <>
      {events.map((event) => {
        const { isOwner, isAttending } = event;

        const fullName = (event.firstname && event.lastname) ? event.firstname + ' ' + event.lastname : null;
        const fullName2 = (event.creator_firstname && event.creator_lastname) ? event.creator_firstname + ' ' + event.creator_lastname : null;
        const businessName = event.business_name;
        const mergedFullName = fullName || fullName2  || businessName ||'Unknown User';
        const profilePic = event.creator_profile_picture || event.profile_picture || event.business_logo;
        const userName = event.creator_username || event.username;
        const address = event.physical_address || event.business_address;
        return (
          <Box key={`${event.is_business_event ? 'business' : 'user'}-${event.id}`} className="event-card" p={4} mb={4} borderWidth="1px" borderRadius="md">
            <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Stack gap="8">
                <HStack key={userName} gap="4">
                  <Avatar.Root>
                    <Avatar.Fallback name={mergedFullName} />
                    <Avatar.Image src={profilePic} />
                  </Avatar.Root>
                  <Stack gap="0">
                    <Text fontWeight="medium">{mergedFullName}</Text>
                    <Text color="fg.muted" textStyle="sm">
                      {userName}
                    </Text>
                  </Stack>
                </HStack>
              </Stack>
              {isOwner && (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button variant="outline" size="sm">
                      <EllipsisVertical />
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content>
                        <Menu.Item value="edit" onClick={() => onEditEvent(event)}>
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          value="delete"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this event?')) {
                              onDeleteEvent(event.id);
                            }
                          }}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              )}
            </Box>

            <Text fontSize="xl" fontWeight="bold" mb={2}>
              {event.title}
            </Text>
            <Text mb={2}>{event.description}</Text>
            <Text mb={2} fontSize="sm" color="gray.600">
              {new Date(event.start_datetime).toLocaleString()} - {new Date(event.end_datetime).toLocaleString()}
            </Text>
            <Text mb={2}>
              {(event.location_type === 'physical' && event.physical_address || event.business_address)} 
              {event.location_type === 'online' && (
                <a href={event.online_link} target="_blank" rel="noreferrer" style={{ color: 'blue' }}>
                  {event.online_link}
                </a>
              )}
            </Text>
            <Text mb={2} fontStyle="italic">
              Category ID: {event.category_id || 'N/A'}
            </Text>

            {event.media && event.media.length > 0 && (
              <Flex mb={2}>
                {event.media[0].media_type === 'image' && (
                  <Image src={event.media[0].media_url} alt="Event media" maxH="150px" borderRadius="md" />
                )}
                {event.media[0].media_type === 'video' && (
                  <video controls width="250" style={{ borderRadius: 6 }}>
                    <source src={event.media[0].media_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </Flex>
            )}

            {!isOwner && (
             <Button
  colorScheme={isAttending ? 'gray' : 'teal'}
  mt={2}
onClick={() => handleRSVP(event.id, isAttending, !!event.is_business_event)}

  isLoading={rsvpLoading[event.id]}
  loadingText="RSVP'ing..."
  disabled={rsvpLoading[event.id]}
>
  {isAttending ? 'No longer attending' : 'I am attending'}
</Button>

            )}

            {isOwner && <EventAttendees eventId={event.id} />}
          </Box>
        );
      })}
    </>
  );
};

export default EventCard;