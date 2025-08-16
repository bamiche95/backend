import React from 'react';

const ReplyBlock = ({
  reply,
  comment,
  post,
  currentUser,
  replyLikes,
  editingReplyId,
  editedReplyText,
  setEditedReplyText,
  handleEditReplyClick,
  handleDeleteReply,
  handleSaveReplyEdit,
  handleCancelReplyEdit,
  handleLikeReply,
  handleMentionClick,
  openReplyMediaLightbox,
  groupId
}) => {
  const {
    likeCount = 0,
    likedByCurrentUser = false
  } = replyLikes[reply.commentId] || {};

  return (
    <div className="reply-card">
      {/* Header */}
      <div className="reply-header">
        <div className="reply-imgNamearea">
         

          <div className="profile-pic-wrapper">
            <div className="profile-pic-gap3">
              <img src={reply.profilePicture || reply.user?.profilePicture || '/default-profile.png'}
            alt={`${reply.fullname || reply.user?.name || 'User'} profile`} className="profile-pic" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {reply.fullname || reply.user?.name || 'You'}
            </span>
            <p className="reply-date">
              {new Date(reply.createdAt).toLocaleString()}
              {reply.editedAt && reply.createdAt !== reply.editedAt && (
                <span style={{ fontSize: '0.8em', color: 'gray' }}>{' (edited)'}</span>
              )}
            </p>
          </div>
        </div>
        {/* Dropdown menu for reply actions */}
        <div className="dropdown">
          <button className="btn btn-link text-dark p-0" type="button" data-bs-toggle="dropdown">
            <i className="bi bi-three-dots"></i>
          </button>
          <ul className="dropdown-menu">
            {reply.userId === currentUser.id && (
              <>
                <li>
                  <button onClick={() => handleDeleteReply(reply.commentId, post.postId, groupId)} className="dropdown-item text-danger">
                    Delete Reply
                  </button>
                </li>
                <li>
                  <button onClick={() => handleEditReplyClick(reply)} className="dropdown-item">
                    Edit Reply
                  </button>
                </li>
              </>
            )}
            <li>
              <a className="dropdown-item" href="#">Report Reply</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Reply content (view or edit) */}
      <div className="replyEdit-container">
        {editingReplyId === reply.commentId ? (
          <>
            <div className="replyEdit-topRow">
              <img
                src={reply.profilePicture || reply.user?.profilePicture || '/default-profile.png'}
                alt="Profile"
                className="replyEdit-profilePic"
              />
              <textarea
                value={editedReplyText}
                onChange={(e) => setEditedReplyText(e.target.value)}
                placeholder="Edit your reply..."
                className="replyEdit-textarea"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            <div className="replyEdit-buttons">
              <button className="btn btn-primary btn-sm me-2" onClick={() => handleSaveReplyEdit(reply.commentId, post.postId, groupId)}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancelReplyEdit}>Cancel</button>
            </div>
          </>
        ) : (
          <p className="replyEdit-content">{reply.content}</p>
        )}
      </div>

      {/* Media */}
      <div className="reply-media">
        {Array.isArray(reply.media) && reply.media.map((media, index) => (
          <div key={index} className="media-item" onClick={() => openReplyMediaLightbox(post.postId, comment.commentId, reply.commentId, index)}>
            {media.type === 'image' ? (
              <img src={media.url} alt={`Media ${index}`} className="reply-media-img" />
            ) : media.type === 'video' ? (
              <video controls className="reply-media-video">
                <source src={media.url} type="video/mp4" />
              </video>
            ) : null}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="reply-actions">
        <span onClick={() => handleLikeReply(reply.commentId)} style={{
          color: likedByCurrentUser ? 'red' : 'inherit',
          fontWeight: likedByCurrentUser ? 'bold' : 'normal',
          cursor: 'pointer'
        }}>
          {likedByCurrentUser ? 'Liked' : 'Like'}
          {likeCount > 0 && (
            <span> ({likeCount})</span>
          )}
        </span>

        {/* Mention action */}
        <span onClick={() => handleMentionClick(reply.commentId)} style={{ cursor: 'pointer', marginLeft: '10px' }}>
          Mention
        </span>
      </div>
    </div>
  );
};

export default ReplyBlock;
