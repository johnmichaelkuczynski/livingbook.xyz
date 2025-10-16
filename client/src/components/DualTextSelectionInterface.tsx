import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DualTextSelectionInterfaceProps {
  documentA: any;
  documentB: any;
  chunksA: string[];
  chunksB: string[];
  selectedChunkA: number;
  selectedChunkB: number;
  selectedTextA: string;
  selectedTextB: string;
  onChunkAChange: (chunk: number) => void;
  onChunkBChange: (chunk: number) => void;
  onTextASelect: (text: string) => void;
  onTextBSelect: (text: string) => void;
  onDualAction: (action: string) => void;
}

export default function DualTextSelectionInterface({
  documentA,
  documentB,
  chunksA,
  chunksB,
  selectedChunkA,
  selectedChunkB,
  selectedTextA,
  selectedTextB,
  onChunkAChange,
  onChunkBChange,
  onTextASelect,
  onTextBSelect,
  onDualAction
}: DualTextSelectionInterfaceProps) {
  
  // Get current chunk content
  const currentChunkA = chunksA.length > 0 ? chunksA[selectedChunkA] : documentA?.content || '';
  const currentChunkB = chunksB.length > 0 ? chunksB[selectedChunkB] : documentB?.content || '';
  
  // Utility function to clean HTML and extract text
  const cleanHtmlText = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  };

  // Handle text selection for document A
  const handleTextSelectionA = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let selectedText = selection.toString().trim();
      if (selectedText) {
        // Clean any HTML artifacts
        selectedText = cleanHtmlText(selectedText);
        onTextASelect(selectedText);
      }
    }
  };
  
  // Handle text selection for document B
  const handleTextSelectionB = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let selectedText = selection.toString().trim();
      if (selectedText) {
        // Clean any HTML artifacts
        selectedText = cleanHtmlText(selectedText);
        onTextBSelect(selectedText);
      }
    }
  };

  const bothTextsSelected = selectedTextA && selectedTextB;

  return (
    <div className="space-y-4">
      {/* Chunk Selectors */}
      <div className="grid grid-cols-2 gap-4">
        {chunksA.length > 0 && (
          <div>
            <label className="text-xs font-medium">Document A Chunks:</label>
            <Select value={selectedChunkA.toString()} onValueChange={(value) => onChunkAChange(parseInt(value))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chunksA.map((_, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    Chunk {index + 1} (~1000 words)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {chunksB.length > 0 && (
          <div>
            <label className="text-xs font-medium">Document B Chunks:</label>
            <Select value={selectedChunkB.toString()} onValueChange={(value) => onChunkBChange(parseInt(value))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chunksB.map((_, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    Chunk {index + 1} (~1000 words)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Text Selection Areas */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="h-60">
          <CardHeader className="py-2">
            <CardTitle className="text-xs">
              Select Text from {documentA?.title || 'Document A'}
              {selectedTextA && <span className="text-green-600 ml-2">✓ Selected</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div 
              className="text-xs h-48 overflow-y-auto border rounded p-2 cursor-text"
              onMouseUp={handleTextSelectionA}
              style={{ userSelect: 'text' }}
              dangerouslySetInnerHTML={{ __html: currentChunkA }}
            />
          </CardContent>
        </Card>

        <Card className="h-60">
          <CardHeader className="py-2">
            <CardTitle className="text-xs">
              Select Text from {documentB?.title || 'Document B'}
              {selectedTextB && <span className="text-green-600 ml-2">✓ Selected</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div 
              className="text-xs h-48 overflow-y-auto border rounded p-2 cursor-text"
              onMouseUp={handleTextSelectionB}
              style={{ userSelect: 'text' }}
              dangerouslySetInnerHTML={{ __html: currentChunkB }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Selected Text Display */}
      {(selectedTextA || selectedTextB) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-xs">
            <strong>Selected from A:</strong>
            <div className="bg-blue-50 p-2 rounded mt-1 max-h-20 overflow-y-auto">
              {selectedTextA || 'None selected'}
            </div>
          </div>
          <div className="text-xs">
            <strong>Selected from B:</strong>
            <div className="bg-green-50 p-2 rounded mt-1 max-h-20 overflow-y-auto">
              {selectedTextB || 'None selected'}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Only show when both texts selected */}
      {bothTextsSelected && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" onClick={() => onDualAction('podcast')} className="text-xs">
            Generate Podcast
          </Button>
          <Button size="sm" onClick={() => onDualAction('cognitive-map')} className="text-xs">
            Two-Document Mind Map
          </Button>
          <Button size="sm" onClick={() => onDualAction('test-me')} className="text-xs">
            Test Me
          </Button>
          <Button size="sm" onClick={() => onDualAction('study-guide')} className="text-xs">
            Study Guide
          </Button>
          <Button size="sm" onClick={() => onDualAction('rewrite')} className="text-xs">
            Compare & Rewrite
          </Button>
        </div>
      )}
      
      {/* Clear Selections */}
      {(selectedTextA || selectedTextB) && (
        <div className="flex justify-center">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              onTextASelect('');
              onTextBSelect('');
            }}
            className="text-xs"
          >
            Clear Selections
          </Button>
        </div>
      )}
    </div>
  );
}