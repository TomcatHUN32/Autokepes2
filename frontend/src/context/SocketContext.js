import { createContext, useContext, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SOCKET_PATH = '/api/socket.io';

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      socketRef.current = io(BACKEND_URL, { path: SOCKET_PATH });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        socketRef.current.emit('join_room', { user_id: user.user_id });
      });

      return () => {
        if (socketRef.current?.connected) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
