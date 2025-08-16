const PostTypeTabs = ({ postType, setPostType }) => {
  const tabs = [
    {type: 'discussion', label: 'Post'},
    { type: 'question', label: 'Question' },
    { type: 'alert', label: 'Alert' },
    { type: 'tip', label: 'Tip' },
    
  ];

  return (
    <div className="post-type-tabs d-flex justify-content-around mb-3">
      {tabs.map(({ type, label }) => (
        <button
          key={type}
          className={`post-tab-button ${postType === type ? 'active' : ''}`}
          onClick={() => setPostType(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default PostTypeTabs;
