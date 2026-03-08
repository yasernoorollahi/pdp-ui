import { useState, useRef } from 'react';

interface Toast {
  msg: string;
  type: 'success' | 'error';
}

export const useToast = () => {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
};
