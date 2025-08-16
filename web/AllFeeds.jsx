import { useEffect, useState, useRef } from 'react';
import { format } from 'timeago.js';

const AllFeeds = ({ posts, setPosts }) => {
  const [loading, setLoading] = useState(true);
  const [showPickerFor, setShowPickerFor] = useState(null);
  const [reactions, setReactions] = useState({});
  const containerRef = useRef(null); // Ref to detect clicks outside the container
  const emojiPickerRef = useRef(null); // Ref for emoji picker

  // Array of emojis to choose from
  const emojiList = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😍", "🥺", "😎"];

  // Handle emoji selection
  const handleEmojiSelect = async (emoji, postId) => {
    setReactions(prev => ({ ...prev, [postId]: emoji })); // Update the reaction with selected emoji
    setShowPickerFor(null); // Close the picker when emoji is selected

    try {
      await fetch('http://localhost:5000/api/emoji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          postId,
          emoji,
        }),
      });
    } catch (err) {
      console.error('Failed to save emoji reaction', err);
    }
  };

  // Detect clicks outside the emoji picker and close it if necessary
  const handleClickOutside = (event) => {
    // Close the picker if click is outside the emoji picker or the reaction button
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target) &&
      !emojiPickerRef.current.contains(event.target) &&
      !event.target.closest('.reaction-btn')
    ) {
      setShowPickerFor(null); // Close the picker
    }
  };

  useEffect(() => {
    // Add event listener for detecting clicks outside the picker
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch posts and reactions
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/getAllPosts', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setPosts(data);

        const initialReactions = {};

        // Fetch reactions for each post
        for (const post of data) {
          const reactionsResponse = await fetch(`http://localhost:5000/api/reactions/${post.postId}`, {
            method: 'GET',
            credentials: 'include',
          });
          const reactionsData = await reactionsResponse.json();

          initialReactions[post.postId] = reactionsData;

          // Fetch the user's specific reaction
          const userReactionResponse = await fetch(`http://localhost:5000/api/reaction/${post.postId}`, {
            method: 'GET',
            credentials: 'include',
          });
          const userReactionData = await userReactionResponse.json();

          if (userReactionData.emoji) {
            initialReactions[post.postId].userReaction = userReactionData.emoji;
          }
        }

        setReactions(initialReactions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching posts or reactions:', error);
      }
    };

    fetchPosts();
  }, [setPosts]);

  return (
    <div ref={containerRef}>
      {loading ? (
        <div>Loading posts...</div>
      ) : (
        posts.map(post => (
          <div key={post.postId} className="card mb-3 p-3 border-0">
            {/* Header */}
            <div className="card-header d-flex justify-content-between align-items-center bg-white border-0">
              <div className="d-flex align-items-center">
                <img
                  src={post.user.profilePicture || '/default-profile.png'}
                  alt="Profile"
                  className="profile-pic me-2"
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                />
                <div>
                  <div className="fw-bold">{post.user.username}</div>
                  <div className="text-muted" style={{ fontSize: '0.85em' }}>
                    {post.user.fullName} • {format(post.createdAt)}
                  </div>
                </div>
              </div>
              <div className="dropdown">
                <button className="btn btn-link text-dark p-0" type="button" data-bs-toggle="dropdown">
                  &#8230;
                </button>
                <ul className="dropdown-menu">
                  <li><a className="dropdown-item" href="#">Edit Post</a></li>
                  <li><a className="dropdown-item" href="#">Delete Post</a></li>
                  <li><a className="dropdown-item" href="#">Report Post</a></li>
                </ul>
              </div>
            </div>

            {/* Content */}
            <div className="card-body p-0">
              <p>{post.content}</p>
              <div className="media-container">
                {post.media.map((media, index) => (
                  <div key={index} className="media-item">
                    {media.mediaType === 'image' ? (
                      <img src={media.mediaUrl} alt={`Post Media ${index}`} className="img-fluid" />
                    ) : media.mediaType === 'video' ? (
                      <video controls className="w-100">
                        <source src={media.mediaUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Post Actions */}
            <div className="card-footer d-flex justify-content-between align-items-center bg-white border-0">
              <div>
                <button className="btn btn-link text-muted">
                  <i className="bi bi-chat"></i>
                  <span style={{ fontSize: '11px' }}>{post.comments_count || 0}</span>
                </button>
                <div
                  className="reaction-btn btn btn-link text-muted"
                  style={{ fontSize: '20px', position: 'relative' }}
                  onClick={() => setShowPickerFor(post.postId)}
                >
                  <span style={{ fontSize: '1.5rem' }}>
                    {reactions[post.postId]?.userReaction || <i className="bi bi-hand-thumbs-up"></i>}
                  </span>
                  <span style={{ fontSize: '11px' }}>
                    {reactions[post.postId]?.length || 0}
                  </span>

                  {showPickerFor === post.postId && (
                    <div ref={emojiPickerRef} style={{ position: 'absolute', top: '2rem', zIndex: 10 }}>
                      {/* Emoji Picker */}
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {emojiList.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiSelect(emoji, post.postId)}
                            style={{
                              fontSize: '1.5rem',
                              background: 'transparent',
                              border: 'none',
                              margin: '5px',
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button className="btn btn-link text-muted">
                  <i className="bi bi-share"></i>
                </button>
              </div>
              <div>
                <button className="btn btn-link bookmark-btn">
                  <i className="bi bi-bookmark"></i>
                </button>
              </div>
            </div>

            {/* Comment Input */}
            <div className="comment-input-area mt-2">
              <div className="d-flex align-items-center mb-2">
                <img src="#" className="post-ProfilePic" alt="profile Picture" />
                <textarea className="form-control rounded-pill commentBox" placeholder="add a comment"></textarea>
              </div>
              <div className="commentBtns">
                <div>
                  <button><i className="bi bi-card-image"></i></button>
                  <button><i className="bi bi-pin-map"></i></button>
                </div>
                <button><i className="bi bi-send"></i></button>
              </div>
            </div>

            {/* Comment List */}
            <div className="comment-list"></div>
          </div>
        ))
      )}
    </div>
  );
};

export default AllFeeds;
