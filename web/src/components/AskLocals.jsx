import React, { useState, useEffect } from 'react';

const AskLocals = ({ currentUser }) => {
  const [localPosts, setLocalPosts] = useState([]);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);

  const handlePostSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/local-expertise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question, category }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalPosts(prev => [data, ...prev]);
        setQuestion('');
        setCategory('General');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLocalPosts = async () => {
      const res = await fetch(`${BASE_URL}/api/local-expertise`, { credentials: 'include' });
      const data = await res.json();
      setLocalPosts(data);
    };
    fetchLocalPosts();
  }, []);

  return (
    <div>
      {/* Ask form */}
      <div className="card p-3 mb-4 shadow-sm">
        <h5>Ask your neighbors</h5>
        <textarea
          className="form-control mb-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Need a trusted plumber? Ask here..."
        />
        <select
          className="form-select mb-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>General</option>
          <option>Home Repair</option>
          <option>Local Food</option>
          <option>Safety</option>
          <option>Pet Care</option>
        </select>
        <button
          className="btn btn-primary w-100"
          disabled={loading || !question.trim()}
          onClick={handlePostSubmit}
        >
          {loading ? 'Posting...' : 'Ask Locals'}
        </button>
      </div>

      {/* Posts List */}
      <div>
        {localPosts.map((post, i) => (
          <div key={i} className="card mb-3 p-3 shadow-sm">
            <div className="d-flex justify-content-between">
              <strong>{post.user?.name || 'Neighbor'}</strong>
              <span className="badge bg-secondary">{post.category}</span>
            </div>
            <p className="mt-2">{post.question}</p>
            {/* Optional: likes/comments */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AskLocals;
