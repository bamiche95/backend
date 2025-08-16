import { createContext, useContext, useMemo } from 'react';

const TimezoneContext = createContext();

export const TimezoneProvider = ({ children }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log ('Time zone of my broswer', timezone);
  const value = useMemo(() => ({ timezone }), [timezone]);

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => useContext(TimezoneContext);
