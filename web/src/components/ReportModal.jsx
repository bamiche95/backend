import React, { useState, useEffect } from 'react';
import '@/assets/reportModal.css';
import { BASE_URL, getToken } from "../config";

const token = getToken(); // Get the token for authentication
export default function ReportModal({ postId, postType, onClose, onSubmit }) {
    const [reasons, setReasons] = useState([]);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
  const [localError, setLocalError] = React.useState(null);

    useEffect(() => {
        async function fetchReasons() {
            try {
                const res = await fetch(`${BASE_URL}/api/report-reasons`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch reasons');
                const data = await res.json();
                setReasons(data.reasons || []);
            } catch (err) {
                console.error(err);
                setReasons([]);
            }
        }
        fetchReasons();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            setLocalError('Please select a reason');
            return;
        }
        setSubmitting(true);
        setLocalError(null);
        try {
            await onSubmit(postId, postType, reason, description);
        } catch (e) {
            setLocalError(e.message);
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <>


            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal-container">
                    <div className="modal-header">
                        <h2 className="modal-title" id="modal-title">Report Post</h2>
                        <button
                            className="close-button"
                            aria-label="Close modal"
                            onClick={onClose}
                            disabled={submitting}
                            type="button"
                        >
                            &times;
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="reason">Reason:</label>
                        <div role="radiogroup" aria-labelledby="reason-label">
                            <p id="reason-label" className="mb-2 font-medium">Reason:</p>
                            {reasons.map((r) => (
                                <label key={r} style={{ display: 'block', marginBottom: '8px', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={() => setReason(r)}
                                        disabled={submitting}
                                        required
                                        style={{ marginRight: '8px' }}
                                    />
                                    {r}
                                </label>
                            ))}
                        </div>
                        <label htmlFor="description">Description (optional):</label>
                        <textarea
                            id="description"
                            rows={3}
                            placeholder="Add any additional details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={submitting}
                        />

                        {error && <div className="error-message">{error}</div>}

                        {localError && <p style={{ color: 'red' }}>{localError}</p>}
                        {error && <p style={{ color: 'red' }}>{error}</p>}

                        <div className="button-group">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-report" disabled={submitting}>
                                {submitting ? 'Reporting...' : 'Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
