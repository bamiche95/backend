// FlashMessage.jsx
import React from 'react';
import { useFlashMessage } from '../context/FlashMessageContext'; // Make sure path is correct

const FlashMessage = () => {
  const { message } = useFlashMessage();

  // If no message, return nothing
  if (!message) return null;

  // Determine alert type (Bootstrap classes for success, error, etc.)
  const alertClass = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
  }[message.type] || 'alert-info';  // Default to 'info' if no type found

  return (
    <div className={`alert ${alertClass} text-center`} role="alert">
      {message.message}
    </div>
  );
};

export default FlashMessage;
