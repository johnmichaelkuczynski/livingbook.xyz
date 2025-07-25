import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

interface ForceSelectionTestProps {
  onTextSelect: (text: string) => void;
}

export default function ForceSelectionTest({ onTextSelect }: ForceSelectionTestProps) {
  const [testText] = useState("Algorithm: A fixed procedure for carrying out a task. The rules that we learn in grade school to multiply, add, etc., multi-digit numbers are algorithms. By formalizing inferences, logicians create algorithms for determining whether, given two statements, one of them follows from the other.");

  const handleForceTest = () => {
    console.log('🎙️ FORCE TEST - Triggering podcast with sample text');
    onTextSelect(testText);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Button
        onClick={handleForceTest}
        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
      >
        <Mic className="w-4 h-4 mr-2" />
        🎧 Force Podcast Test
      </Button>
    </div>
  );
}