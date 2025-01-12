"use client"
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Alert({ message, type = 'info', onClose }: AlertProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-close after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        ${getBackgroundColor()} text-white px-6 py-3 rounded-lg shadow-lg 
        z-50 min-w-[200px] text-center`}
    >
      {message}
    </motion.div>
  );
} 