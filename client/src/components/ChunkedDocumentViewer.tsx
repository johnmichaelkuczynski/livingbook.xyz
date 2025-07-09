import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Edit3, Save, X, RotateCcw, Download } from "lucide-react";
import KaTeXRenderer from "./KaTeXRenderer";
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
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {document.title}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{chunks.length} chunks</Badge>
              <Badge variant="secondary">{document.fileType.toUpperCase()}</Badge>
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
                className="bg-green-600 hover:bg-green-700 text-white ml-2"
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
            <Card key={chunk.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  <div className="prose prose-sm max-w-none">
                    <KaTeXRenderer 
                      content={chunk.content} 
                      className="text-sm text-gray-700 dark:text-gray-300"
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
    </div>
  );
}