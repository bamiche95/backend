// SessionContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext(null); // 🔹 initialize it with null

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/session", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(err => console.error("Failed to load session:", err));
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
