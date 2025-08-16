import React, { useState, useEffect, useRef } from "react";
// Import the new CommentSection component
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import { reportPost } from '@/api/reportPosts';
import useFormattedDate from '@/Hooks/useFromattedDate';
import MediaLightbox from "./MediaLightbox";
import ShareModal from './ShareModal'; // Import the new ShareModal
import UserProfileCard from "./UserProfileCard";



const PostCard = ({
    post,
    currentUser,
    groupId,
    onEdit,
    onReport,
    onDelete,
    onComment,
    onShare,
    onSave,
    onLike,
    onSendComment, // This is handleGenericSubmit
    postType,
    commentText,
    setCommentText,
    mediaFiles,
    setMediaFiles,
    mediaPreview,
    setMediaPreview,
    handleGenericSubmit, // Pass this directly to CommentSection
    showComments,
    toggleShowComments,
    comments,
    onCommentsRefetchOrUpdate, // <- Add this
    setPosts,
    onCommentLikeToggle, // IMPORTANT: This prop is received from QuestionFeed
}) => {

    const [showDropdown, setShowDropdown] = useState(false);

    const postId = post.postId ?? post.id;

    const categoryName = post.categoryName;
    const professions = post.professions;
    const tipTitle = post.title;
    const alertType = post.type?.name;
    const alertTypeColor = post.type?.color;
    const alertIcon = post.type?.icon;

    const userName = post.user?.username || "unknown";
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);


    const [isSaved, setIsSaved] = useState(!!post.isSaved);
    const [isLiked, setIsLiked] = useState(!!post.isLiked);
    const [currentLikeCount, setCurrentLikeCount] = useState(post.likeCount || 0);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportError, setReportError] = useState(null);
    const [reportSuccess, setReportSuccess] = useState(false);
    const touchStartX = useRef(null);

        const [isShareModalOpen, setIsShareModalOpen] = useState(false); // NEW: State for Share Modal


