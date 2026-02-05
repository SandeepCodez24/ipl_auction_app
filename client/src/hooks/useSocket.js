import { useEffect, useMemo } from 'react';
import { createSocket } from '../services/socket.js';

const useSocket = (token) => {
  const socket = useMemo(() => createSocket(token), [token]);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};

export default useSocket;
