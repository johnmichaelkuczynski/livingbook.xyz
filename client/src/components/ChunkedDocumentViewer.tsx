import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Edit3, Save, X, RotateCcw, Download, Network, CheckSquare, Square } from "lucide-react";
import KaTeXRenderer from "./KaTeXRenderer";
import ConceptLattice from "./ConceptLattice";
import { useToast } from "@/hooks/use-toast";

interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  isModified: boolean;
  isEditing: boolean;
}

interface ChunkedDocumentViewerProps {
  document: any | null;
  chunks: DocumentChunk[];
  onChunkUpdate?: (chunkIndex: number, newContent: string) => void;
  onRewriteChunk?: (chunkIndex: number, instructions: string) => void;
}

export default function ChunkedDocumentViewer({ 
  document, 
  chunks, 
  onChunkUpdate,
  onRewriteChunk 
}: ChunkedDocumentViewerProps) {
  const [editingChunk, setEditingChunk] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [rewriteInstructions, setRewriteInstructions] = useState<string>("");
  const [showRewriteDialog, setShowRewriteDialog] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(new Set());
  const [showConceptLattice, setShowConceptLattice] = useState(false);
  const { toast } = useToast();

  const startEditing = (chunkIndex: number, content: string) => {
    setEditingChunk(chunkIndex);
    setEditContent(content);
  };

  const saveEdit = () => {
    if (editingChunk !== null && onChunkUpdate) {
      onChunkUpdate(editingChunk, editContent);
      setEditingChunk(null);
      setEditContent("");
      toast({
        title: "Chunk Updated",
        description: `Chunk ${editingChunk + 1} has been saved.`,
      });
    }
  };

  const cancelEdit = () => {
    setEditingChunk(null);
    setEditContent("");
  };

  const handleRewrite = (chunkIndex: number) => {
    if (rewriteInstructions.trim() && onRewriteChunk) {
      onRewriteChunk(chunkIndex, rewriteInstructions);
      setShowRewriteDialog(null);
      setRewriteInstructions("");
      toast({
        title: "Rewrite Requested",
        description: `AI is rewriting chunk ${chunkIndex + 1}...`,
      });
    }
  };

  const downloadChunk = (chunk: DocumentChunk) => {
    const content = chunk.content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.title || 'document'}_chunk_${chunk.chunkIndex + 1}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      // Clear chunk selection when text is selected
      if (selectedChunks.size > 0) {
        setSelectedChunks(new Set());
      }
    }
  };

  const handleChunkSelect = (chunkIndex: number) => {
    const newSelectedChunks = new Set(selectedChunks);
    if (newSelectedChunks.has(chunkIndex)) {
      newSelectedChunks.delete(chunkIndex);
    } else {
      newSelectedChunks.add(chunkIndex);
      // Clear text selection when chunks are selected
      if (selectedText) {
        setSelectedText('');
      }
    }
    setSelectedChunks(newSelectedChunks);
  };

  const selectAllChunks = () => {
    const allChunks = new Set(chunks.map((_, index) => index));
    setSelectedChunks(allChunks);
  };

  const clearChunkSelection = () => {
    setSelectedChunks(new Set());
  };

  const getSelectedChunksText = () => {
    return Array.from(selectedChunks)
      .sort((a, b) => a - b)
      .map(index => chunks[index]?.content || '')
      .join('\n\n');
  };

  const handleVisualize = () => {
    if (selectedText) {
      setShowConceptLattice(true);
    } else if (selectedChunks.size > 0) {
      // Use selected chunks text
      const chunksText = getSelectedChunksText();
      setSelectedText(chunksText);
      setShowConceptLattice(true);
    }
  };

  if (!document || !chunks.length) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">No document loaded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {document.title}
              </div>
              {!selectedText && selectedChunks.size === 0 && (
                <p className="text-sm text-gray-500 font-normal">
                  💡 Select text in chunks OR use checkboxes to select entire chunks for visualization
                </p>
              )}
              {selectedText && (
                <p className="text-sm text-purple-600 font-normal">
                  ✓ Text selected: "{selectedText.substring(0, 40)}..." - Click Visualize!
                </p>
              )}
              {selectedChunks.size > 0 && !selectedText && (
                <p className="text-sm text-blue-600 font-normal">
                  ✓ {selectedChunks.size} chunk{selectedChunks.size > 1 ? 's' : ''} selected - Click Visualize!
                </p>
              )}
              {selectedChunks.size > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllChunks}
                    className="text-xs h-7"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChunkSelection}
                    className="text-xs h-7"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{chunks.length} chunks</Badge>
              <Badge variant="secondary">{document.fileType.toUpperCase()}</Badge>
              {(selectedText || selectedChunks.size > 0) ? (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleVisualize}
                  className="bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
                >
                  <Network className="w-4 h-4 mr-1" />
                  {selectedText ? 'Visualize Selected Text' : `Visualize ${selectedChunks.size} Chunk${selectedChunks.size > 1 ? 's' : ''}`}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  className="opacity-50"
                >
                  <Network className="w-4 h-4 mr-1" />
                  Select Text or Chunks
                </Button>
              )}
              <Button 
                variant="default" 
                size="sm"
                onClick={() => {
                  // Open main RewritePanel for document rewriting
                  if (onRewriteChunk) {
                    onRewriteChunk(0, "open_rewrite_panel"); // Signal to open main rewrite panel
                  } else {
                    toast({
                      title: "Rewrite Mode",
                      description: "Click the main Rewrite button to access document rewriting features.",
                    });
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Rewrite Document
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {chunks.map((chunk) => (
            <Card key={chunk.id} className={`relative transition-all duration-200 ${
              selectedChunks.has(chunk.chunkIndex) 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`chunk-${chunk.chunkIndex}`}
                      checked={selectedChunks.has(chunk.chunkIndex)}
                      onCheckedChange={() => handleChunkSelect(chunk.chunkIndex)}
                      className="border-2"
                    />
                    <label 
                      htmlFor={`chunk-${chunk.chunkIndex}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select Chunk
                    </label>
                    <Badge variant="outline">Chunk {chunk.chunkIndex + 1}</Badge>
                    <Badge variant="secondary">{chunk.wordCount} words</Badge>
                    {chunk.isModified && (
                      <Badge variant="default">Modified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(chunk.chunkIndex, chunk.content)}
                      disabled={editingChunk === chunk.chunkIndex}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRewriteDialog(chunk.chunkIndex)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadChunk(chunk)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingChunk === chunk.chunkIndex ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[200px] text-sm"
                      placeholder="Edit chunk content..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none"
                    onMouseUp={handleTextSelection}
                    style={{ userSelect: 'text' }}
                  >
                    <KaTeXRenderer 
                      content={chunk.content} 
                      className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                    />
                  </div>
                )}

                {/* Rewrite Dialog */}
                {showRewriteDialog === chunk.chunkIndex && (
                  <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium mb-2">Rewrite Instructions</h4>
                    <Textarea
                      value={rewriteInstructions}
                      onChange={(e) => setRewriteInstructions(e.target.value)}
                      placeholder="Enter instructions for how to rewrite this chunk..."
                      className="mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleRewrite(chunk.chunkIndex)} 
                        size="sm"
                        disabled={!rewriteInstructions.trim()}
                      >
                        Rewrite Chunk
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowRewriteDialog(null)} 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {showConceptLattice && selectedText && (
        <ConceptLattice
          selectedText={selectedText}
          documentTitle={document?.originalName || 'Document'}
          onClose={() => setShowConceptLattice(false)}
        />
      )}
    </div>
  );
}