import React, { createContext, useContext, useState } from 'react';

export const FlashMessageContext = createContext();


export const FlashMessageProvider = ({ children }) => {
  const [message, setMessage] = useState(null);

  const setFlashMessage = ({ type, message }) => {
    setMessage({ type, message });
    setTimeout(() => setMessage(null), 4000); // Auto-dismiss after 4s
  };

  return (
    <FlashMessageContext.Provider value={{ message, setFlashMessage }}>
      {children}
    </FlashMessageContext.Provider>
  );
};

export const useFlashMessage = () => useContext(FlashMessageContext);
