import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    
    try {
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
      setIsConsolidated(true);
    } catch (error) {
      console.error('Error consolidating documents:', error);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleGeneratePodcast = () => {
    // Close this modal and open the standard podcast modal
    setShowPodcastModal(true);
  };

  const handleClosePodcastModal = () => {
    setShowPodcastModal(false);
    // Reset the consolidation state when podcast modal closes
    setIsConsolidated(false);
    setConsolidatedDocument('');
  };

  const handleCloseModal = () => {
    setIsConsolidated(false);
    setConsolidatedDocument('');
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showPodcastModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Two-Document Podcast Generator</DialogTitle>
          </DialogHeader>

          {!isConsolidated ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Step 1: Document Consolidation Required
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  The podcast function works with single documents only. You need to consolidate 
                  both documents into one before generating a podcast. This will create a single 
                  document with Document A followed by Document B, each clearly labeled.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Document A: {documentA?.title || documentA?.originalName}</h4>
                  <ScrollArea className="h-32 text-sm text-gray-600 dark:text-gray-400">
                    {selectedTextA || 'No text selected'}
                  </ScrollArea>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Document B: {documentB?.title || documentB?.originalName}</h4>
                  <ScrollArea className="h-32 text-sm text-gray-600 dark:text-gray-400">
                    {selectedTextB || 'No text selected'}
                  </ScrollArea>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleConsolidate} 
                  disabled={isConsolidating || (!selectedTextA && !selectedTextB && (!documentA?.content || !documentB?.content))}
                  className="px-8"
                >
                  {isConsolidating ? 'Consolidating...' : 'Consolidate into One Document'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  ✓ Step 2: Documents Consolidated Successfully
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Your documents have been consolidated. Review the content below and then 
                  generate your comparative podcast with the six-part structure (Intro, Summary A, 
                  Summary B, Similarities, Differences, Conclusion).
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Consolidated Document Preview:</h4>
                <ScrollArea className="h-64 text-sm">
                  <pre className="whitespace-pre-wrap font-sans">{consolidatedDocument}</pre>
                </ScrollArea>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsConsolidated(false)}>
                  Back to Edit
                </Button>
                <Button onClick={handleGeneratePodcast} className="px-8">
                  Turn This Document into Podcast
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
}