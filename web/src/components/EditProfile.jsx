import React, {useState, useEffect} from "react";
import {
    Button,
    CloseButton,
    Drawer,
    For,
    HStack,
    Portal,
    Input,
    Field,
    Fieldset,
    VStack,
    Box,
    Image,
    Center,
    Textarea,
    NativeSelect,
    Spinner
} from "@chakra-ui/react";
import { SquarePen } from "lucide-react";
import LocationPicker from "./LocationPicker"; // Make sure the path is correct
import { BASE_URL, getToken } from "../config";

const EditProfile = ({
    form,
    handleChange,
    handleSubmit,
    handleImageUpload,
    handleBannerUpload,
    handleLocationChange,
}) => {
    const [professions, setProfessions] = useState([]);
    const [loadingProfessions, setLoadingProfessions] = useState(false);
const token = getToken(); // Get the token for authentication
    useEffect(() => {
        console.log("Form updated in EditProfile:", form); // Added for debugging
    }, [form]);

    useEffect(() => {
        const fetchProfessions = async () => {
            setLoadingProfessions(true);
            try {
                const res = await fetch(`${BASE_URL}/api/professions`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const data = await res.json();
                setProfessions(data);
            } catch (err) {
                console.error("Error loading professions", err);
            } finally {
                setLoadingProfessions(false);
            }
        };

        fetchProfessions();
    }, []);



    return (
        <HStack wrap="wrap" justify="center">
            <For each={["full"]}>
                {(size) => (
                    <Drawer.Root key={size} size={size}>
                        <Drawer.Trigger asChild>
                            <Button variant="outline" size="sm" style={{backgroundColor: 'coral', color:'white'}}>
                               <SquarePen /> Edit Profile
                            </Button>
                        </Drawer.Trigger>

                        <Portal>
                            <Drawer.Backdrop />
                            <Drawer.Positioner>
                                <Drawer.Content display="flex" justifyContent="center">
                                    <Drawer.Header>
                                        <Drawer.Title>Edit Profile</Drawer.Title>
                                    </Drawer.Header>

                                    <Drawer.Body display="flex" justifyContent="center">
                                        <VStack spacing={6} align="center" width="100%">
                                            {/* Media Preview */}
                                            <Box position="relative" w="80%" borderRadius="md" overflow="hidden">
                                                {/* Banner Preview */}
                                                <Box
                                                    width="100%"
                                                    height="150px"
                                                    bg="gray.100"
                                                    overflow="hidden"
                                                    borderRadius="md"
                                                >
                                                    {form.bannerPreview && (
                                                        <Image
                                                            src={form.bannerPreview}
                                                            alt="Banner Preview"
                                                            objectFit="cover"
                                                            w="100%"
                                                            h="100%"
                                                        />
                                                    )}
                                                </Box>

                                                {/* Profile Picture Preview */}
                                                <Center
                                                    position="absolute"
                                                    bottom={-8}
                                                    left="50%"
                                                    transform="translateX(-50%)"
                                                    boxSize="100px"
                                                    border="4px solid white"
                                                    borderRadius="full"
                                                    overflow="hidden"
                                                    bg="gray.200"
                                                >
                                                    {form.profilePreview && (
                                                        <Image
                                                            src={form.profilePreview}
                                                            alt="Profile Preview"
                                                            boxSize="100%"
                                                            objectFit="cover"
                                                        />
                                                    )}
                                                </Center>
                                            </Box>

                                            <Box pt={12} w="80%">
                                                <Fieldset.Root>
                                                    <Fieldset.Legend>Edit Your Details</Fieldset.Legend>
                                                    <VStack spacing={4} align="stretch">
                                                        <Field.Root>
                                                            <Field.Label>Username</Field.Label>
                                                            <Input
                                                                name="username"
                                                                value={form.username || ""}
                                                                onChange={handleChange}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>First Name</Field.Label>
                                                            <Input
                                                                name="firstname"
                                                                value={form.firstname || ""}
                                                                onChange={handleChange}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Last Name</Field.Label>
                                                            <Input
                                                                name="lastname"
                                                                value={form.lastname || ""}
                                                                onChange={handleChange}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Email</Field.Label>
                                                            <Input
                                                                name="email"
                                                                value={form.email || ""}
                                                                onChange={handleChange}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Occupation</Field.Label>
                                                            {loadingProfessions ? (
                                                                <Spinner />
                                                            ) : (
                                                                <NativeSelect.Root>
                                                                    <NativeSelect.Field
                                                                        name="occupation"
                                                                        value={form.occupation}
                                                                        onChange={handleChange}
                                                                    >
                                                                        <option value="">Select occupation</option>
                                                                        {professions.map((p) => (
                                                                            <option key={p.proid} value={p.name}>
                                                                                {p.name}
                                                                            </option>
                                                                        ))}
                                                                    </NativeSelect.Field>
                                                                    <NativeSelect.Indicator />
                                                                </NativeSelect.Root>
                                                            )}
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Bio</Field.Label>
                                                            <Textarea
                                                                name="bio"
                                                                value={form.bio || ""}
                                                                onChange={handleChange}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Upload Profile Picture</Field.Label>
                                                            <Input type="file" onChange={handleImageUpload} />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Upload Banner Image</Field.Label>
                                                            <Input type="file" onChange={handleBannerUpload} />
                                                        </Field.Root>
                                                        <Field.Root>
                                                            <Field.Label>Location Details</Field.Label>
                                                            <Field.Root>
                                                                <Field.Label>Latitude</Field.Label>
                                                                <Input name="latitude" value={form.latitude || ''} readOnly />
                                                            </Field.Root>
                                                            <Field.Root>
                                                                <Field.Label>Longitude</Field.Label>
                                                                <Input name="longitude" value={form.longitude || ''} readOnly />
                                                            </Field.Root>
                                                            <Field.Root>
                                                                <Field.Label>Address</Field.Label>
                                                                <Input name="address" value={form.address || ''} readOnly /> {/* Added this line */}
                                                            </Field.Root>
                                                       <LocationPicker
            initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
            initialAddress={form.address || ''}
            // IMPORTANT CHANGE HERE: LocationPicker now passes the full object { latitude, longitude, address }
            // directly to handleLocationChange.
            onLocationChange={handleLocationChange} // <<< Pass handleLocationChange directly
        />
                                                        </Field.Root>
                                                    </VStack>
                                                </Fieldset.Root>
                                            </Box>
                                        </VStack>
                                    </Drawer.Body>

                                    <Drawer.Footer>
                                        <Drawer.ActionTrigger asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </Drawer.ActionTrigger>
                                        <Button onClick={handleSubmit}>Save</Button>
                                    </Drawer.Footer>

                                    <Drawer.CloseTrigger asChild>
                                        <CloseButton size="sm" />
                                    </Drawer.CloseTrigger>
                                </Drawer.Content>
                            </Drawer.Positioner>
                        </Portal>
                    </Drawer.Root>
                )}
            </For>
        </HStack>
    );
};

export default EditProfile;