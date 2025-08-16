// CommentBlock.jsx
import ReplyBlock from './ReplyBlock';
import ChatModal from './ChatModal';
const CommentBlock = ({
  comment,
  post,
  currentUser,
  groupId,
  commentLikes,
  showReplyInput,
  replyText,
  attachedMedia,
  editingCommentId,
  editedContent,
  isMember,
  handleDeleteComment,
  handleEditClick,
  handleCancelEdit,
  setEditedContent,
  handleSaveEdit,
  handleLikeComment,
  toggleReplyInput,
  handleReplyTextChange,
  handleMediaChange,
  removeAttachedMedia,
  submitReply,
  openMediaLightbox,
  openReplyMediaLightbox,
  replyLikes,
  editingReplyId,
  editedReplyText,
  handleEditReplyClick,
  handleCancelReplyEdit,
  handleSaveReplyEdit,
  handleDeleteReply,
  handleLikeReply,
  handleMentionClick,
  isSubmittingReply,
  fileInputRefs
}) => {
  return (
    <div className="comment-card">
      {/* Header */}
      <div className="comment-header">
        <div className="comment-imgNamearea">
         
          <div className="profile-pic-wrapper">
            <div className="profile-pic-gap3">
              <img  src={comment.profilePicture || comment.user?.profilePicture || '/default-profile.png'}
            alt={`${comment.fullname || comment.user?.name || 'User'} profile`}  className="profile-pic" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {comment.fullname || comment.user?.name || 'You'}
            </span>
            <p className="comment-date">
              {new Date(comment.createdAt).toLocaleString()}
              {comment.editedAt && comment.createdAt !== comment.editedAt && (
                <span style={{ fontSize: '0.8em', color: 'gray' }}>{' (edited)'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Dropdown */}
        <div className="dropdown">
          <button className="btn btn-link text-dark p-0" type="button" data-bs-toggle="dropdown">
            <i className="bi bi-three-dots"></i>
          </button>
          <ul className="dropdown-menu">
            {comment.userId === currentUser.id && (
              <>
                <li>
                  <button onClick={() => handleDeleteComment(comment.commentId, post.postId, groupId)} className="dropdown-item text-danger">
                    Delete Comment
                  </button>
                </li>
                <li>
                  <button onClick={() => handleEditClick(comment)} className="dropdown-item">
                    Edit Comment
                  </button>
                </li>
               
              </>
            )}
            
            <li>
              <a className="dropdown-item" href="#">Report Comment</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Content / Editing */}
      <div className="commentEdit-container">
        {editingCommentId === comment.commentId ? (
          <>
            <div className="commentEdit-topRow">
              <img
                src={comment.profilePicture || comment.user?.profilePicture || '/default-profile.png'}
                alt="Profile"
                className="commentEdit-profilePic"
              />
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Edit your comment..."
                className="commentEdit-textarea"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            <div className="commentEdit-buttons">
              <button className="btn btn-primary btn-sm me-2" onClick={() => handleSaveEdit(comment.commentId, post.postId, groupId)}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>Cancel</button>
            </div>
          </>
        ) : (
          <p className="commentEdit-content">{comment.content}</p>
        )}
      </div>

      {/* Media */}
      <div className="comment-media">
        {Array.isArray(comment.media) && comment.media.map((media, index) => (
          <div key={index} className="media-item" onClick={() => openMediaLightbox(post.postId, comment.commentId, index)}>
            {media.type === 'image' ? (
              <img src={media.url} alt={`Media ${index}`} className="comment-media-img" />
            ) : media.type === 'video' ? (
              <video controls className="comment-media-video">
                <source src={media.url} type="video/mp4" />
              </video>
            ) : null}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="commentActions">
        {(!post.isGroupPost || isMember) && (
          <div className="commentActionbtns">
            <span onClick={() => handleLikeComment(comment.commentId)} style={{
              color: commentLikes[comment.commentId]?.likedByUser ? 'red' : 'inherit',
              fontWeight: commentLikes[comment.commentId]?.likedByUser ? 'bold' : 'normal',
              cursor: 'pointer'
            }}>
              {commentLikes[comment.commentId]?.likedByUser ? 'Liked' : 'Like'}
              {typeof commentLikes[comment.commentId]?.likeCount === 'number' && (
                <span> ({commentLikes[comment.commentId].likeCount})</span>
              )}
            </span>
            <span onClick={() => toggleReplyInput(comment.commentId)} style={{ cursor: 'pointer', marginLeft: '10px' }}>Reply</span>
          </div>
        )}
        <i onClick={() => handleLikeComment(comment.commentId)}
           className={`bi ${commentLikes[comment.commentId]?.likedByUser ? 'bi-heart-fill' : 'bi-balloon-heart'}`}
           style={{ color: commentLikes[comment.commentId]?.likedByUser ? 'red' : 'inherit', marginLeft: '8px' }}
        />
      </div>

      {/* Replies */}
      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
        <div className="replies-section">
          {comment.replies.map((reply) => (
            <ReplyBlock
              key={reply.commentId}
              reply={reply}
              post={post}
              comment={comment}
              currentUser={currentUser}
              replyLikes={replyLikes}
              editingReplyId={editingReplyId}
              editedReplyText={editedReplyText}
              handleEditReplyClick={handleEditReplyClick}
              handleCancelReplyEdit={handleCancelReplyEdit}
              handleSaveReplyEdit={handleSaveReplyEdit}
              handleDeleteReply={handleDeleteReply}
              handleLikeReply={handleLikeReply}
              handleMentionClick={handleMentionClick}
              openReplyMediaLightbox={openReplyMediaLightbox}
              groupId={groupId}
            />
          ))}
        </div>
      )}

      {/* Reply Input */}
      {showReplyInput[comment.commentId] && (
        <div className="reply-input">
          <textarea
            name="replies"
            value={replyText[comment.commentId] || ''}
            onChange={(e) => handleReplyTextChange(comment.commentId, e)}
            placeholder="Write your reply..."
          />

          {/* Media Preview */}
          {attachedMedia[comment.commentId]?.length > 0 && (
            <div className="media-preview">
              {attachedMedia[comment.commentId].map((file, index) => (
                <div key={index} className="preview-item">
                  {file.type === 'image' ? (
                    <img src={file.url} alt={`Preview ${index}`} className="preview-media-img" />
                  ) : file.type === 'video' ? (
                    <video controls className="preview-media-video">
                      <source src={file.url} type="video/mp4" />
                    </video>
                  ) : null}
                  <button onClick={() => removeAttachedMedia(comment.commentId, index)} className="remove-media-btn">
                    <i className="bi bi-x-circle"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="reply-actions">
            <label htmlFor={`media-upload-${comment.commentId}`} className="btn btn-link text-dark">Attach Media</label>
            <input
              id={`media-upload-${comment.commentId}`}
              type="file"
              multiple
              name="media"
              onChange={(e) => handleMediaChange(comment.commentId, e)}
              style={{ display: 'none' }}
              ref={(el) => (fileInputRefs.current[comment.commentId] = el)}
            />
            {comment.groupId && <span className="group-info">Group Reply</span>}
            <button onClick={() => submitReply(post.postId, comment.commentId, replyText[comment.commentId], comment.groupId)} disabled={isSubmittingReply}>
              {isSubmittingReply ? 'Submitting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentBlock;
