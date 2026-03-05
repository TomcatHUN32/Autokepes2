import { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SocketContext = createContext();

// Polling-based messaging system (no WebSocket required)
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [messageListeners, setMessageListeners] = useState([]);
  const lastCheckRef = useRef(new Date().toISOString());

  // Function to add message listener
  const onMessage = useCallback((callback) => {
    setMessageListeners(prev => [...prev, callback]);
    return () => {
      setMessageListeners(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!user) return;

    const pollMessages = async () => {
      try {
        const response = await api.get('/messages/poll', {
          params: { since: lastCheckRef.current }
        });
        
        if (response.data && response.data.length > 0) {
          response.data.forEach(msg => {
            messageListeners.forEach(listener => listener(msg));
          });
          lastCheckRef.current = new Date().toISOString();
        }
      } catch (error) {
        // Silently fail - endpoint might not exist yet
      }
    };

    const interval = setInterval(pollMessages, 5000);
    return () => clearInterval(interval);
  }, [user, messageListeners]);

  const contextValue = {
    onMessage,
    isConnected: !!user
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
