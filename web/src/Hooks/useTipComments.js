import { useState, useEffect } from 'react';
import { fetchTipComments, submitTipComment } from '../api/tip';

const useTipComments = (tipId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTipComments(tipId);
        setComments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tipId]);

  const submitComment = async () => {
    try {
      const newComment = await submitTipComment(tipId, { content: text, files });
      setComments(prev => [...prev, newComment]);
      setText('');
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    comments,
    loading,
    error,
    text,
    setText,
    files,
    setFiles,
    previews,
    setPreviews,
    submitComment,
  };
};

export default useTipComments;
