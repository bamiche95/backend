import React, { useEffect, useState } from 'react';
import { BASE_URL, getToken } from "../config";
import { useParams } from 'react-router-dom';
import ChatModal from '../components/ChatModal';
import ProfilePostTabs from '../components/ProfilePostTabs';
import { ThumbsUp, Waypoints, MessageSquare, Bookmark } from 'lucide-react';
import FriendListCard from '../components/FriendListCard';
import SuggestionsNearYou from '../components/SuggesstionsNearYou';
import BusinessesNearYou from '../components/BusinessesNearYou';
import SidebarMenu from '../components/SideBarMenu';
import EditProfile from '../components/EditProfile';
import { defineStyle, Image, HStack } from "@chakra-ui/react";
import { getUserProfileCommentsSummary } from '../api/comment';
import { getUserProfileLikesSummary } from '../api/like';
import { getUserProfileTotalSavesExcludingOwn } from '../api/save';
import { useAuth } from '@/context/AuthContext';

const ringCss = defineStyle({
    outlineWidth: "3px",
    outlineColor: "colorPalette.500",
    outlineOffset: "2px",
    outlineStyle: "solid",
    boxShadow: '5px 5px 5px 0px rgba(0, 0, 0, 0.29)'
});

const UserProfile = () => {
    const [userData, setUserData] = useState(null);
    const [form, setForm] = useState({
        profilePreview: '',
        bannerPreview: '',
        username: '',
        firstname: '',
        lastname: '',
        email: '',
        occupation: '',
        bio: '',
        latitude: '',
        longitude: '',
        address: '',
    });
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [totalLikes, setTotalLikes] = useState(0);
    const [totalComments, setTotalComments] = useState(0);
    const [totalSavesExcludingOwn, setTotalSavesExcludingOwn] = useState(0);

    const defaultBanner = `/uploads/profile_banners/default_banner.jpg`;
    const { refreshUser } = useAuth();

    const { userId } = useParams();

    useEffect(() => {
        // The conversation fetch isn't strictly necessary here if only for this modal
        // and not displaying a list of conversations in the UserProfile UI.
        // If it's not used elsewhere, you can remove it.
        // fetch(`${BASE_URL}/api/messages/conversations`, { credentials: "include" })
        //     .then(res => res.json())
        //     .then(setConversations)
        //     .catch(console.error);

        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Get the profile being viewed
                const profileRes = await fetch(
                    userId
                        ? `${BASE_URL}/api/user/profile/${userId}`
                        : `${BASE_URL}/api/user/profile`,
                    { headers: { Authorization: `Bearer ${getToken()}` } }
                );
                const profileData = await profileRes.json();
                setUserData(profileData);
                setForm({
                    ...profileData,
                    profilePreview: profileData.profile_picture || '',
                    bannerPreview: profileData.banner_image || '',
                    latitude: profileData.latitude || null,
                    longitude: profileData.longitude || null,
                    address: profileData.address || '',
                });

                // 2. Get the current logged-in user's ID
                const currentRes = await fetch(`${BASE_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const currentData = await currentRes.json();
                setCurrentUser(currentData);

                if (profileData && profileData.userid) {
                    const likesCount = await getUserProfileLikesSummary(profileData.userid);
                    setTotalLikes(likesCount);

                    const commentsCount = await getUserProfileCommentsSummary(profileData.userid);
                    setTotalComments(commentsCount);

                    const savesCount = await getUserProfileTotalSavesExcludingOwn(profileData.userid);
                    setTotalSavesExcludingOwn(savesCount);
                }

            } catch (err) {
                console.error('Failed to load profile data, summaries, or saves:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationChange = ({ latitude, longitude, address }) => {
        console.log('Location changed:', { latitude, longitude, address });
        setForm((prevForm) => ({
            ...prevForm,
            latitude,
            longitude,
            address,
        }));
    };

    const handleSubmit = e => {
        e.preventDefault();
        console.log("UserProfile - Submitting form data:", form);

        fetch(`${BASE_URL}/api/user/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(form),
        })
            .then(res => res.json())
            .then(async data => {
                if (data.success) {
                    setUserData(form);
                    await refreshUser();
                } else {
                    alert(data.error || 'Failed to update profile');
                }
            })
            .catch(err => {
                console.error('Update error:', err);
                alert('Error updating profile');
            });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            profilePreview: previewUrl,
        }));

        const formData = new FormData();
        formData.append('profilePicture', file);

        fetch(`${BASE_URL}/api/user/profile-picture`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setForm((prev) => ({ ...prev, profile_picture: data.imageUrl }));
                } else {
                    alert(data.error || 'Failed to upload profile picture');
                }
            })
            .catch((err) => {
                console.error('Upload error:', err);
                alert('Error uploading profile picture');
            });
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            bannerPreview: previewUrl,
        }));

        const formData = new FormData();
        formData.append('bannerImage', file);

        fetch(`${BASE_URL}/api/user/banner-image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setForm((prev) => ({ ...prev, banner_image: data.imageUrl }));
                } else {
                    alert(data.error || 'Failed to upload banner image');
                }
            })
            .catch((err) => {
                console.error('Upload error:', err);
                alert('Error uploading banner image');
            });
    };

    if (loading || !userData || !currentUser) {
        return <p>Loading profile...</p>;
    }

    const { username, created_at, profile_picture, banner_image, firstname, lastname, bio } = userData || {};
    const isOwnProfile = currentUser.userid === userData.userid;

    // --- IMPORTANT CHANGE HERE ---
    // Create the full recipient object with all necessary details
    const chatRecipientObject = userData ? {
        userid: userData.userid,
        username: userData.username,
        firstname: userData.firstname,
        lastname: userData.lastname,
        profile_picture: userData.profile_picture,
        // For a direct message from a user's profile, product_id, product_image, and product_title should be null or undefined.
        // ChatWindowHeader uses these to display product info, which isn't relevant for a direct profile message.
        product_id: null,
        product_image: null,
        product_title: null,
        // Add any other fields that `ChatWindow` or `ChatWindowHeader` might expect on the `recipient` prop
        // for consistent behavior (e.g., last_message_time, unread_count, etc., if applicable for a new chat).
    } : null;

    return (
        <>
            <div className='main-profile-container' style={{ marginTop: '0px', display: 'flex', flexDirection: 'row', width: '100%' }}>
                <div className='leftprofile-column' style={{ width: '20%', paddingTop: '20px', marginRight: '20px', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', margin: '20px ', height: '100vh', overflowY: 'hidden', boxSizing: 'border-box', }}>
                    <div style={{ display: 'flex', justifyContents: 'center', alignItems: 'center', gap: '15px', backgroundColor: 'coral', padding: '20px', borderLeft: 'solid black', color: 'white' }}>
                        <img src={profile_picture} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                        <h5>{firstname}</h5>
                    </div>
                    <SidebarMenu />
                </div>

                <div className='rightprofile-column' style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '100px', borderRadius: '8px', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', padding: '20px', margin: '20px 0', height: 'auto' }}>
                    <div width="100%" style={{ marginBottom: '20px', height: '500px', position: 'relative' }}>
                        <div width="100%" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                                src={banner_image || defaultBanner}
                                alt="Banner"
                                style={{ width: '100%', height: '400px', objectFit: 'cover', marginBottom: '20px' }}
                            />
                        </div>
                        <HStack >
                            <Image
                                css={ringCss} colorPalette="orange"
                                src={profile_picture}

                                borderRadius="full"
                                fit="cover"
                                alt={username}
                                style={{ position: 'absolute', left: '30px', width: '100px', height:'100px' }}
                                className='profileImage'
                            />
                        </HStack>

                        <div style={{ marginLeft: '130px', padding: '20px', borderRadius: '8px', display: 'flex', position: 'absolute', top: '390px', width: 'calc(100% - 100px)' }}>
                            <div className='user-info' style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{firstname} {lastname}</span>
                                <span style={{
                                    backgroundColor: 'coral',
                                    borderRadius: '23px',
                                    padding: '5px 10px',
                                    display: 'inline-block',
                                    width: 'fit-content',
                                }}>
                                    @{username}
                                </span>
                                <span>{userData.address}</span>
                                <span>Joined: {new Date(created_at).toLocaleDateString()}</span>
                                <span>
                                    {bio || 'Edit profile to write about yourself'}
                                </span>
                            </div>
                            <div>
                                <EditProfile
                                    form={form}
                                    handleChange={handleChange}
                                    handleSubmit={handleSubmit}
                                    handleImageUpload={handleImageUpload}
                                    handleBannerUpload={handleBannerUpload}
                                    handleLocationChange={handleLocationChange}
                                />
                                {/* --- IMPORTANT CHANGE HERE --- */}
                                {!isOwnProfile && currentUser && chatRecipientObject && (
                                    <ChatModal
                                        currentUser={{ id: currentUser.userid }}
                                        recipient={chatRecipientObject} // Pass the full structured object
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div width='100%' style={{ marginBottom: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '20px' }}>
                        <div className='your-insights' style={{ padding: '20px 3px 10px', borderRadius: '8px', backgroundColor: '#fff', width: '100%', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', }}>
                            <h5 >Your Insights</h5>
                            <div className='insghts-card' style={{ margin: '20px', padding: '60px', borderRadius: '8px', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                                    <ThumbsUp />
                                    <span>Likes</span>
                                    <span>{totalLikes}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                                    <MessageSquare />
                                    <span>Comments</span>
                                    <span>{totalComments}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                                    <Waypoints />
                                    <span>Shares</span>
                                    <span>25</span> {/* Placeholder */}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                                    <Bookmark />
                                    <span>Saves</span>
                                    <span>{totalSavesExcludingOwn}</span>
                                </div>
                            </div>

                            <div className='profile-posts' style={{ margin: '20px', padding: '10px', borderRadius: '8px', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)' }}>
                                <h5>Posts by You</h5>
                                <ProfilePostTabs
                                    profileUserId={userData.userid}
                                    currentLoggedInUserId={currentUser.userid}
                                />
                            </div>
                        </div>

                        <div className='suggestions-column' style={{ width: '30%', padding: '20px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)' }}>
                            <div >
                                <FriendListCard />
                            </div>
                            <SuggestionsNearYou />
                            <BusinessesNearYou />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserProfile;