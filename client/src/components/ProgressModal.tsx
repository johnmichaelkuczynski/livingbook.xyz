import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
  title?: string;
}

export default function ProgressModal({ isOpen, progress, status, title = "Processing" }: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          {progress === 100 ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <Brain className="w-6 h-6 text-blue-500 animate-pulse" />
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>{status}</span>
            <span>{progress}%</span>
          </div>
          
          {progress === 100 && (
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Analysis complete! Check the results above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}