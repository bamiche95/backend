import React, { useState, useEffect, useRef } from 'react';

import { BASE_URL, getToken } from '../config';

import { useAuth } from '../context/AuthContext';

import QuestionTab from '../components/QuestionsTab';

import UserHeader from '../components/PostUserHeader';

import PostTypeTabs from '../components/PostTypeTabs';

import MediaAttachment from '../components/PostMediaAttachement';

import CreatePostButtons from '../components/CreatePostButtons';

import LocationPicker from '../components/LocationPicker';

import TipTab from '../components/TipTab';



// Import all edit handlers

import { handleEditAlert } from '../api/alert';

import { handleEditQuestion } from '../api/question';

import { handleEditTip } from '../api/tip';

import { handleEditDiscussion } from '../api/discussion';

import Modal from '../components/Modal'; // Import your custom Modal component

// Make sure setPosts is available as a prop for CreatePost

const CreatePost = ({ closeModal, setLoading, postToEdit = null, isEditing = false, groupId = null, setPosts, isOpen }) => {

    const [content, setContent] = useState(postToEdit?.content || '');

    const [files, setFiles] = useState([]);

    const modalRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);

    const { user } = useAuth();

    const [mediaPreview, setMediaPreview] = useState([]);

    const [mediaToDelete, setMediaToDelete] = useState([]);

    const [error, setError] = useState('');

    const [postType, setPostType] = useState(postToEdit?.postType || 'post');

    const [selectedProfessions, setSelectedProfessions] = useState(postToEdit?.professions || []);

    const [professionSearch, setProfessionSearch] = useState('');

    const [professionOptions, setProfessionOptions] = useState([]);

    const searchTimeoutRef = useRef(null);

    const [hasUserTyped, setHasUserTyped] = useState(false);

    const [userLocation, setUserLocation] = useState({ lat: null, lng: null });

    const [selectedAlertType, setSelectedAlertType] = useState('');

    const [alertTypes, setAlertTypes] = useState([]);

    const [tipData, setTipData] = useState({

        title: '',

        category: '',

        content: '',

    });
const token = getToken();
    // Add a local loading state for the modal itself

    const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);





    const handleProfessionInputChange = (e) => {

        setProfessionSearch(e.target.value);

        if (e.target.value.trim().length > 0) {

            setHasUserTyped(true);

        } else {

            setHasUserTyped(false);

        }

    };



    useEffect(() => {

        fetch(`${BASE_URL}/api/alert-types`)

            .then(res => res.json())

            .then(data => setAlertTypes(data))

            .catch(err => console.error('Failed to fetch alert types:', err));

    }, []);



    useEffect(() => {

        if (postType !== 'question') {

            setProfessionOptions([]);

            setHasUserTyped(false);

            return;

        }

        if (!hasUserTyped || professionSearch.trim() === '') {

            setProfessionOptions([]);

            return;

        }



        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);



        searchTimeoutRef.current = setTimeout(async () => {

            try {

                const queryParam = encodeURIComponent(professionSearch);

                const res = await fetch(`${BASE_URL}/api/professions?search=${queryParam}`, {
 headers: {
          authorization: `Bearer ${token}`,
        },

                });

                if (res.ok) {

                    const data = await res.json();

                    const filtered = data.filter(

                        (p) => !selectedProfessions.some((sel) => sel.proid === p.proid)

                    );

                    setProfessionOptions(filtered);

                } else {

                    console.error('Failed to fetch professions:', res.statusText);

                }

            } catch (err) {

                console.error('Failed to load professions:', err);

            }

        }, 300);



        return () => clearTimeout(searchTimeoutRef.current);

    }, [professionSearch, selectedProfessions, postType, hasUserTyped]);



    const addProfession = (prof) => {

        setSelectedProfessions((prev) => [...prev, prof]);

        setProfessionSearch('');

        setProfessionOptions([]);

        setHasUserTyped(false);

    };



    useEffect(() => {

        if (isEditing && postToEdit) {

            setPostType(postToEdit.postType || 'post');

            setContent(postToEdit.content || postToEdit.description || '');



            if (postToEdit.media && postToEdit.media.length > 0) {

                const previews = postToEdit.media.map((media) => ({

                    file: null,

                    preview: media.mediaUrl,

                    existing: true,

                    mediaUrl: media.mediaUrl,

                    mediaType: media.mediaType,

                }));

                setMediaPreview(previews);

            } else {

                setMediaPreview([]);

            }

            setMediaToDelete([]);

            setFiles([]);

        }

    }, [isEditing, postToEdit]);



    useEffect(() => {

        const fetchUser = async () => {

            try {

                const res = await fetch(`${BASE_URL}/api/me`, {

                    method: 'GET',

                    headers: {
                        authorization: `Bearer ${token}`,
                    },

                });



                if (res.ok) {

                    const data = await res.json();

                    setCurrentUser(data.user);

                } else {

                    console.error('Failed to fetch user session:', res.statusText);

                }

            } catch (err) {

                console.error('Error fetching session:', err);

            }

        };



        fetchUser();

    }, [BASE_URL]);



    useEffect(() => {

        const handleClickOutside = (event) => {

            if (modalRef.current && !modalRef.current.contains(event.target)) {

                closeModal();

            }

        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);

    }, [closeModal]);



    const handleFileChange = (e) => {

        const newFiles = Array.from(e.target.files);



        mediaPreview.forEach(p => {

            if (!p.existing && p.preview && p.preview.startsWith('blob:')) {

                URL.revokeObjectURL(p.preview);

            }

        });



        const newMediaPreviews = newFiles.map((file) => ({

            file,

            preview: URL.createObjectURL(file),

            existing: false,

            mediaType: file.type.startsWith('image') ? 'image' : 'video',

            mediaUrl: null

        }));



        setFiles(newFiles);

        setMediaPreview(prev => [

            ...prev.filter(p => p.existing),

            ...newMediaPreviews

        ]);

    };



    const removeMedia = (index) => {

        setMediaPreview((prev) => {

            const mediaToRemove = prev[index];

            const updatedMediaPreview = prev.filter((_, i) => i !== index);



            if (mediaToRemove) {

                if (mediaToRemove.existing) {

                    setMediaToDelete((oldMediaToDelete) => [...oldMediaToDelete, mediaToRemove.mediaUrl]);

                } else if (mediaToRemove.file && mediaToRemove.preview) {

                    URL.revokeObjectURL(mediaToRemove.preview);

                    setFiles((prevFiles) => prevFiles.filter((file) => file !== mediaToRemove.file));

                }

            }

            return updatedMediaPreview;

        });

    };



    const handleCreatePostSubmit = async () => {

        // Start local loading and also notify parent (if parent needs to know)

        setIsLocalSubmitting(true);

        setLoading(true); // Notify parent component (e.g., DiscussionFeed)

        setError('');



        if (postType === 'alert') {

            if (!userLocation.lat || !userLocation.lng) {

                setError('Please enable location or select location on the map.');

                setIsLocalSubmitting(false);

                setLoading(false);

                return;

            }

            if (!selectedAlertType) {

                setError('Please select an alert type.');

                setIsLocalSubmitting(false);

                setLoading(false);

                return;

            }

        }



        const formData = new FormData();



        if (postType !== 'tip' && postType !== 'discussion') {

            formData.append('content', content);

        }



        formData.append('postType', postType);

        files.forEach((file) => formData.append('mediaFiles', file));



        if (postType === 'alert') {

            formData.append('userId', user?.id);

            formData.append('alertTypeId', selectedAlertType.toString());

            formData.append('title', content.slice(0, 50));

            formData.append('description', content);

            formData.append('latitude', userLocation.lat.toString());

            formData.append('longitude', userLocation.lng.toString());

        } else if (postType === 'question' && selectedProfessions.length > 0) {

            selectedProfessions.forEach((p) => {

                formData.append('professions[]', p.proid);

            });

        } else if (postType === 'tip') {

            formData.append('title', tipData.title);

            formData.append('categoryId', tipData.categoryId);

            formData.append('content', tipData.content);

        } else if (postType === 'discussion') {

            formData.append('content', content);

        }



        let url = '';

        if (groupId) {

            url = `${BASE_URL}/api/creategrouppost/${groupId}/post`;

        } else {

            switch (postType) {

                case 'question':

                    url = `${BASE_URL}/api/createQuestion`;

                    break;

                case 'alert':

                    url = `${BASE_URL}/api/alerts`;

                    break;

                case 'tip':

                    url = `${BASE_URL}/api/nearby_tips`;

                    break;

                case 'discussion':

                    url = `${BASE_URL}/api/createDiscussionPost`;

                    break;

                default:

                    setError('Invalid post type for creation.');

                    setIsLocalSubmitting(false);

                    setLoading(false);

                    return;

            }

        }



        try {

            const res = await fetch(url, {

                method: 'POST',

                body: formData,

                headers: {
          authorization: `Bearer ${token}`,
        },

            });



            // We no longer explicitly call setPosts here for creation.

            // The parent component will listen for the WebSocket 'newDiscussionPost'/'newAlertPost' event.

            if (res.ok) {

                closeModal(); // Close modal on successful HTTP response

            } else {

                const data = await res.json(); // Still good to get error data

                setError(data.error || 'Failed to submit post');

            }

        } catch (err) {

            console.error('Submission error:', err);

            setError('An error occurred while submitting the post.');

        } finally {

            // Crucial: Always turn off local and parent loading state

            setIsLocalSubmitting(false);

            setLoading(false); // Notify parent component that submission is complete

        }

    };





    useEffect(() => {

        if (isEditing && postToEdit) {

            setPostType(postToEdit.postType || 'post');



            if (postToEdit.media && postToEdit.media.length > 0) {

                const previews = postToEdit.media.map(media => ({

                    file: null,

                    preview: media.mediaUrl,

                    existing: true,

                    mediaUrl: media.mediaUrl,

                    mediaType: media.mediaType,

                }));

                setMediaPreview(previews);

            } else {

                setMediaPreview([]);

            }

            setFiles([]);

            setMediaToDelete([]);



            switch (postToEdit.postType) {

                case 'alert':

                    setContent(postToEdit.description || '');

                    setSelectedAlertType(postToEdit.type?.id || '');

                    setUserLocation({

                        lat: postToEdit.location?.lat ? Number(postToEdit.location.lat) : null,

                        lng: postToEdit.location?.lng ? Number(postToEdit.location.lng) : null,

                    });

                    break;



                case 'question':

                    setContent(postToEdit.content || '');

                    setSelectedProfessions(postToEdit.professions || []);

                    break;



                case 'tip':

                    setTipData({

                        title: postToEdit.title || '',

                        categoryId: postToEdit.categoryId ? String(postToEdit.categoryId) : '',

                        content: postToEdit.content || '',

                    });

                    break;

                case 'discussion':

                    setContent(postToEdit.content || '');

                    break;



                default:

                    setContent(postToEdit.content || '');

                    break;

            }

        }

    }, [isEditing, postToEdit]);





    const handleEditPostSubmit = async () => {

        // For edits, we *do* want to update the feed directly after the HTTP response

        setIsLocalSubmitting(true);

        setLoading(true); // Notify parent component

        setError('');



        if (postType === 'tip') {

            if (!tipData.title.trim()) {

                setError('Tip title is required.');

                setIsLocalSubmitting(false);

                setLoading(false);

                return;

            }

            const categoryIdNum = parseInt(tipData.categoryId, 10);

            if (isNaN(categoryIdNum) || categoryIdNum <= 0) {

                setError('Please select a valid tip category.');

                setIsLocalSubmitting(false);

                setLoading(false);

                return;

            }

        }



        let updatedPost = null; // Variable to hold the updated post returned by the API handler



        try {

            switch (postType) {

                case 'alert':

                    updatedPost = await handleEditAlert({

                        postToEdit,

                        userLocation,

                        selectedAlertType,

                        content, // content here is the 'description' for alerts

                        mediaPreview,

                        files,

                        mediaToDelete,

                        setError,

                        setLoading: setIsLocalSubmitting, // Manage local loading

                        user,

                        BASE_URL,

                        groupId,

                    });

                    break;

                case 'tip':

                    updatedPost = await handleEditTip({

                        postToEdit,

                        title: tipData.title,

                        categoryId: tipData.categoryId,

                        content: tipData.content,

                        mediaPreview,

                        files,

                        mediaToDelete,

                        setError,

                        setLoading: setIsLocalSubmitting, // Manage local loading

                        user,

                        BASE_URL,

                        groupId,

                    });

                    break;

                case 'question':

                    updatedPost = await handleEditQuestion({

                        postToEdit,

                        selectedProfessions,

                        content,

                        mediaPreview,

                        files,

                        mediaToDelete,

                        setError,

                        setLoading: setIsLocalSubmitting, // Manage local loading

                        user,

                        BASE_URL,

                        groupId,

                    });

                    break;

                case 'discussion':

                    updatedPost = await handleEditDiscussion({

                        postToEdit,

                        content,

                        mediaPreview,

                        files,

                        mediaToDelete,

                        setError,

                        setLoading: setIsLocalSubmitting, // Manage local loading

                        user,

                        BASE_URL,

                        groupId,

                    });

                    break;

                default:

                    setError('Unsupported post type for editing.');

                    setIsLocalSubmitting(false);

                    setLoading(false); // Notify parent

                    return;

            }



            // If an updated post object is returned, update the main feed state

            // This is ONLY for edits, as WebSocket handles creation.

              if (updatedPost) {

                // NOW setPosts is available as a prop!

                // Directly use the setPosts prop to update the state in DiscussionFeed

                if (setPosts) { // Good practice to check if it's provided

                    setPosts(prevPosts =>

                        prevPosts.map(p =>

                            // Ensure you compare by the correct ID property (id for discussions, postId for others if applicable)

                            (p.id === updatedPost.id) ? updatedPost : p

                        )

                    );

                } else {

                    console.warn("setPosts prop was not provided to CreatePost. Feed might not update instantly after edit.");

                }



                closeModal();

            }

        } catch (err) {

            console.error("Error during edit submission:", err);

            setError(err.message || "An unexpected error occurred during edit submission.");

        } finally {

            setIsLocalSubmitting(false);

            setLoading(false);

        }

    };





