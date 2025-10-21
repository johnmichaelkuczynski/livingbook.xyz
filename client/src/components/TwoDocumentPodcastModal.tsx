import React, { useState } from 'react';
import PodcastModal from './PodcastModal';

interface TwoDocumentPodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentA: any | null;
  documentB: any | null;
  selectedTextA: string;
  selectedTextB: string;
}

export function TwoDocumentPodcastModal({
  isOpen,
  onClose,
  documentA,
  documentB,
  selectedTextA,
  selectedTextB
}: TwoDocumentPodcastModalProps) {
  const [consolidatedDocument, setConsolidatedDocument] = useState<string>('');
  const [showPodcastModal, setShowPodcastModal] = useState(false);

  // Auto-consolidate when modal opens
  React.useEffect(() => {
    if (isOpen && documentA && documentB) {
      // Determine which text to use
      let textA = selectedTextA;
      let textB = selectedTextB;
      
      // Auto-complete for short documents if no text is selected
      const isDocumentAShort = !documentA?.isChunked || (documentA?.chunkCount || 1) <= 1;
      const isDocumentBShort = !documentB?.isChunked || (documentB?.chunkCount || 1) <= 1;
      
      if (!textA && isDocumentAShort && documentA?.content) {
        textA = documentA.content;
      }
      
      if (!textB && isDocumentBShort && documentB?.content) {
        textB = documentB.content;
      }
      
      // Create consolidated document with clear labels
      const consolidatedContent = `DOCUMENT A: ${documentA?.title || 'Document A'}

${textA}

${'-'.repeat(80)}

DOCUMENT B: ${documentB?.title || 'Document B'}

${textB}`;

      setConsolidatedDocument(consolidatedContent);
      // Automatically open podcast modal
      setShowPodcastModal(true);
    }
  }, [isOpen, documentA, documentB, selectedTextA, selectedTextB]);

  const handleClosePodcastModal = () => {
    setShowPodcastModal(false);
    setConsolidatedDocument('');
    onClose();
  };

  return (
    <PodcastModal
      isOpen={showPodcastModal}
      onClose={handleClosePodcastModal}
      document={{ 
        content: consolidatedDocument,
        title: `Comparative Analysis: ${documentA?.title || 'Document A'} vs ${documentB?.title || 'Document B'}`,
        id: `consolidated-${Date.now()}`
      }}
      selectedText={consolidatedDocument}
    />
  );
}