const touchEndX = useRef(null);
    const format = useFormattedDate();
    const openReportModal = () => {
        setIsReportModalOpen(true);
        setReportError(null);
        setReportSuccess(false);
    };

    const closeReportModal = () => {
        setIsReportModalOpen(false);
    };

    const handleReportSubmit = async (postId, postType, reason, description) => {
        try {
            await reportPost({ postId, postType, reason, description });
            setReportSuccess(true);
            closeReportModal();
            // Show success message or toast if you want
        } catch (error) {
            setReportError(error.message);
        }
    };
    useEffect(() => {
        if (lightboxOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [lightboxOpen]);


    const toggleDropdown = () => setShowDropdown(!showDropdown);

    const createdDate = post.created_at || post.createdAt;
    const editedDate = post.editedAt || post.edited_at || post.updated_at || post.updatedAt;
    const userAvatar = post.profile_picture || post.user?.profilePicture || post.user?.avatar || "";
    const userFullName = post.fullname || post.user?.fullName || post.user?.fullname || post.user?.username || "Unknown";

    const getTextContent = () => {
        const html = post.content || post.description || post.title || "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || "";
    };

    const getMediaUrl = () => {
        if (post.media && post.media.length > 0) {
            return post.media.map(item => item.mediaUrl || item.url || item); // Return array
        }
        if (post.content) {
            const match = post.content.match(/<img\s+src="([^"]+)"/i);
            if (match) return match[1];
        }
        return null;
    };

    const mediaUrl = getMediaUrl();
    const textContent = getTextContent();


    const handleSaveClick = () => {
        onSave(postId, post.postType, isSaved, setIsSaved);
    };

    useEffect(() => {
        if (typeof post.isSaved === 'boolean' && post.isSaved !== isSaved) {
            setIsSaved(post.isSaved);
        }
    }, [post.isSaved, isSaved]);

    useEffect(() => {
        setIsLiked(!!post.isLiked);
        setCurrentLikeCount(post.likeCount || 0);
    }, [post.isLiked, post.likeCount]);

    const handleLikeClick = () => {
        onLike(post.id || post.postId || post.tipId || post.alertId, post.postType, isLiked, setIsLiked);
    };

    // The `comments[postId]` array is still managed by the parent,
    // and passed down to CommentSection.
// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e) => {
    if (!lightboxOpen) return;
    if (e.key === 'ArrowLeft') {
      setActiveMediaIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
    } else if (e.key === 'ArrowRight') {
      setActiveMediaIndex((prev) => (prev + 1) % post.media.length);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [lightboxOpen, post.media.length]);

// Swipe gesture detection
const handleTouchStart = (e) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchMove = (e) => {
  touchEndX.current = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  if (touchStartX.current === null || touchEndX.current === null) return;
  const delta = touchStartX.current - touchEndX.current;

  if (Math.abs(delta) > 50) {
    if (delta > 0) {
      // Swipe left
      setActiveMediaIndex((prev) => (prev + 1) % post.media.length);
    } else {
      // Swipe right
      setActiveMediaIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
    }
  }

  // Reset refs
  touchStartX.current = null;
  touchEndX.current = null;
};

 const generatePostUrl = () => {
        // This is a placeholder. You'll need to replace this with your actual
        // application's base URL and specific routing logic for each post type.
        const baseUrl = window.location.origin; // Gets e.g., "http://localhost:3000" or "https://yourdomain.com"
        const postIdActual = post.id || post.postId || post.tipId || post.alertId;

        switch (post.postType) {
            case 'discussion':
                return `${baseUrl}/discussions/${postIdActual}`;
            case 'question':
                return `${baseUrl}/questions/${postIdActual}`;
            case 'tip':
                return `${baseUrl}/tips/${postIdActual}`;
            case 'alert':
                return `${baseUrl}/alerts/${postIdActual}`;
            case 'group': // <-- NEW: Handle 'group' post type
                // Ensure groupId is available when generating the URL for a group post
                // The groupId is passed as a prop to PostCard when it's rendered within a GroupFeed
                if (groupId) {
                    return `${baseUrl}/group/${groupId}?highlightPost=${postIdActual}`;
                }
                // Fallback if groupId is not provided for a group post (shouldn't happen if properly passed)
                return `${baseUrl}/feed?postId=${postIdActual}&type=${post.postType}`;
            // Add more cases for other post types if they have dedicated pages
            default:
                // Fallback for general posts, might link to a generic feed or home
                return `${baseUrl}/feed?postId=${postIdActual}&type=${post.postType}`;
        }
    };

    const postShareUrl = generatePostUrl(); // Generate the URL once
    return (

        <>

       
  

            <div className="post-card border rounded p-4 bg-white max-w-md mx-auto shadow-sm mb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {userAvatar ? (
                            <img
                                src={userAvatar}
                                alt={`${userFullName} avatar`}
                                className="w-10 h-10 rounded-full object-cover"
                                style={{ width: '40px' }}
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white"
                                style={{ width: '40px', height: '40px' }}
                                title={userFullName}
                            >
                                {userFullName?.charAt(0).toUpperCase() || "?"}
                               
                            </div>
                        )}

                        <div>
                             <UserProfileCard user={post.user} />
                            <p className="font-semibold">{userFullName}</p>
                            {userName && userName !== userFullName && (
                                <p className="text-xs text-gray-500">@{userName}</p>
                            )}
                            <p className="text-xs text-gray-500">
                                {!editedDate && format(createdDate)}
                                {editedDate && (
                                    <span className="ml-2 text-blue-500 font-medium" title={`Last edited: ${format(editedDate)}`}>
                                        Edited: {format(editedDate)}
                                    </span>
                                )}
                            </p>
                            {/* Ensure postType is displayed consistently, not always at the top of the card */}
                            {/* <p>Post type: {postType}</p> */}
                            <p>Post type: {postType}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={toggleDropdown}
                            aria-label="Post options"
                            className="p-1 hover:bg-gray-200 rounded"
                        >
                            ⋮
                        </button>
                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded shadow-md z-10">
                                <button
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                    onClick={() => {
                                        onEdit(post);
                                        setShowDropdown(false);
                                    }}
                                >
                                    Edit Post
                                </button>
                                <button onClick={openReportModal}>Report</button>

                                <button
                                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                    onClick={() => {
                                        onDelete(post.id, post.postType);
                                        setShowDropdown(false);
                                    }}
                                >
                                    Delete Post
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Post content */}
                {post.postType === 'tip' && (
                    <>
                        {tipTitle && (
                            <p className="text-sm text-gray-700 mt-1">
                                Title: <span className="font-medium text-blue-800">{tipTitle}</span>
                            </p>
                        )}
                        {categoryName && (
                            <p className="text-sm text-gray-700 mt-1">
                                Category: <span className="font-medium text-blue-800">{categoryName}</span>
                            </p>
                        )}
                    </>
                )}

                {post.postType === 'question' && professions && professions.length > 0 && (
                    <p className="text-sm text-gray-700 mt-1">
                        Looking for:
                        {professions.map((prof, index) => (
                            <span key={prof.proid || index} className="font-medium text-purple-800 ml-1">
                                {prof.name}{index < professions.length - 1 ? ',' : ''}
                            </span>
                        ))}
                    </p>
                )}

                {post.postType === 'alert' && (
                    <>
                        {alertType && (
                            <p className="text-sm text-gray-700 mt-1">
                                Alert Type:
                                <span
                                    className="font-medium ml-1"
                                    style={{ color: alertTypeColor || 'inherit' }}
                                >
                                    {alertIcon && <span>{alertIcon} </span>}
                                    {alertType}
                                </span>
                            </p>
                        )}
                        {post.urgency && (
                            <p className="text-sm text-red-600 font-semibold mt-1">
                                Urgency: {post.urgency.toUpperCase()}
                            </p>
                        )}
                    </>
                )}

                <div className="mb-4 whitespace-pre-wrap text-gray-800">
                    {post.content && <div dangerouslySetInnerHTML={{ __html: post.content }} />}
                    {post.description && !post.content && <p>{post.description}</p>}
                    {!post.content && !post.description && post.title && <p>{post.title}</p>}

                    {post.media && post.media.length > 0 && (
                        post.media.map((item, index) => {
                            const url = item.mediaUrl || item.url || item;
                            const isVideo = /\.(mp4|webm|ogg)$/i.test(url);

                            return isVideo ? (
                                <video
                                    key={index}
                                    src={url}
                                    controls
                                    style={{ height: '320px', width: '100%', maxHeight: '80vh' }}
                                    onClick={() => {
                                        setActiveMediaIndex(index);
                                        setLightboxOpen(true);
                                    }}
                                />
                            ) : (
                                <img
                                    key={index}
                                    src={url}
                                    alt={`Post media ${index}`}
                                    className="max-h-80 w-full object-contain rounded mt-2 cursor-pointer"
                                    onClick={() => {
                                        setActiveMediaIndex(index);
                                        setLightboxOpen(true);
                                    }}
                                />
                            );
                        })
                    )}

                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mb-4 text-gray-600">
                    <button onClick={() => toggleShowComments(postId)} className="flex items-center gap-1 hover:text-blue-600">
                        💬 Comment ({comments[postId]?.length || 0})
                    </button>
                    <button onClick={() => setIsShareModalOpen(true)} className="hover:text-blue-600">
                        🔄 Share
                    </button>
                    <button
                        onClick={handleSaveClick}
                        className={`flex items-center gap-1 ${isSaved ? 'text-green-600' : 'hover:text-green-600'}`}
                    >
                        {isSaved ? '✅ Saved' : '💾 Save'}
                    </button>
                    <button onClick={handleLikeClick} className={`flex items-center gap-1 ${isLiked ? 'text-red-600' : 'hover:text-red-600'}`}>
                        {isLiked ? '❤️ Liked' : '🤍 Like'} ({currentLikeCount})
                    </button>
                </div>

                {/* Render the CommentSection if comments are toggled */}
                {showComments[postId] && (
                    <CommentSection
                        postId={postId}
                        postType={postType} // Ensure postType is passed down
                        comments={comments[postId] || []}
                        currentUser={currentUser}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        mediaPreview={mediaPreview}
                        setMediaPreview={setMediaPreview}
                        handleGenericSubmit={handleGenericSubmit}
                        // IMPORTANT: Pass the onCommentLikeToggle down to CommentSection
                        onCommentLikeToggle={onCommentLikeToggle}
                        onCommentsRefetchOrUpdate={onCommentsRefetchOrUpdate}
                        groupId={groupId} // Pass groupId if available
                    />
                )}


                {isReportModalOpen && (
                    <ReportModal
                        postId={post.id}
                        postType={post.postType}
                        onClose={closeReportModal}
                        onSubmit={handleReportSubmit}
                        error={reportError}
                    />
                )}
                 {/* NEW: Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                postUrl={postShareUrl}
                postTitle={post.title || post.description || "A post from Vicinitti"} // Use appropriate post title
            />

                {reportSuccess && <p>Report submitted successfully.</p>}
                {reportError && <p style={{ color: 'red' }}>{reportError}</p>}
            </div>


          {lightboxOpen && (
  <MediaLightbox
    media={post.media}       // pass the media array
    initialIndex={activeMediaIndex}  // start at the clicked media index
    onClose={() => setLightboxOpen(false)}  // close lightbox handler
  />
)}
        </>

    );
};

export default PostCard;