return (
  <Modal isOpen={isOpen} onClose={closeModal} title={isEditing ? 'Edit Post' : 'Create Post'}>
    {/* Everything inside here is your existing CreatePost content */}

    <div className="modal-body" ref={modalRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column'}}>
      <UserHeader user={user} currentUser={currentUser} closeModal={closeModal} />

      <PostTypeTabs postType={postType} setPostType={setPostType} />

      {isLocalSubmitting && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          borderRadius: '12px',
        }}>
          <div className="spinner" />
          <p style={{ marginLeft: '10px', color: '#333' }}>Submitting...</p>
        </div>
      )}

      {postType !== 'tip' && (
        <textarea
          placeholder={
            postType === 'question' ? 'What would you like to ask the community?'
              : postType === 'alert' ? 'Share an important alert or warning...'
              : "What's on your mind?"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="post-textarea"
          disabled={isLocalSubmitting}
        />
      )}

      {postType === 'question' && (
        <QuestionTab
          professionSearch={professionSearch}
          handleProfessionInputChange={handleProfessionInputChange}
          professionOptions={professionOptions}
          addProfession={addProfession}
          selectedProfessions={selectedProfessions}
          setSelectedProfessions={setSelectedProfessions}
        />
      )}

      {postType === 'tip' && <TipTab tipData={tipData} setTipData={setTipData} />}

      {postType === 'alert' && (
        <>
          <select
            value={selectedAlertType}
            onChange={(e) => setSelectedAlertType(e.target.value)}
            required
            disabled={isLocalSubmitting}
          >
            <option value="" disabled>Select Alert Type</option>
            {alertTypes.map(type => (
              <option key={type.alert_type_id} value={type.alert_type_id}>{type.name}</option>
            ))}
          </select>

       <LocationPicker
  onLocationChange={({ latitude, longitude }) => setUserLocation({ lat: latitude, lng: longitude })}
  initialPosition={ // Changed from initialLocation to initialPosition to match LocationPicker's prop name
    isEditing && postToEdit?.location
      ? [Number(postToEdit.location.lat), Number(postToEdit.location.lng)]
      : null
  }
  // No need to pass initialAddress if you're not using it directly in LocationPicker's display,
  // but if you want the LocationPicker to display it initially, you can add:
  // initialAddress={isEditing && postToEdit?.location?.address || ''}
  disabled={isLocalSubmitting}
/>
        </>
      )}

      <MediaAttachment
        mediaPreview={mediaPreview}
        handleFileChange={handleFileChange}
        removeMedia={removeMedia}
        disabled={isLocalSubmitting}
      />

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <CreatePostButtons
        isEditing={isEditing}
        postType={postType}
        handleCreatePostSubmit={handleCreatePostSubmit}
        handleEditPostSubmit={handleEditPostSubmit}
        postToEdit={postToEdit}
        userLocation={userLocation}
        selectedAlertType={selectedAlertType}
        content={content}
        mediaPreview={mediaPreview}
        files={files}
        setError={setError}
        setLoading={setLoading}
        isSubmitting={isLocalSubmitting}
      />
    </div>
  </Modal>
);


};



export default CreatePost;