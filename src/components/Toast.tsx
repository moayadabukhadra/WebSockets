'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const baseClasses = "fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg transition-all duration-300";
  const typeClasses = {
    success: "bg-green-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <p className="text-white font-semibold text-center">{message}</p>
    </div>
  );
} 