import React from 'react';

interface PodcastProgressIndicatorProps {
  isVisible: boolean;
  message: string;
  type: 'loading' | 'success' | 'error';
}

export default function PodcastProgressIndicator({ isVisible, message, type }: PodcastProgressIndicatorProps) {
  if (!isVisible) return null;

  const bgColor = {
    loading: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500'
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300`}>
      <div className="flex items-center space-x-2">
        {type === 'loading' && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        {type === 'success' && <span>✅</span>}
        {type === 'error' && <span>❌</span>}
        <span>{message}</span>
      </div>
    </div>
  );
}