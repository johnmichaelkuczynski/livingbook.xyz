import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  isVisible: boolean;
}

export default function LoadingIndicator({ message = "Processing...", isVisible }: LoadingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-3 max-w-sm">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{message}</span>
        <span className="text-xs opacity-90">Please wait...</span>
      </div>
    </div>
  );
}