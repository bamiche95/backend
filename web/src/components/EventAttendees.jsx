import React, { useEffect, useState } from 'react';
import {
    Box,
    Avatar,
    Text,
    CloseButton,
    Flex,
    Dialog,
    Spinner,
    Alert,

    Heading,
    HStack,
    Portal,
    For,
    Button,
    Stack
} from '@chakra-ui/react';
import { BASE_URL, getToken } from "../config"; // Your API base URL

const EventAttendees = ({ eventId }) => {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttendees = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/events/${eventId}/attendees`, {
                   headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

                });
                if (!res.ok) throw new Error('Failed to fetch attendees');
                const data = await res.json();
                setAttendees(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendees();
    }, [eventId]);

    if (loading) return <Spinner />;
    if (error)
        return (

            <Alert.Root status="error" mb={4}>
                <Alert.Indicator />
                <Alert.Content>

                    {error}
                </Alert.Content>
            </Alert.Root>


        );

    if (attendees.length === 0)
        return <Text>No one has RSVP'd to this event yet.</Text>;

    return (

        <>




            <HStack wrap="wrap" gap="4">
                <For each={["center"]}>
                    {(placement) => (
                        <Dialog.Root
                            key={placement}
                            placement={placement}
                            motionPreset="slide-in-bottom"
                        >
                            <Dialog.Trigger asChild>
                                <Button variant="outline">View attendees</Button>
                            </Dialog.Trigger>
                            <Portal>
                                <Dialog.Backdrop />
                                <Dialog.Positioner>
                                    <Dialog.Content>
                                        <Dialog.Header>
                                            <Dialog.Title>Attendees</Dialog.Title>
                                        </Dialog.Header>
                                        <Dialog.Body>
                                       
                                                
                                               




<Stack gap="8">
       {attendees.map((user) => (
        <HStack key={user.userid} gap="4">
          <Avatar.Root>
            <Avatar.Fallback name={user.username} />
            <Avatar.Image src={user.profile_picture}/>
          </Avatar.Root>
          <Stack gap="0">
            <Text fontWeight="medium">{`${user.firstname} ${user.lastname}`}</Text>
            <Text color="fg.muted" textStyle="sm">
              {user.username}
            </Text>
          </Stack>
        </HStack>
      ))}
    </Stack>



                                                    
                                                   
                                             





                                           
                                        </Dialog.Body>
                                        <Dialog.CloseTrigger asChild>
                                            <CloseButton size="sm" />
                                        </Dialog.CloseTrigger>
                                    </Dialog.Content>
                                </Dialog.Positioner>
                            </Portal>
                        </Dialog.Root>
                    )}
                </For>
            </HStack>

        </>
    );
};

export default EventAttendees;






