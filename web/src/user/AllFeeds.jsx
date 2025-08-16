import { useEffect, useState, useRef } from 'react';
import { format } from 'timeago.js';
import emojiList from '../emojiList.json'; // Import the pre-generated JSON file
//import ReactModalImage from 'react-modal-image';
import { socket } from './Socket'; // Import socket
import { BASE_URL, getToken } from "../config";
import useGroupPage from '../groups/hooks/useGroupPage'; // Adjust the path if needed
import Lightbox from '../components/Lightbox';
import CommentBlock from '../components/CommentBlock';
import ReplyBlock from '../components/ReplyBlock'; // We'll build this next
import { SendHorizontal, LocateFixed, ImagePlay, Ellipsis, HeartPlus, Share, MessageSquareMore } from 'lucide-react'
import { HStack, Skeleton, SkeletonCircle, Stack, SkeletonText, Avatar, defineStyle, Text } from "@chakra-ui/react"
import ShareDrawer from '../components/ShareDrawer';
import ChatModal from '../components/ChatModal';
import { Link } from 'react-router-dom';



const MediaItem = ({ media, onClick, style, alt }) => (
  <div className="media" style={style}>
    {media.mediaType === "image" ? (
      <img
        src={media.mediaUrl}
        alt={alt || "Post Media"}
        className="img-fluid"
        onClick={onClick}
      />
    ) : media.mediaType === "video" ? (
      <video controls className="w-100" style={style}>
        <source src={media.mediaUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    ) : null}
  </div>
);

const renderMediaLayout = (mediaArray, openLightbox) => {
  const mediaLength = mediaArray.length;

  if (mediaLength === 1) {
    // Single media item
    const media = mediaArray[0];
    return (
      <div className="media-item full-width">
        {media.mediaType === 'image' ? (
          <img
            src={media.mediaUrl}
            alt={`media-0`}
            style={{ maxHeight: "400px", width: "100%", borderRadius: "23px", objectFit: "cover" }}
            onClick={() => openLightbox(mediaArray, 0)} // Pass full array and index
          />
        ) : media.mediaType === 'video' ? (
          <video style={{ height: "400px", width: "100%", borderRadius: "23px" }} controls
            onClick={() => openLightbox(mediaArray, 0)}>
            <source src={media.mediaUrl} type="video/mp4" />
          </video>
        ) : (
          <div>Unsupported media type</div>
        )}
      </div>
    );
  }

  if (mediaLength === 2) {
    // Two media items
    return (
      <div className="media-item two-column">
        {mediaArray.map((media, index) => (
          <div key={index} className="media-item">
            {media.mediaType === 'image' ? (
              <img
                src={media.mediaUrl}
                alt={`Post Media ${index}`}
                style={{ maxHeight: "200px", width: "100%", borderRadius: "23px", objectFit: "cover" }}
                onClick={() => openLightbox(mediaArray, index)} // Open lightbox on click
              />
            ) : media.mediaType === 'video' ? (
              <video style={{ maxHeight: "200px", width: "100%", borderRadius: "23px" }} controls>
                <source src={media.mediaUrl} type="video/mp4" />
              </video>
            ) : (
              <div>Unsupported media type</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (mediaLength > 3) {
    // More than three media items
    return (
      <div className="media-item more-than-three">
        {/* First full-width media */}
        <div className="media-item">
          {mediaArray[0].mediaType === 'image' ? (
            <img
              src={mediaArray[0].mediaUrl}
              alt="media-0"
              style={{ maxHeight: "400px", width: "100%" }}
              onClick={() => openLightbox(mediaArray, 0)}
            />
          ) : mediaArray[0].mediaType === 'video' ? (
            <video controls>
              <source src={mediaArray[0].mediaUrl} type="video/mp4" />
            </video>
          ) : (
            <div>Unsupported media type</div>
          )}
        </div>

        {/* Remaining media in a grid */}
        <div className="media three-columns">
          {mediaArray.slice(1, 3).map((media, index) => (
            <div key={index} className="media-item">
              {media.mediaType === 'image' ? (
                <img
                  src={media.mediaUrl}
                  alt={`Post Media ${index + 1}`} // Adjust alt index
                  style={{ maxHeight: "200px", width: "100%" }}
                  onClick={() => openLightbox(mediaArray, index + 1)}
                />
              ) : media.mediaType === 'video' ? (
                <video controls>
                  <source src={media.mediaUrl} type="video/mp4" />
                </video>
              ) : (
                <div>Unsupported media type</div>
              )}
            </div>
          ))}

          {/* Fourth media with overlay */}
          {mediaLength > 3 && (
            <div className="media overlay-container">
              <div className="media-item">
                {mediaArray[3].mediaType === 'image' ? (
                  <img
                    src={mediaArray[3].mediaUrl}
                    alt="Post Media 4"
                    style={{ maxHeight: "200px", width: "100%" }}
                    onClick={() => openLightbox(mediaArray, 3)}
                  />
                ) : mediaArray[3].mediaType === 'video' ? (
                  <video controls>
                    <source src={mediaArray[3].mediaUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div>Unsupported media type</div>
                )}
              </div>

              {mediaLength > 4 && (
                <div
                  className="remaining-media-overlay"
                  onClick={() => openLightbox(mediaArray, 4)}
                >
                  <span>+{mediaLength - 4} more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null; // Default for unsupported layouts
};


const AllFeeds = ({
  posts,
  setPosts,
  isMember,
  groupId,
  
  userId
}) => {


  const [loading, setLoading] = useState(true);
  const [showPickerFor, setShowPickerFor] = useState(null);
  const [reactions, setReactions] = useState({});
  const [lightboxImages, setLightboxImages] = useState([]); // To store images for lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false); // To control lightbox visibility
  // const [currentIndex, setCurrentIndex] = useState(0); // To track the current image index
  const emojiPickerRef = useRef(null); // Ref for emoji picker
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]); // State to store selected files
  const [commentText, setCommentText] = useState(""); // State for comment text
  const [comments, setComments] = useState({});
  const [visibleCommentSections, setVisibleCommentSections] = useState({}); // Tracks which post's comments are visible
  //comment media light box
  const [lightboxOpen, setLightboxOpen] = useState(false); // Track if lightbox is open
  const [currentMedia, setCurrentMedia] = useState(null); // Store the current media being viewed
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // Track which media in the list is being viewed
  const [currentUser, setCurrentUser] = useState(null);
  const [highlightedComments, setHighlightedComments] = useState({});
  const [replyText, setReplyText] = useState({});
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState({}); // Track visibility of the reply input for each comment
  const [attachedMedia, setAttachedMedia] = useState({});
  const fileInputRefs = useRef({});
  const [lightboxMedia, setLightboxMedia] = useState(null); // { mediaList: [], currentIndex: 0 }
  // const [likedComments, setLikedComments] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [editingReplyId, setEditingReplyId] = useState(null);  // Track the reply being edited
  const [editedReplyText, setEditedReplyText] = useState("");    // Store the edited content
  const [replyLikes, setReplyLikes] = useState({});  // Assuming this is how you want to track likes
  const [chatUser, setChatUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const ringCss = defineStyle({
    outlineWidth: "2px",
    outlineColor: "colorPalette.500",
    outlineOffset: "2px",
    outlineStyle: "solid",
  })

//Block user

const handleBlockUser = async (blockedUserId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/block-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocked_id: blockedUserId,
      }),
      credentials: 'include',  // <-- Important for auth/session
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }

    alert('User blocked successfully');
    // Optionally update UI here, like removing posts from blocked user

  } catch (error) {
    console.error('Error blocking user:', error);
    alert('Error blocking user');
  }
};



  //Fetch current user from session
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/session`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          setCurrentUser(data.user); // Set the current user
        }
      } catch (error) {
        console.error('Failed to fetch current user', error);
      }
    };

    fetchCurrentUser();
  }, []);


  const handleEditReplyClick = (replyId, currentContent) => {
    setEditingReplyId(replyId);  // Set the reply as being edited
    setEditedReplyText(currentContent);  // Pre-fill the textarea with the current reply content
  };


  const handleMentionClick = (commentId, fullname) => {
    setShowReplyInput((prev) => ({
      ...prev,
      [commentId]: true, // Show reply input for that comment
    }));

    setReplyText((prev) => ({
      ...prev,
      [commentId]: `@${fullname} `, // Pre-fill with @username
    }));
  };

  const handleLikeComment = async (commentId) => {
    try {

      if (!currentUser) {
        alert("User is not logged in.");
        return;
      }

      const isLiked = commentLikes[commentId]?.likedByUser || false;

      const endpoint = isLiked
        ? `${BASE_URL}/api/unlikeComment`
        : `${BASE_URL}/api/likeComment`;

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentId }),
      });

      if (!response.ok) {
        throw new Error("Error liking/unliking comment");
      }

      const result = await response.json();

      if (result.success) {
        // console.log(isLiked ? "Comment unliked!" : "Comment liked!");

        setCommentLikes((prev) => {
          const currentLikeCount = prev[commentId]?.likeCount || 0;
          return {
            ...prev,
            [commentId]: {
              likeCount: isLiked ? currentLikeCount - 1 : currentLikeCount + 1,
              likedByUser: !isLiked,
            },
          };
        });
      }
    } catch (error) {
      console.error("Error liking/unliking comment:", error);
      alert("Error liking/unliking comment. Please try again.");
    }
  };
  //Reply Likes


  // 1) Update fetchReplyLikes to accept either postIds or groupId
  const fetchReplyLikes = async ({ postIds = [], groupId = null }) => {
    try {
      // Build request payload
      const payload = groupId !== null
        ? { groupId }
        : { postIds };

      const response = await fetch(`${BASE_URL}/api/getReplyLikes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reply likes");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Unknown error");
      }

      const likesData = {};
      result.data.forEach(item => {
        likesData[item.replyCommentId] = {
          likeCount: item.likeCount,
          likedByCurrentUser: item.likedByUser.includes(currentUser?.id.toString()),
        };
      });

      setReplyLikes(prev => ({ ...prev, ...likesData }));
    } catch (error) {
      console.error("Error fetching reply likes:", error);
    }
  };

  useEffect(() => {
    if (groupId) {
      // on a group page, ignore postIds and fetch by group
      fetchReplyLikes({ groupId });
    } else {
      // regular feed
      const validPostIds = posts.map(p => p.postId).filter(Boolean);
      if (validPostIds.length) {
        fetchReplyLikes({ postIds: validPostIds });
      }
    }
  }, [posts, currentUser, groupId]);




  //Comment likes  

  const fetchCommentLikes = async (postIds) => {
    try {
      const response = await fetch(`${BASE_URL}/api/getCommentLikes`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch comment likes");
      }

      const result = await response.json();

      if (result.success) {
        const likesData = {};

        // result.data is now grouped by postId
        for (const postId in result.data) {
          result.data[postId].forEach(item => {
            likesData[item.commentId] = {
              likeCount: item.likeCount,
              likedByUser: item.likedByUser,
            };
          });
        }

        setCommentLikes(prevLikes => ({
          ...prevLikes,
          ...likesData,
        }));
      }
    } catch (error) {
      console.error("Error fetching comment likes:", error);
    }
  };




  useEffect(() => {
    const validPostIds = posts?.map(p => p.postId).filter(Boolean);

    if (validPostIds?.length) {
      fetchCommentLikes(validPostIds);
    }
  }, [posts]);




  const openMediaLightbox = (postId, commentId, mediaIndex) => {
    const commentMedia = comments[postId]?.find((comment) => comment.commentId === commentId)?.media;
    setCurrentMedia(commentMedia);
    setCurrentMediaIndex(mediaIndex);
    setLightboxOpen(true);
  };

  const closeMediaLightbox = () => {
    setLightboxOpen(false);
  };


  const goToPrevMedia = () => {
    setCurrentMediaIndex((prevIndex) =>
      prevIndex === 0 ? currentMedia.length - 1 : prevIndex - 1
    );
  };

  const goToNextMedia = () => {
    setCurrentMediaIndex((prevIndex) =>
      prevIndex === currentMedia.length - 1 ? 0 : prevIndex + 1
    );
  };

  //for Replies
  const openReplyMediaLightbox = (mediaList, index) => {
    setLightboxMedia({
      mediaList,
      currentIndex: index,
    });
  };




  const openLightbox = (mediaArray, startIndex = 0) => {
    // console.log("Media Array:", mediaArray); // Debugging
    if (!Array.isArray(mediaArray)) {
      console.error("mediaArray is not an array:", mediaArray);
      return;
    }
    const mediaUrls = mediaArray.map((media) => media.mediaUrl); // Extract media URLs
    //   console.log("Lightbox Media URLs:", mediaUrls); // Debugging
    setLightboxImages(mediaUrls);
    setCurrentImageIndex(startIndex); // Set the clicked image index
    setIsLightboxOpen(true);
  };


  // Function to close the lightbox
  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };


  // Navigate to the next image
  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % lightboxImages.length);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex - 1 + lightboxImages.length) % lightboxImages.length
    );
  };
  //
  const
    handleCommentTextChange = (postId, e) => {
      setCommentText(prev => ({
        ...prev,
        [postId]: e.target.value,
      }));
    };


  const handleFileUpload = (postId, e) => {
    const files = e.target.files;
    setSelectedFiles(prev => ({
      ...prev,
      [postId]: Array.from(files), // Storing selected files for that specific postId
    }));
  };

  const removeFile = (postId, fileIndex) => {
    setSelectedFiles((prevFiles) => {
      const updatedPostFiles = prevFiles[postId]?.filter((_, index) => index !== fileIndex);
      return {
        ...prevFiles,
        [postId]: updatedPostFiles,
      };
    });
  };

  //COMMENT AREA
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  const handleEditClick = (comment) => {
    setEditingCommentId(comment.commentId);
    setEditedContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedContent("");
  };

  const handleSaveEdit = async (commentId, postId, groupId = null) => {
    try {
      const response = await fetch(`${BASE_URL}/api/updateComment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          commentId,
          newContent: editedContent,
          groupId, // 👈 include this
        }),
      });

      const result = await response.json();

      if (result.success) {
        setComments(prevComments => ({
          ...prevComments,
          [postId]: prevComments[postId].map(comment =>
            comment.commentId === commentId
              ? { ...comment, content: editedContent, editedAt: result.editedAt }
              : comment
          ),
        }));
        setEditingCommentId(null);
        setEditedContent('');
      } else {
        console.error('Failed to update comment:', result.error);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };




  const handleSaveReplyEdit = async (replyId, postId, commentId, groupId = null) => {
    try {
      const response = await fetch(`${BASE_URL}/api/editReply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          replyId,
          newContent: editedReplyText,
          groupId, // Include this
        }),
      });

      const result = await response.json();

      if (result.success) {
        setComments(prevComments => ({
          ...prevComments,
          [postId]: prevComments[postId].map(comment => {
            if (comment.commentId === commentId) {
              return {
                ...comment,
                replies: comment.replies.map(reply =>
                  reply.commentId === replyId
                    ? { ...reply, content: editedReplyText, editedAt: new Date().toISOString() }
                    : reply
                )
              };
            }
            return comment;
          })
        }));

        setEditingReplyId(null);
        setEditedReplyText('');
      } else {
        console.error('Failed to update reply:', result.error);
      }
    } catch (error) {
      console.error('Error updating reply:', error);
    }
  };


  const handleCancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditedReplyText('');
  };


  //Preview attached media
  const handleMediaChange = (commentId, e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map((file) => {
      const type = file.type.startsWith("image") ? "image" : "video";
      const url = URL.createObjectURL(file); // 🔑 Create a preview URL
      return { file, url, type };
    });

    setAttachedMedia((prev) => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), ...newMedia],
    }));
  };
  //remove attached media
  const removeAttachedMedia = (commentId, index) => {
    setAttachedMedia((prev) => {
      const updatedMedia = [...prev[commentId]];
      URL.revokeObjectURL(updatedMedia[index].url); // 🔄 Cleanup
      updatedMedia.splice(index, 1);
      return {
        ...prev,
        [commentId]: updatedMedia,
      };
    });
  };


  const handleReplyTextChange = (commentId, e) => {
    setReplyText((prev) => ({
      ...prev,
      [commentId]: e.target.value,
    }));
  };


  const toggleCommentSection = (postId) => {
    setVisibleCommentSections((prevState) => ({
      ...prevState,
      [postId]: !prevState[postId], // Toggle visibility for the specific postId
    }));
  };

  const toggleReplyInput = (commentId) => {
    setShowReplyInput((prev) => ({
      ...prev,
      [commentId]: !prev[commentId], // Toggle the visibility of the reply input for this comment
    }));
  };

  const submitReply = async (postId, commentId, comment) => {
    setIsSubmittingReply(true);

    const reply = replyText[commentId];
    if (!reply) {
      alert("Please add text to your reply.");
      setIsSubmittingReply(false);
      return;
    }

    if (!currentUser) {
      alert("User is not logged in.");
      setIsSubmittingReply(false);
      return;
    }

    const formData = new FormData();
    formData.append("content", reply);
    formData.append("postId", postId);
    formData.append("parentCommentId", commentId);
    formData.append("commentId", commentId);

    if (groupId) {
      formData.append("groupId", groupId);
    }

    if (attachedMedia[commentId]?.length > 0) {
      attachedMedia[commentId].forEach(({ file }) => {
        formData.append("media", file); // ✅ No array brackets unless backend expects it
      });
    }

    try {
      const response = await fetch(`${BASE_URL}/api/createReply`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to post reply:", result.error);
        alert(result.error || "Failed to post reply.");
        setIsSubmittingReply(false);
        return;
      }

      const newReply = result.newReply;

      setComments((prev) => {
        const updated = { ...prev };
        updated[postId] = updated[postId].map((c) =>
          c.commentId === commentId
            ? { ...c, replies: [newReply, ...(c.replies || [])] }
            : c
        );
        return updated;
      });

      socket.emit("receive-reply", newReply);

      // ✅ Clear reply input
      setReplyText((prev) => ({ ...prev, [commentId]: "" }));

      // ✅ Clear media preview
      setAttachedMedia((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });

      // ✅ Clear file input
      if (fileInputRefs.current[commentId]) {
        fileInputRefs.current[commentId].value = "";
      }

    } catch (error) {
      console.error("Error posting reply:", error);
      alert("Error posting reply. Please try again.");
    }

    setIsSubmittingReply(false);
  };



  //
  // Track optimistic comments with a temporary ID
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitComment = async (postId, groupId) => {
    setIsSubmitting(true);
    //console.log('Posting comment with:', { postId, groupId });
    // Check if the comment or media is empty
    const comment = commentText[postId];
    const files = selectedFiles[postId];

    if (!comment && (!files || files.length === 0)) {
      alert("Please add text or media to your comment.");
      return;
    }

    if (!currentUser) {
      alert("User is not logged in.");
      return;
    }

    // Reset inputs immediately after submission
    setCommentText(prev => ({ ...prev, [postId]: "" }));
    setSelectedFiles(prev => ({ ...prev, [postId]: [] }));

    const formData = new FormData();
    formData.append("content", comment);
    formData.append("postId", postId);  // Always pass postId (for global posts)

    // Pass groupId if this is a group post
    if (groupId) {
      formData.append("groupId", groupId); // Append groupId for group posts
    }

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("media", file);  // Append media if any
      });
    }

    try {
      // Make the API call to create a comment
      const response = await fetch(`${BASE_URL}/api/createComment`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to post comment:", result.error);
        alert(result.error || "Failed to post comment.");
        return;
      }

      // The new comment is in `result.newComment`
      const newComment = result.newComment;

      // Update the comments state with the new comment
      setComments((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])], // Add the new comment at the beginning
      }));

    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Error posting comment. Please try again.");
    }

    setIsSubmitting(false);
  };



  //delete reply
  const handleDeleteReply = async (commentId, postId, groupId = null) => {
    if (!commentId) {
      console.error('Comment ID missing');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/deleteReply/${commentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }), // send groupId if available
      });

      if (!response.ok) {
        throw new Error('Failed to delete reply');
      }

      setComments((prev) => {
        const updated = { ...prev };
        updated[postId] = updated[postId].map(comment => ({
          ...comment,
          replies: comment.replies.filter(reply => reply.commentId !== commentId)
        }));
        return updated;
      });

    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };



  const handleLikeReply = async (replyId, postId, parentCommentId, groupId) => {
    try {
      // 1) Call your API
      const response = await fetch(`${BASE_URL}/api/likeReply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, groupId }),
      });
      const { liked } = await response.json(); // { liked: true } or { liked: false }
      if (!response.ok) throw new Error("Failed to like/unlike");

      // 2) Update your comment list (if you still need it)
      setComments(prevComments => {
        const updated = { ...prevComments };
        if (updated[postId]) {
          updated[postId] = updated[postId].map(comment => {
            if (comment.commentId !== parentCommentId) return comment;
            return {
              ...comment,
              replies: comment.replies.map(r => {
                if (r.commentId !== replyId) return r;
                return {
                  ...r,
                  likedByCurrentUser: liked,
                  // keep this in sync if you're still using reply.likeCount elsewhere
                  likeCount: Math.max((r.likeCount || 0) + (liked ? 1 : -1), 0),
                };
              }),
            };
          });
        }
        return updated;
      });

      // 3) ***NEW*** Patch your replyLikes state so the UI re-renders instantly
      setReplyLikes(prev => {
        const current = prev[replyId] || { likeCount: 0, likedByCurrentUser: false };
        const newCount = liked
          ? current.likeCount + 1
          : Math.max(current.likeCount - 1, 0);

        return {
          ...prev,
          [replyId]: {
            likeCount: newCount,
            likedByCurrentUser: liked,
          },
        };
      });
    } catch (err) {
      console.error("Error liking/unliking reply:", err);
    }
  };







  //Delete comment

  const handleDeleteComment = async (commentId, postId, groupId = null) => {
    if (!commentId) {
      alert('Invalid comment ID');
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/deleteComment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }), // Send groupId if available
      });

      if (response.ok) {
        const result = await response.json();

        setComments(prevComments => ({
          ...prevComments,
          [postId]: prevComments[postId].filter(comment => comment.commentId !== commentId),
        }));

        alert(result.message || 'Comment deleted successfully');
      } else {
        const errorResult = await response.json();
        alert(errorResult.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment. Please try again.');
    }
  };




  const handleEmojiSelect = async (emoji, postId, groupId) => {
    const currentReactions = reactions[postId] || { length: 0, userReaction: null };
    const isUnliking = emoji === currentReactions.userReaction;

    const updatedEmoji = isUnliking ? null : emoji;
    const updatedLength = isUnliking
      ? Math.max(currentReactions.length - 1, 0)
      : currentReactions.length + (currentReactions.userReaction ? 0 : 1);

    // Optimistically update UI
    setReactions((prev) => ({
      ...prev,
      [postId]: {
        ...currentReactions,
        userReaction: updatedEmoji,
        length: updatedLength,
      },
    }));

    setShowPickerFor(null);

    try {
      // Save the new emoji or remove the old one (send groupId if available)
      await fetch(`${BASE_URL}/api/emoji`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId, emoji: updatedEmoji, groupId }), // Send groupId
      });

      // Fetch updated reactions from server
      const updatedReactionsResponse = await fetch(
        `${BASE_URL}/api/reactions/${postId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      const updatedReactionsData = await updatedReactionsResponse.json();

      setReactions((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          ...updatedReactionsData,
          userReaction: updatedEmoji,
        },
      }));
    } catch (err) {
      console.error('Failed to save emoji reaction', err);

      // Rollback in case of error
      setReactions((prev) => ({
        ...prev,
        [postId]: {
          ...currentReactions,
        },
      }));
    }
  };

  // Detect clicks outside the emoji picker and close it if necessary
  const handleClickOutside = (event) => {
    const isEmojiPicker =
      emojiPickerRef.current && emojiPickerRef.current.contains(event.target);
    const isInsideCard = event.target.closest('.card');

    if (!isEmojiPicker && isInsideCard) {
      setShowPickerFor(null);
    }

    if (!isEmojiPicker && !isInsideCard) {
      setShowPickerFor(null);
    }
  };




  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  //FETCH CURRENT USER

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/session`, {
          credentials: "include",  // Include cookies to maintain the session
        });

        if (!response.ok) {
          throw new Error("User not logged in");
        }

        const data = await response.json();
        setCurrentUser(data.user);
      } catch (error) {
        console.error("Error fetching user session:", error);
      }
    };

    fetchCurrentUser();
  }, []);


  // Fetch posts and join WebSocket rooms
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const params = new URLSearchParams();
        params.set('includeReactions', 'true');

        // 1️⃣ PROFILE page: if there's a userId, fetch only that user's posts
        if (userId) {
          params.set('userId', userId);
        }
        // 2️⃣ GROUP page: else if there's a groupId, fetch only that group's posts
        else if (groupId) {
          params.set('groupId', groupId);
        }
        // 3️⃣ GLOBAL feed: neither userId nor groupId → fetch everything

        const url = `${BASE_URL}/api/getAllPosts?${params.toString()}`;
        //console.log('→ CLIENT FETCH URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setPosts(data);

        const postIds = data.map((post) => post.postId);
        // const userIds = data.map((post) => post.user.userId);

        // Ensure socket is connected before emitting events
        if (socket.connected) {
          postIds.forEach((postId) => {
            socket.emit('joinPostRoom', postId);
          });
        } else {
          socket.on('connect', () => {
            postIds.forEach((postId) => {
              socket.emit('joinPostRoom', postId);
            });
          });
        }

        // Fetch reactions
        const reactionsResponse = await fetch(`${BASE_URL}/api/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ postIds }),
        });
        const reactionsData = await reactionsResponse.json();

        const initialReactions = {};
        data.forEach((post) => {
          initialReactions[post.postId] = {
            userReaction: reactionsData.reactions[post.postId]?.userReaction || null,
            length: reactionsData.reactions[post.postId]?.count || 0,
          };
        });
        setReactions(initialReactions);

        // Fetch comments
        const commentsResponse = await fetch(`${BASE_URL}/api/commentsBatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            postIds,
            groupId, // Include groupId if it exists
          }),
        });
        const commentsData = await commentsResponse.json();

        const initialComments = {};
        const updatedPosts = [...data];
        data.forEach((post) => {
          initialComments[post.postId] = commentsData[post.postId]?.comments || [];
          post.comments_count = commentsData[post.postId]?.commentCount || 0;
        });
        setComments(initialComments);
        setPosts(updatedPosts);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching posts, reactions, or comments:', error);
      }
    };

    fetchPosts();
  }, [groupId, userId, setPosts]); // Re-fetch if groupId or userId changes



  // DELETE POSTS
  // Handle post deletion
  const handleDeletePost = async (postId, groupId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const url = groupId
        ? `${BASE_URL}/api/deletePost/${postId}?groupId=${groupId}`
        : `${BASE_URL}/api/deletePost/${postId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include', // Include session cookies for user authentication
      });

      const result = await response.json();

      if (response.ok) {
        // Remove post from state
        setPosts(prevPosts => prevPosts.filter(post => post.postId !== postId));

        alert(result.message || 'Post deleted successfully');
      } else {
        alert(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post. Please try again.');
    }
  };

  useEffect(() => {
    const handlePostDeleted = ({ postId }) => {
      setPosts(prevPosts => prevPosts.filter(post => post.postId !== postId));
    };

    socket.on('postDeleted', handlePostDeleted);

    // Clean up the listener on unmount
    return () => {
      socket.off('postDeleted', handlePostDeleted);
    };
  }, []);


  // Delete comment in real-time
  useEffect(() => {
    const handleCommentDeleted = (deletedComment) => {
      // console.log('Received commentDeleted event:', deletedComment);

      const { commentId, postId } = deletedComment;

      // Remove the comment from the UI in real-time
      setComments((prevComments) => {
        const updated = { ...prevComments };
        // console.log('Previous comments state before deletion:', updated);

        if (updated[postId]) {
          // Filter out the deleted comment
          updated[postId] = updated[postId].filter(
            (comment) => comment.commentId !== commentId
          );
        }

        //  console.log('Updated comments state after deletion:', updated);
        return updated;
      });

      // Optionally, update the comments count for the post
      setPosts((prevPosts) => {
        //  console.log('Updating posts state for comments_count decrement');
        return prevPosts.map((post) =>
          post.postId === postId
            ? { ...post, comments_count: post.comments_count - 1 }
            : post
        );
      });
    };

    // Listen for deleted comments from WebSocket
    socket.on('commentDeleted', handleCommentDeleted);

    // Cleanup listener on component unmount
    return () => {
      //console.log('Cleaning up commentDeleted listener...');
      socket.off('commentDeleted', handleCommentDeleted);
    };
  }, [socket]);

  // WebSocket listener for real-time new comments
  useEffect(() => {
    const handleReceiveComment = (newComment) => {
      const { postId, commentId } = newComment;

      setComments((prevComments) => {
        const existing = prevComments[postId] || [];
        const alreadyExists = existing.some(comment => comment.commentId === commentId);

        if (alreadyExists) return prevComments;

        return {
          ...prevComments,
          [postId]: [newComment, ...existing],
        };
      });

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.postId === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      setHighlightedComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), commentId],
      }));
    };


    socket.on('receive-comment', handleReceiveComment);

    return () => {
      socket.off('receive-comment', handleReceiveComment);
    };
  }, []);





  return (
    <div >
      {loading || !currentUser ? (
        <div>
          <Stack gap="6" maxW="xs" marginBottom={'30px'}>
            <HStack width="full">
              <SkeletonCircle size="10" />
              <SkeletonText noOfLines={2} />
            </HStack>
            <Skeleton height="200px" />
            <Skeleton height="10px" />

          </Stack>

          <Stack gap="6" maxW="xs">
            <HStack width="full">
              <SkeletonCircle size="10" />
              <SkeletonText noOfLines={2} />
            </HStack>
            <Skeleton height="200px" />
            <Skeleton height="10px" />

          </Stack>
        </div>
      ) : (
        posts.map((post) => (

          <div key={post.postId} className="post-card">
            {/* Header */}
            <div className="card-header pt-3 d-flex justify-content-between align-items-center ">
              <div className="d-flex align-items-center">
                <Stack gap="8">

                  <HStack key={post.user.username} gap="4">

                    <Avatar.Root css={ringCss} colorPalette="red">
                      <Avatar.Fallback name={post.user.username} />

                      <Link to={`/profile/${post.user.userId}`}>
                        <Avatar.Image src={post.user.profilePicture} />
                      </Link>
                    </Avatar.Root>
                    <Stack gap="0">

                      <Link to={`/profile/${post.user.userId}`}>
                        <Text
                          fontWeight="bold">{post.user.fullName} • {format(post.createdAt)}

                        </Text>
                      </Link>
                      <Text fontWeight="medium">@{post.user.username}</Text>

                    </Stack>
                  </HStack>

                </Stack>


              </div>
              <div className="dropdown">
                <button className="btn btn-link text-dark p-0" type="button" data-bs-toggle="dropdown">
                  <Ellipsis />
                </button>

                <ul className="dropdown-menu">
                  {/* {console.log('Comparing post.user.userId:', post.user.userId, 'with currentUser.id:', currentUser.id)}   Debugging */}
                  {post.user.userId === currentUser.id && (
                    <>
                      <li>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={() => {
                            setPostToEdit(post);
                            setIsEditing(true);
                            openModal();
                          }}
                        >
                          Edit Post
                        </a>
                      </li>
                      <li>
                        <button
                          onClick={() => handleDeletePost(post.postId, groupId)}
                          className="dropdown-item text-danger"
                        >
                          Delete Post
                        </button>
                      </li>
                    </>
                  )}
                  <li>
                    <a className="dropdown-item" href="#">Report Post</a>
                  </li>
                  <li>
  <button
    className="dropdown-item"
    onClick={() => handleBlockUser(post.user.userId)}
  >
    Block
  </button>
</li>


                </ul>



              </div>
            </div>

            {/* Content */}
            <div className="card-body pt-3 bg-white">
              <p >{post.content}</p>

              {/* Media Container */}
              <div className="media-container">
                {Array.isArray(post.media) && post.media.length > 0 && renderMediaLayout(post.media, openLightbox)}

              </div>
            </div>

            {/* Post Actions */}
            <div className="card-footer d-flex justify-content-between align-items-center bg-white border-0">
              <div>
                {/* Button to toggle comments */}
                <button
                  className="btn btn-link text-muted"
                  style={{ textDecoration: 'none' }}
                  onClick={() => toggleCommentSection(post.postId)} // Toggle comments visibility
                >
                  <MessageSquareMore />
                  <span style={{ fontSize: '11px' }}>
                    {post.comments_count || ''} {/* Show comment count */}
                  </span>
                </button>
                <div
                  className="reaction-btn btn btn-link text-muted"
                  style={{
                    fontSize: '20px',
                    position: 'relative',
                    textDecoration: 'none', // Ensure no underline on the reaction button
                  }}
                  onClick={() => {
                    const userReaction = reactions[post.postId]?.userReaction;
                    if (userReaction) {
                      // Clicked on their own reaction → remove it
                      handleEmojiSelect(userReaction, post.postId);
                    } else {
                      // No reaction yet → open emoji picker
                      setShowPickerFor(post.postId);
                    }
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>
                    {reactions[post.postId]?.userReaction ? (
                      <img
                        src={reactions[post.postId]?.userReaction}
                        alt="Selected Emoji"
                        style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                      />
                    ) : (
                      <HeartPlus />
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '500',
                      textDecoration: 'none', // Remove underline from reaction count
                    }}
                  >
                    {reactions[post.postId]?.length || ''}
                  </span>

                  {/* Show emoji picker if no reaction and picker is open */}
                  {!reactions[post.postId]?.userReaction &&
                    showPickerFor === post.postId && (
                      <div
                        ref={emojiPickerRef}
                        style={{
                          position: 'absolute',
                          top: '2rem',
                          zIndex: 10,
                          background: 'white',
                          padding: '10px',
                          borderRadius: '10px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '5px',
                            width: '200px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}
                        >
                          {emojiList.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => handleEmojiSelect(emoji, post.postId)}
                              style={{
                                background: 'white',
                                border: 'none',
                                padding: '5px',
                                cursor: 'pointer',
                              }}
                            >
                              <img
                                src={emoji}
                                alt={`Animated Emoji ${index}`}
                                style={{
                                  width: '1.5rem',
                                  height: '1.5rem',
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>


                <ShareDrawer />

              </div>
              <div>
                <button className="btn btn-link bookmark-btn" style={{ textDecoration: 'none' }}>
                  <i className="bi bi-bookmark"></i>
                </button>
              </div>
            </div>
            {/* Comment Section */}
            <div
              className="comments-section"
              style={{
                display: visibleCommentSections[post.postId] ? 'block' : 'none', // Dynamically show/hide
              }}
            >

              {comments[post.postId]?.map((comment) => (
                <CommentBlock
                  key={`comment-${post.postId}-${comment.commentId}`} // ✅ Put key here
                  comment={comment}
                  post={post}
                  currentUser={currentUser}
                  commentLikes={commentLikes}
                  highlighted={highlightedComments[comment.commentId]}
                  editingCommentId={editingCommentId}
                  editedContent={editedContent}
                  handleEditClick={handleEditClick}
                  handleSaveEdit={handleSaveEdit}
                  handleCancelEdit={handleCancelEdit}
                  setEditedContent={setEditedContent}
                  handleDeleteComment={handleDeleteComment}
                  openMediaLightbox={openMediaLightbox}
                  handleLikeComment={handleLikeComment}
                  toggleReplyInput={toggleReplyInput}
                  showReplyInput={showReplyInput}
                  replyText={replyText}
                  handleReplyTextChange={handleReplyTextChange}
                  attachedMedia={attachedMedia}
                  handleMediaChange={handleMediaChange}
                  removeAttachedMedia={removeAttachedMedia}
                  fileInputRefs={fileInputRefs}
                  submitReply={submitReply}
                  isSubmittingReply={isSubmittingReply}
                  handleEditReplyClick={handleEditReplyClick}
                  editingReplyId={editingReplyId}
                  editedReplyText={editedReplyText}
                  setEditedReplyText={setEditedReplyText}
                  handleSaveReplyEdit={handleSaveReplyEdit}
                  handleCancelReplyEdit={handleCancelReplyEdit}
                  handleLikeReply={handleLikeReply}
                  handleMentionClick={handleMentionClick}
                  replyLikes={replyLikes}
                  openReplyMediaLightbox={openReplyMediaLightbox}
                  groupId={groupId}
                  handleDeleteReply={handleDeleteReply}
                  isMember={isMember}
                />
              ))}


            </div>

            {/*  Replies light box   */}
            {lightboxMedia && (
              <div
                className="lightbox-overlay"
                onClick={() => setLightboxMedia(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}
              >
                <div
                  className="lightbox-content"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'relative',
                    maxWidth: '90%',
                    maxHeight: '90%',
                  }}
                >
                  {lightboxMedia.mediaList[lightboxMedia.currentIndex].type === 'image' ? (
                    <img
                      src={lightboxMedia.mediaList[lightboxMedia.currentIndex].url}
                      alt="media"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        borderRadius: '8px',
                      }}
                    />
                  ) : (
                    <video
                      src={lightboxMedia.mediaList[lightboxMedia.currentIndex].url}
                      controls
                      style={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        borderRadius: '8px',
                      }}
                    />
                  )}

                  {/* Optional counter */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 20,
                      color: '#fff',
                      fontSize: '1rem',
                    }}
                  >
                    {lightboxMedia.currentIndex + 1} / {lightboxMedia.mediaList.length}
                  </div>

                  {/* Nav buttons */}
                  {lightboxMedia.mediaList.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setLightboxMedia((prev) => ({
                            ...prev,
                            currentIndex:
                              (prev.currentIndex - 1 + prev.mediaList.length) % prev.mediaList.length,
                          }))
                        }
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.3)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '2.5rem',
                          cursor: 'pointer',
                          padding: '10px 20px',
                          transition: 'background 0.3s',
                        }}
                      >
                        ‹
                      </button>

                      <button
                        onClick={() =>
                          setLightboxMedia((prev) => ({
                            ...prev,
                            currentIndex: (prev.currentIndex + 1) % prev.mediaList.length,
                          }))
                        }
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: 0,
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.3)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '2.5rem',
                          cursor: 'pointer',
                          padding: '10px 20px',
                          transition: 'background 0.3s',
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}

                  {/* Close */}
                  <button
                    onClick={() => setLightboxMedia(null)}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '2rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}



            <div className="comment-input-area   bg-white">


              {(!post.isGroupPost || isMember) && (
                <div className=" comment-input">
                  {/* Profile Picture */}
                  <div className="profile-pic-wrapper">
                    <div className="profile-pic-gap3">
                      <img src={post.user.profilePicture || '/default-profile.png'} alt="Profile" className="profile-pic" />
                    </div>
                  </div>

                  <div className="comment-textarea-wrapper">
                    <textarea
                      name='Editreply'
                      className="form-control rounded-pill commentBox"
                      placeholder={editingCommentId ? "Edit your comment..." : "Add a comment..."}
                      value={editingCommentId ? editedContent : commentText[post.postId] || ''}
                      onChange={(e) => {
                        if (editingCommentId) {
                          setEditedContent(e.target.value);
                        } else {
                          handleCommentTextChange(post.postId, e);
                        }
                      }}
                    />
                  </div>

                  <div className="commentBtns bg-white">
                    <div >
                      <label htmlFor={`upload-media-${post.postId}`} className="attachmentBtn">
                        <ImagePlay />
                        <input
                          type="file"
                          id={`upload-media-${post.postId}`}
                          multiple
                          accept="image/*,video/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileUpload(post.postId, e)}
                        />
                      </label>
                    </div>
                    <button>
                      <LocateFixed />
                    </button>

                    <button
                      onClick={() => {
                        if (editingCommentId) {
                          handleSaveEdit(editingCommentId, post.postId, groupId);
                        } else {
                          submitComment(post.postId, groupId);
                        }
                      }}
                      aria-label={editingCommentId ? "Save comment" : "Submit comment"}
                      disabled={isSubmitting}
                    >
                      <SendHorizontal />
                    </button>
                  </div>
                </div>


              )}




            </div>

            {/* Media Preview Section */}
            <div className="comment-input-media-preview-desktop">
              {selectedFiles[post.postId]?.map((file, index) => (
                <div key={index} className="comment-input-media-preview-item">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index}`}
                    className="comment-input-media-preview-img"
                  />
                  <button
                    className="comment-input-remove-btn"
                    onClick={() => removeFile(post.postId, index)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="comment-input-area-Mobile   bg-white">


              {(!post.isGroupPost || isMember) && (

                <>

                  <div className=" comment-input">
                    {/* Profile Picture */}

                    <div className="profile-pic-wrapper">
                      <div className="profile-pic-gap3">
                        <img src={post.user.profilePicture || '/default-profile.png'} alt="Profile" className="profile-pic" />
                      </div>
                    </div>

                    <div className="comment-textarea-wrapper">
                      <textarea
                        name='Editreply'
                        className="form-control rounded-pill commentBox"
                        placeholder={editingCommentId ? "Edit your comment..." : "Add a comment..."}
                        value={editingCommentId ? editedContent : commentText[post.postId] || ''}
                        onChange={(e) => {
                          if (editingCommentId) {
                            setEditedContent(e.target.value);
                          } else {
                            handleCommentTextChange(post.postId, e);
                          }
                        }}
                      />
                    </div>



                  </div>
                  <div className="commentBtns-mobile bg-white">
                    <div >
                      <label htmlFor={`upload-media-${post.postId}`} className="attachmentBtn">
                        <ImagePlay />
                        <input
                          type="file"
                          id={`upload-media-${post.postId}`}
                          multiple
                          accept="image/*,video/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileUpload(post.postId, e)}
                        />
                      </label>
                    </div>
                    <button>
                      Location <LocateFixed />
                    </button>

                    <button
                      onClick={() => {
                        if (editingCommentId) {
                          handleSaveEdit(editingCommentId, post.postId, groupId);
                        } else {
                          submitComment(post.postId, groupId);
                        }
                      }}
                      aria-label={editingCommentId ? "Save comment" : "Submit comment"}
                      disabled={isSubmitting}
                    >
                      Comment
                    </button>
                  </div>
                </>


              )}



              {/* Media Preview Section */}
              <div className="comment-input-media-preview">
                {selectedFiles[post.postId]?.map((file, index) => (
                  <div key={index} className="comment-input-media-preview-item">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index}`}
                      className="comment-input-media-preview-img"
                    />
                    <button
                      className="comment-input-remove-btn"
                      onClick={() => removeFile(post.postId, index)}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>


        ))
      )}

      {chatUser && (
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          recipient={chatUser}
          currentUser={currentUser}
        />
      )}

      {/* Post light boxLightbox */}
      {isLightboxOpen && (
        <Lightbox
          mediaItems={lightboxImages}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onNext={goToNextImage}
          onPrev={goToPrevImage}
        />
      )}


      {/* Comment light boxLightbox */}
      {lightboxOpen && currentMedia && (
        <div className="comment-lightbox-overlay" onClick={closeMediaLightbox}>
          <div className="comment-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Previous Button */}
            <button className="comment-prev-button" onClick={goToPrevMedia}>
              &lt;
            </button>

            {/* Media Content */}
            <div className="comment-slider-container">
              {currentMedia.length > 0 && (
                <div
                  className="comment-slider-inner"
                  style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
                >
                  {currentMedia.map((media, index) => (
                    <div key={index} className="comment-slider-media">
                      {media.type === "image" ? (
                        <img src={media.url} alt={`Media ${index}`} />
                      ) : (
                        <video controls>
                          <source src={media.url} type="video/mp4" />
                        </video>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Button */}
            <button className="comment-next-button" onClick={goToNextMedia}>
              &gt;
            </button>
          </div>
        </div>
      )}



    </div>
  );
};

export default AllFeeds;
