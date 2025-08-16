import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// Simple star rating display component
const StarRatingDisplay = ({ rating, max = 5 }) => {
  return (
    <div style={{ color: '#f5a623' }}>
      {[...Array(max)].map((_, i) => (
        <span key={i}>{i < rating ? '★' : '☆'}</span>
      ))}
    </div>
  );
};

// Interactive star rating input component
const StarRatingInput = ({ rating, onChange, max = 5 }) => {
  return (
    <div style={{ color: '#f5a623', cursor: 'pointer' }}>
      {[...Array(max)].map((_, i) => (
        <span
          key={i}
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => onChange(i + 1)}
          onMouseLeave={() => onChange(rating)}
          style={{ fontSize: '24px' }}
        >
          {i < rating ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
};






const Review = ({ avatar, name, location, rating, comment, createdAt }) => (
  <div style={{ borderBottom:'1px solid #ddd', padding:'15px 0' }}>
    <div style={{ display:'flex', gap:15 }}>
      <img src={avatar} alt="" style={{ width:50, height:50, borderRadius:'50%' }}/>
      <div>
        <strong>{name}</strong>
        <div style={{ fontSize:12, color:'#666' }}>{location}</div>
        <StarRatingDisplay rating={rating} />
      </div>
    </div>
    <p style={{ marginTop:10 }}>{comment}</p>
    <small style={{ color:'#999' }}>
      {new Date(createdAt).toLocaleDateString()}
    </small>
  </div>
);

const ReviewsSection = ({ reviews, onSubmitReview }) => {
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();               // if you want to show current user

  const submit = () => {
    if (!newRating) return alert('Please give a rating');
    if (!newComment.trim()) return alert('Please write a comment');
    onSubmitReview({ rating:newRating, review:newComment });
    setNewRating(0);
    setNewComment('');
  };

  return (
    <div style={{ maxWidth:600, margin:'auto' }}>
      <h3>Reviews</h3>
      {reviews.length === 0 && <p>No reviews yet. Be the first!</p>}

      {reviews.map(r => (
        <Review
          key={r.id}
          avatar={r.avatar}
          name={r.name}
          location={r.location}
          rating={r.rating}
          comment={r.review}
          createdAt={r.created_at}
        />
      ))}

      {/* --- new review form --- */}
      <div style={{ marginTop:30 }}>
        <h4>Leave a review</h4>
        <StarRatingInput rating={newRating} onChange={setNewRating}/>
        <textarea
          rows={4}
          style={{ width:'100%', marginTop:10 }}
          placeholder="Write your review here..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
        />
        <button onClick={submit} style={{ marginTop:10 }}>
          Submit Review
        </button>
      </div>
    </div>
  );
};

export default ReviewsSection;
