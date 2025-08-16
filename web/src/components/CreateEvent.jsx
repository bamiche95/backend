import {
    Button,
    CloseButton,
    Dialog,
    Portal,
    Input,
    Textarea,
    NativeSelect,
    Checkbox,
    Stack,
    Box,
    HStack,
    RadioGroup,
    Field,
    Fieldset,
    FileUpload,
    Image,
    IconButton,
    Flex,
} from '@chakra-ui/react';
import { BASE_URL, getToken } from "../config";
import Datetime from 'react-datetime';
import 'react-datetime/css/react-datetime.css';
import React, { useState, useEffect, useCallback } from 'react';
import { HiUpload, HiOutlineX } from 'react-icons/hi';
import LocationPicker from './LocationPicker';
import moment from 'moment';
import { toaster } from '@/components/ui/toaster';
const token = getToken(); // Get the token for authentication
var yesterday = moment().subtract(1, 'day');
var valid = function (current) {
    return current.isAfter(yesterday);
};

const CreateEvent = ({ eventToEdit, isOpen, onClose, onEventSaved }) => {
    const [eventName, setEventName] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [startDateTime, setStartDateTime] = useState(null);
    const [endDateTime, setEndDateTime] = useState(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringPattern, setRecurringPattern] = useState('');
    const [locationType, setLocationType] = useState('physical');
    const [onlineLink, setOnlineLink] = useState('');
    const [eventCategory, setEventCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [existingMedia, setExistingMedia] = useState([]);
    const [newlySelectedMedia, setNewlySelectedMedia] = useState([]);
    const [mediaUrlsToRemove, setMediaUrlsToRemove] = useState([]);

    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        address: '',
    });

    // Effect to populate form when eventToEdit changes
    useEffect(() => {
        if (eventToEdit) {
            setEventName(eventToEdit.title || '');
            setEventDescription(eventToEdit.description || '');
            setStartDateTime(eventToEdit.start_datetime ? moment(eventToEdit.start_datetime) : null);
            setEndDateTime(eventToEdit.end_datetime ? moment(eventToEdit.end_datetime) : null);
            setIsRecurring(eventToEdit.is_recurring || false);
            setRecurringPattern(eventToEdit.recurring_pattern || '');
            setLocationType(eventToEdit.location_type || 'physical');
            setOnlineLink(eventToEdit.online_link || '');
            setEventCategory(eventToEdit.category_id || '');

            setExistingMedia(
                Array.isArray(eventToEdit.media)
                    ? eventToEdit.media.filter(m => m && m.media_url && m.media_type)
                    : []
            );
            setNewlySelectedMedia([]);
            setMediaUrlsToRemove([]);
            setLocation({
                latitude: eventToEdit.latitude || null,
                longitude: eventToEdit.longitude || null,
                address: eventToEdit.physical_address || '',
            });
        } else {
            // Reset form for new event creation
            setEventName('');
            setEventDescription('');
            setStartDateTime(null);
            setEndDateTime(null);
            setIsRecurring(false);
            setRecurringPattern('');
            setLocationType('physical');
            setOnlineLink('');
            setEventCategory('');
            setExistingMedia([]);
            setNewlySelectedMedia([]);
            setMediaUrlsToRemove([]);
            setLocation({ latitude: null, longitude: null, address: '' });
        }
    }, [eventToEdit]);

    // Fetch categories (remains the same)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/event-categories`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch categories');
                }

                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        fetchCategories();
    }, []);

    const locationTypeOptions = [
        { label: 'Physical Address', value: 'physical' },
        { label: 'Online Link', value: 'online' },
        { label: 'Hybrid (Physical & Online)', value: 'hybrid' },
    ];

    let inputProps = {
        placeholder: 'dd/mm/yyyy HH:mm',
    };

    const handleFileChange = useCallback(({ acceptedFiles }) => {
        setNewlySelectedMedia(prev => [
            ...prev,
            ...acceptedFiles.filter(file => !prev.some(f => f.name === file.name && f.size === file.size))
        ]);
    }, []);

    const handleRemoveNewlySelectedMedia = useCallback((fileIndex) => {
        setNewlySelectedMedia(prevFiles => prevFiles.filter((_, index) => index !== fileIndex));
    }, []);

    const handleRemoveExistingMedia = useCallback((mediaUrl) => {
        if (!mediaUrl) return;

        setMediaUrlsToRemove((prev) => {
            if (!prev.includes(mediaUrl)) {
                return [...prev, mediaUrl];
            }
            return prev;
        });

        setExistingMedia((prevMedia) => {
            const updated = prevMedia.filter(media => media.media_url !== mediaUrl);
            return updated;
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!eventToEdit;
        let originalEventState = null; // To store original state for rollback
        let originalExistingMedia = [...existingMedia]; // Copy of existing media for rollback

        // 1. Optimistic Update/Creation
        if (isEditing) {
            originalEventState = { ...eventToEdit }; // Store a copy of the event before modification
            // Optimistically update existing media by removing those marked for removal
            const updatedExistingMediaOptimistic = existingMedia.filter(media => !mediaUrlsToRemove.includes(media.media_url));
            setExistingMedia(updatedExistingMediaOptimistic);
            // We can't optimistically show newly added media before upload, so that's handled after successful response.
        } else {
        
        }
        
        // Optimistically close the dialog and show success toast immediately
        toaster.create({
            title: 'Processing...',
            description: `Event ${isEditing ? 'updating' : 'creating'}...`,
            type: 'info',
            duration: 1500, // Show for a short time
            isClosable: true,
        });
        onClose(); // Close the dialog immediately for a snappier feel

        try {
            const formData = new FormData();

            formData.append('eventName', eventName);
            formData.append('eventDescription', eventDescription);
            formData.append('startDateTime', startDateTime ? startDateTime.toISOString() : '');
            formData.append('endDateTime', endDateTime ? endDateTime.toISOString() : '');
            formData.append('isRecurring', isRecurring);
            formData.append('recurringPattern', isRecurring ? recurringPattern : '');
            formData.append('locationType', locationType);

            if (locationType === 'physical' || locationType === 'hybrid') {
    formData.append('latitude', location?.latitude || '');
    formData.append('longitude', location?.longitude || '');
    formData.append('physicalAddress', location?.address || '');
} else {
    formData.append('latitude', '');
    formData.append('longitude', '');
    formData.append('physicalAddress', '');
}
            formData.append('onlineLink', (locationType === 'online' || locationType === 'hybrid') ? onlineLink : '');
            formData.append('eventCategory', eventCategory);

            if (newlySelectedMedia.length > 0) {
                newlySelectedMedia.forEach((file) => {
                    formData.append('mediaFiles', file);
                });
            }

            if (mediaUrlsToRemove.length > 0) {
                formData.append('mediaUrlsToRemove', JSON.stringify(mediaUrlsToRemove));
            }

            let response;
            if (isEditing) {
                response = await fetch(`${BASE_URL}/api/events/${eventToEdit.id}`, {
                    method: 'PUT',
                    headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },

                    body: formData,
                });
            } else {
                response = await fetch(`${BASE_URL}/api/events`, {
                    method: 'POST',
                    headers: {
                        authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: formData,
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} event`);
            }

            const result = await response.json(); // Get the updated/created event data from the server

            // 2. Successful Server Response
         
            if (onEventSaved) {
                // Pass the result to onEventSaved so the parent can update its state with fresh data
                onEventSaved(result);
            }

            // Show success toast
            toaster.create({
                title: 'Success',
                description: `Event ${isEditing ? 'updated' : 'created'} successfully!`,
                type: 'success',
                duration: 3000,
                isClosable: true,
            });

            // Clear media states after successful submission
            setNewlySelectedMedia([]);
            setMediaUrlsToRemove([]);

        } catch (error) {
            console.error('Error saving event:', error);
           
            if (isEditing && originalEventState) {
                setExistingMedia(originalExistingMedia); // Revert to original existing media
              
            }

            
            if (!isOpen) { 
             
            }

            toaster.create({
                title: 'Error',
                description: error.message || 'An unexpected error occurred.',
                type: 'error',
                duration: 5000, // Longer duration for errors
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
       
        }
    };

    return (
        <Dialog.Root size="full" motionPreset="slide-in-bottom" open={isOpen} onOpenChange={onClose}>
            <Dialog.Trigger asChild>
                <div style={{ display: 'none' }} />
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content style={{ padding: '40px' }}>
                        <Dialog.Header>
                            <Dialog.Title>{eventToEdit ? 'Edit Event' : 'Create an Event'}</Dialog.Title>
                        </Dialog.Header>

                        <Dialog.Body>
                            <Fieldset.Root maxW="full">
                                <Stack spacing={4}>
                                    <Field.Root>
                                        <Field.Label>Title</Field.Label>
                                        <Input
                                            placeholder="Event title"
                                            value={eventName}
                                            onChange={(e) => setEventName(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </Field.Root>

                                    <Field.Root>
                                        <Field.Label>Description</Field.Label>
                                        <Textarea
                                            placeholder="Describe your event in detail"
                                            value={eventDescription}
                                            onChange={(e) => setEventDescription(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </Field.Root>

                                    <Field.Root>
                                        <Field.Label>Date & Time</Field.Label>
                                        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                                            <Datetime
                                                value={startDateTime}
                                                inputProps={inputProps}
                                                isValidDate={valid}
                                                onChange={(date) => setStartDateTime(date)}
                                                isDisabled={isSubmitting}
                                            />
                                            <Datetime
                                                value={endDateTime}
                                                inputProps={inputProps}
                                                isValidDate={valid}
                                                onChange={(date) => setEndDateTime(date)}
                                                isDisabled={isSubmitting}
                                            />
                                        </Stack>
                                    </Field.Root>

                                    <Field.Root>
                                        <Checkbox.Root
                                            checked={isRecurring}
                                            onCheckedChange={({ checked }) => setIsRecurring(checked === true)}
                                            disabled={isSubmitting}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>This is a recurring event</Checkbox.Label>
                                        </Checkbox.Root>
                                    </Field.Root>

                                    {isRecurring && (
                                        <Field.Root>
                                            <Field.Label>Recurring Pattern</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    value={recurringPattern}
                                                    onChange={(e) => setRecurringPattern(e.target.value)}
                                                    disabled={isSubmitting}
                                                >
                                                    <option value="">Select pattern</option>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    )}

                                    <Field.Root>
                                        <Field.Label>Location Type</Field.Label>
                                        <RadioGroup.Root
                                            value={locationType}
                                            onValueChange={(details) => setLocationType(details.value)}
                                            disabled={isSubmitting}
                                        >
                                            <HStack gap="6">
                                                {locationTypeOptions.map((item) => (
                                                    <RadioGroup.Item key={item.value} value={item.value}>
                                                        <RadioGroup.ItemHiddenInput />
                                                        <RadioGroup.ItemIndicator />
                                                        <RadioGroup.ItemText>{item.label}</RadioGroup.ItemText>
                                                    </RadioGroup.Item>
                                                ))}
                                            </HStack>
                                        </RadioGroup.Root>

                                        {(locationType === 'physical' || locationType === 'hybrid') && (
                                            <Stack mt={4}>
                                                <Field.Label>Physical Address</Field.Label>
                                                <LocationPicker
                                                    onLocationChange={(loc) => setLocation(loc)}
                                                    initialPosition={null}
                                                    initialAddress={eventToEdit ? eventToEdit.physical_address : null}
                                                    useDetailedAddress={true}
                                                    disabled={isSubmitting}
                                                />
                                                <Field.HelperText>Select or type the physical location of your event.</Field.HelperText>
                                            </Stack>
                                        )}

                                        {(locationType === 'online' || locationType === 'hybrid') && (
                                            <Stack mt={4}>
                                                <Field.Label>Online Link</Field.Label>
                                                <Input
                                                    type="url"
                                                    placeholder="e.g., https://zoom.us/my-meeting"
                                                    value={onlineLink}
                                                    onChange={(e) => setOnlineLink(e.target.value)}
                                                    disabled={isSubmitting}
                                                />
                                                <Field.HelperText>Provide the link for your online event.</Field.HelperText>
                                            </Stack>
                                        )}
                                    </Field.Root>

                                    <Field.Root>
                                        <Field.Label>Cover Image / Video</Field.Label>
                                        {/* Display existing media */}
                                        {existingMedia.length > 0 && (
                                            <Stack direction="row" wrap="wrap" mt={2} mb={4} gap={2}>
                                                {existingMedia.map((media) => (
                                                    <Box key={media.media_url} position="relative">
                                                        {media.media_type === 'image' ? (
                                                            <img src={media.media_url} width="100" height="100" style={{ borderRadius: '5px' }} alt="event media" />
                                                        ) : (
                                                            <video src={media.media_url} width="100" height="100" controls style={{ borderRadius: '5px' }} />
                                                        )}
                                                        <IconButton
                                                            icon={<HiOutlineX />}
                                                            aria-label="Remove media"
                                                            size="xs"
                                                            position="absolute"
                                                            top="2px"
                                                            right="2px"
                                                            colorScheme="red"
                                                            onClick={() => handleRemoveExistingMedia(media.media_url)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        )}

                                        <FileUpload.Root
                                            accept={['image/*', 'video/*']}
                                            onFileChange={handleFileChange}
                                            maxFiles={5}
                                            disabled={isSubmitting}
                                        >
                                            <FileUpload.HiddenInput />
                                            <FileUpload.Trigger asChild>
                                                <Button variant="outline" size="sm" disabled={isSubmitting}>
                                                    <HStack>
                                                        <HiUpload />
                                                        <Box>Upload new file(s)</Box>
                                                    </HStack>
                                                </Button>
                                            </FileUpload.Trigger>
                                        </FileUpload.Root>
                                        {newlySelectedMedia.length > 0 && (
                                            <Flex direction="row" wrap="wrap" mt={2} mb={4} gap={2}>
                                                {newlySelectedMedia.map((file, index) => (
                                                    <Box key={file.name + index} position="relative" width="100px" height="100px" border="1px solid lightgray" borderRadius="md" overflow="hidden">
                                                        {file.type.startsWith('image/') ? (
                                                            <Image src={URL.createObjectURL(file)} alt={file.name} objectFit="cover" width="100%" height="100%" onLoad={() => URL.revokeObjectURL(file.src)} />
                                                        ) : (
                                                            <video src={URL.createObjectURL(file)} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} onLoadedData={() => URL.revokeObjectURL(file.src)} />
                                                        )}
                                                        <IconButton
                                                            icon={<HiOutlineX />}
                                                            aria-label="Remove new media"
                                                            size="xs"
                                                            position="absolute"
                                                            top="2px"
                                                            right="2px"
                                                            colorScheme="red"
                                                            onClick={() => handleRemoveNewlySelectedMedia(index)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </Box>
                                                ))}
                                            </Flex>
                                        )}
                                        <Field.HelperText>Upload a compelling image or short video for your event (Max 5 files). Old files can be removed.</Field.HelperText>
                                    </Field.Root>
                                </Stack>
                                <Button type="submit" onClick={handleSubmit} colorScheme="blue" alignSelf="flex-end" mt={8} isLoading={isSubmitting}>
                                    {eventToEdit ? 'Update Event' : 'Create Event'}
                                </Button>
                            </Fieldset.Root>
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                        </Dialog.Footer>

                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="10px" right="10px" onClick={onClose} disabled={isSubmitting} />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
};

export default CreateEvent;