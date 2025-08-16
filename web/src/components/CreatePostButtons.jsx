const CreatePostButtons = ({
  isEditing,
  postType,
  handleCreatePostSubmit,
  handleEditPostSubmit, // This is the unified handler from the parent component
  // The individual handleEditX functions are no longer needed as props here
  // handleEditAlert,
  // handleEditTip,
  // handleEditQuestion,
  // handleEditGeneralPost,
  postToEdit, // This prop is now passed directly to handleEditPostSubmit if needed
  userLocation,
  selectedAlertType,
  content,
  mediaPreview,
  files,
  setError,
  setLoading,
  setPosts,
  user,
  BASE_URL,
  groupId,
  closeModal,
}) => {
  const handleClick = () => {
    if (isEditing) {
      // When editing, simply call the unified handleEditPostSubmit function.
      // This function already has access to all the necessary states and props
      // from the parent CreatePost component's scope via closure or explicit passing.
      // The parent already collects all relevant data for the edit operation.
      handleEditPostSubmit();
    } else {
      // When creating, call the handleCreatePostSubmit function.
      handleCreatePostSubmit();
    }
  };

  return (
    <div className="createPostBtn">
      <button
        type="button"
        className="attach-button"
        onClick={() => document.getElementById('file-input').click()}
      >
        <i className="bi bi-collection-play">
          <i className="bi bi-file-earmark-image"></i>
        </i>
      </button>
      <button onClick={handleClick}>
        {isEditing ? 'Update' : 'Post'}
      </button>
    </div>
  );
};

export default CreatePostButtons;