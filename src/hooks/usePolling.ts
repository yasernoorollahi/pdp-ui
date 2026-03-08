import { useEffect } from 'react';

export const usePolling = (callback: () => void, intervalMs: number) => {
  useEffect(() => {
    callback();
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, []);
};
