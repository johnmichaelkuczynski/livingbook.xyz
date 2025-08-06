import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Play, CheckSquare, Square, Download, Expand, Minimize, Check, ZoomIn } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import KaTeXRenderer from './KaTeXRenderer';
import { downloadChunkAsWord, downloadRewrittenContentAsWord } from '@/utils/wordGenerator';

interface RewritePanelProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyChunkToDocument?: (chunkIndex: number, newContent: string) => void;
}

interface TextChunk {
  id: number;
  text: string;
  wordCount: number;
  selected: boolean;
  rewriting: boolean;
  rewritten: boolean;
  rewrittenText?: string;
}

// Function to split text into chunks of approximately 500 words
function splitIntoChunks(text: string, maxWords: number = 500): TextChunk[] {
  const words = text.split(/\s+/);
  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let chunkId = 1;

  for (const word of words) {
    currentChunk.push(word);
    
    if (currentChunk.length >= maxWords) {
      chunks.push({
        id: chunkId++,
        text: currentChunk.join(' '),
        wordCount: currentChunk.length,
        selected: false,
        rewriting: false,
        rewritten: false,
      });
      currentChunk = [];
    }
  }
  
  // Add remaining words as the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: chunkId++,
      text: currentChunk.join(' '),
      wordCount: currentChunk.length,
      selected: false,
      rewriting: false,
      rewritten: false,
    });
  }
  
  return chunks;
}

export default function RewritePanel({ document, isOpen, onClose, onApplyChunkToDocument }: RewritePanelProps) {
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [isRewriting, setIsRewriting] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [showCompleteView, setShowCompleteView] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize chunks when document changes
  useEffect(() => {
    if (document && document.content) {
      const textChunks = splitIntoChunks(document.content);
      setChunks(textChunks);
    }
  }, [document]);

  const rewriteMutation = useMutation({
    mutationFn: async ({ chunkText, instructions, provider }: { chunkText: string; instructions: string; provider: string }) => {
      const response = await apiRequest('POST', '/api/rewrite', {
        text: chunkText,
        instructions: instructions,
        provider: provider,
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Rewrite failed",
        description: error.message || "Failed to rewrite text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    setChunks(chunks.map(chunk => ({ ...chunk, selected: true })));
  };

  const handleDeselectAll = () => {
    setChunks(chunks.map(chunk => ({ ...chunk, selected: false })));
  };

  const handleChunkToggle = (chunkId: number) => {
    setChunks(chunks.map(chunk => 
      chunk.id === chunkId 
        ? { ...chunk, selected: !chunk.selected }
        : chunk
    ));
  };

  const handleStartRewrite = async () => {
    const selectedChunks = chunks.filter(chunk => chunk.selected);
    
    if (selectedChunks.length === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to rewrite.",
        variant: "destructive",
      });
      return;
    }

    if (!rewriteInstructions.trim()) {
      toast({
        title: "No instructions provided",
        description: "Please provide rewrite instructions.",
        variant: "destructive",
      });
      return;
    }

    setIsRewriting(true);

    // Process chunks one by one to avoid token limits
    for (const chunk of selectedChunks) {
      // Mark chunk as being rewritten
      setChunks(prev => prev.map(c => 
        c.id === chunk.id 
          ? { ...c, rewriting: true }
          : c
      ));

      try {
        const result = await rewriteMutation.mutateAsync({
          chunkText: chunk.text,
          instructions: rewriteInstructions,
          provider: selectedProvider,
        });

        // Mark chunk as rewritten and store result
        setChunks(prev => prev.map(c => 
          c.id === chunk.id 
            ? { 
                ...c, 
                rewriting: false, 
                rewritten: true, 
                rewrittenText: result.rewrittenText 
              }
            : c
        ));

        toast({
          title: "Chunk rewritten",
          description: `Chunk ${chunk.id} has been successfully rewritten.`,
        });

      } catch (error) {
        // Mark chunk as failed
        setChunks(prev => prev.map(c => 
          c.id === chunk.id 
            ? { ...c, rewriting: false }
            : c
        ));
        
        toast({
          title: "Rewrite failed",
          description: `Failed to rewrite chunk ${chunk.id}.`,
          variant: "destructive",
        });
        break; // Stop processing if one fails
      }
    }

    setIsRewriting(false);
  };

  const selectedCount = chunks.filter(chunk => chunk.selected).length;
  const rewrittenCount = chunks.filter(chunk => chunk.rewritten).length;

  // Download functionality - safe versions without DOM manipulation
  const getTextDownloadUrl = (content: string) => {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  };

  const getWordDownloadUrl = (content: string, filename: string) => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 40px;">${content.replace(/\n/g, '<br>')}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  };

  const downloadChunk = async (chunk: TextChunk, format: 'txt' | 'word' | 'pdf') => {
    const content = chunk.rewrittenText || chunk.text;
    const filename = `${document?.title || 'document'}_chunk_${chunk.id}_rewritten`;
    
    if (format === 'txt') {
      // Safe download without DOM manipulation
      const a = Object.assign(document.createElement('a'), {
        href: getTextDownloadUrl(content),
        download: filename + '.txt',
        style: 'display:none'
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (format === 'word') {
      // Use Word generator for proper .docx file
      await downloadChunkAsWord(content, chunk.id, document?.title);
    } else if (format === 'pdf') {
      // For PDF, create a clean version without complex math notation
      const cleanContent = content
        .replace(/\\\(/g, '(')  // Remove LaTeX inline delimiters
        .replace(/\\\)/g, ')')
        .replace(/\\\[/g, '[')  // Remove LaTeX display delimiters  
        .replace(/\\\]/g, ']')
        .replace(/\${1,2}/g, '') // Remove dollar signs
        .replace(/\\text\{([^}]+)\}/g, '$1') // Extract text from \text{}
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // Remove LaTeX commands but keep content
        .replace(/\\[a-zA-Z]+/g, '') // Remove remaining LaTeX commands
        .replace(/\{([^}]*)\}/g, '$1') // Remove remaining braces
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${document?.title || 'Document'} - Chunk ${chunk.id} Rewritten</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.8; 
                margin: 60px; 
                font-size: 14px;
                color: #333;
              }
              p { 
                margin: 20px 0; 
                text-align: justify; 
                text-indent: 30px;
              }
              @media print { 
                body { margin: 40px; } 
                p { margin: 15px 0; }
              }
            </style>
          </head>
          <body>
            <div>${cleanContent
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>')
              .replace(/^/, '<p>')
              .replace(/$/, '</p>')
              .replace(/<p><\/p>/g, '')
            }</div>
            <script>
              window.onload = function() {
                setTimeout(() => window.print(), 500);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }

    toast({
      title: "Download started",
      description: `Chunk ${chunk.id} content is being downloaded as ${format.toUpperCase()}.`,
    });
  };

  const downloadAllRewritten = async (format: 'txt' | 'word' | 'pdf') => {
    const rewrittenChunks = chunks.filter(chunk => chunk.rewritten);
    if (rewrittenChunks.length === 0) {
      toast({
        title: "No rewritten content",
        description: "Please rewrite some chunks first before downloading.",
        variant: "destructive",
      });
      return;
    }

    // Create clean continuous text without chunk metadata
    const allContent = rewrittenChunks.map(chunk => chunk.rewrittenText).join('\n\n');
    
    const filename = `${document?.title || 'document'}_rewritten`;
    
    if (format === 'txt') {
      // Safe download without DOM manipulation
      const a = Object.assign(document.createElement('a'), {
        href: getTextDownloadUrl(allContent),
        download: filename + '.txt',
        style: 'display:none'
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (format === 'word') {
      // Use Word generator for proper .docx file
      await downloadRewrittenContentAsWord(allContent, document?.title);
    } else if (format === 'pdf') {
      // Clean math notation for PDF
      const cleanAllContent = allContent
        .replace(/\\\(/g, '(')  // Remove LaTeX inline delimiters
        .replace(/\\\)/g, ')')
        .replace(/\\\[/g, '[')  // Remove LaTeX display delimiters  
        .replace(/\\\]/g, ']')
        .replace(/\${1,2}/g, '') // Remove dollar signs
        .replace(/\\text\{([^}]+)\}/g, '$1') // Extract text from \text{}
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // Remove LaTeX commands but keep content
        .replace(/\\[a-zA-Z]+/g, '') // Remove remaining LaTeX commands
        .replace(/\{([^}]*)\}/g, '$1') // Remove remaining braces
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${document?.title || 'Document'} - Rewritten</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.8; 
                margin: 60px; 
                font-size: 14px;
                color: #333;
              }
              h1 { 
                color: #2c3e50; 
                margin-bottom: 30px; 
                font-size: 24px;
                text-align: center;
                border-bottom: 2px solid #3498db;
                padding-bottom: 15px;
              }
              p { 
                margin: 20px 0; 
                text-align: justify; 
                text-indent: 30px;
                orphans: 3;
                widows: 3;
              }
              @media print { 
                body { margin: 40px; } 
                h1 { page-break-after: avoid; }
                p { margin: 15px 0; }
              }
            </style>
          </head>
          <body>
            <h1>${document?.title || 'Document'} - Rewritten</h1>
            <div>${cleanAllContent
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>')
              .replace(/^/, '<p>')
              .replace(/$/, '</p>')
              .replace(/<p><\/p>/g, '')
            }</div>
            <script>
              window.onload = function() {
                setTimeout(() => window.print(), 500);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }

    toast({
      title: "Download started",
      description: `All ${rewrittenChunks.length} rewritten chunks are being downloaded as ${format.toUpperCase()}.`,
    });
  };

  // Toggle expanded state for chunks
  const toggleExpanded = (chunkId: number) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const togglePreviewExpanded = (chunkId: string) => {
    setExpandedPreviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const applyChunkToDocument = (chunk: TextChunk) => {
    if (chunk.rewrittenText && onApplyChunkToDocument) {
      onApplyChunkToDocument(chunk.id - 1, chunk.rewrittenText);
      toast({
        title: "Applied to Document",
        description: `Chunk ${chunk.id} has been applied to the main document view.`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rewrite Document</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select chunks to rewrite • {chunks.length} chunks • {selectedCount} selected • {rewrittenCount} rewritten
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Control Panel */}
        <div className="p-6 border-b bg-gray-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rewrite Instructions
              </label>
              <Textarea
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                placeholder="Enter your rewrite instructions here (e.g., 'Make this more formal', 'Simplify the language', 'Add more examples')"
                className="w-full h-20"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Provider
                  </label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    <Square className="w-4 h-4 mr-1" />
                    Deselect All
                  </Button>
                  {rewrittenCount > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowCompleteView(true)}>
                      <ZoomIn className="w-4 h-4 mr-1" />
                      View Complete Rewrite
                    </Button>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleStartRewrite}
                disabled={isRewriting || selectedCount === 0 || !rewriteInstructions.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRewriting ? 'Rewriting...' : `Rewrite ${selectedCount} Chunks`}
              </Button>
            </div>

            {/* Download Section */}
            {rewrittenCount > 0 && (
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Download All Rewritten Content
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadAllRewritten('txt')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => downloadAllRewritten('word')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Word
                  </Button>
                  <Button
                    onClick={() => downloadAllRewritten('pdf')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {chunks.map((chunk) => (
                <Card key={chunk.id} className={`border-2 ${
                  chunk.selected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                } ${chunk.rewriting ? 'animate-pulse' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={chunk.selected}
                          onCheckedChange={() => handleChunkToggle(chunk.id)}
                          disabled={isRewriting}
                        />
                        <div>
                          <CardTitle className="text-sm">Chunk {chunk.id}</CardTitle>
                          <p className="text-xs text-gray-500">{chunk.wordCount} words</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {chunk.rewriting && (
                          <div className="flex items-center text-blue-600">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                            <span className="text-xs">Rewriting...</span>
                          </div>
                        )}
                        {chunk.rewritten && (
                          <div className="text-green-600 text-xs font-medium">✓ Rewritten</div>
                        )}
                        
                        {/* Individual chunk action buttons */}
                        {chunk.rewritten && (
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              onClick={() => applyChunkToDocument(chunk)}
                              variant="default"
                              size="sm"
                              className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Apply to Doc
                            </Button>
                            <Button
                              onClick={() => downloadChunk(chunk, 'txt')}
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              TXT
                            </Button>
                            <Button
                              onClick={() => downloadChunk(chunk, 'word')}
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              DOC
                            </Button>
                            <Button
                              onClick={() => downloadChunk(chunk, 'pdf')}
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        )}
                        
                        {/* Expand/Collapse button */}
                        <Button
                          onClick={() => toggleExpanded(chunk.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          {expandedChunks.has(chunk.id) ? (
                            <Minimize className="w-4 h-4" />
                          ) : (
                            <Expand className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Original:</p>
                        <div className={`text-sm text-gray-700 bg-gray-50 p-3 rounded overflow-y-auto ${
                          expandedChunks.has(chunk.id) ? 'max-h-none h-auto' : 'max-h-32'
                        }`}>
                          <KaTeXRenderer content={
                            expandedChunks.has(chunk.id) 
                              ? chunk.text 
                              : chunk.text.substring(0, 300) + (chunk.text.length > 300 ? '...' : '')
                          } />
                        </div>
                      </div>
                      
                      {chunk.rewrittenText && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-green-600">Rewritten:</p>
                            <Button
                              onClick={() => togglePreviewExpanded(chunk.id.toString())}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-green-100"
                              title={expandedPreviews.has(chunk.id.toString()) ? "Minimize preview" : "Expand preview to read full content"}
                            >
                              {expandedPreviews.has(chunk.id.toString()) ? (
                                <Minimize className="w-3 h-3" />
                              ) : (
                                <ZoomIn className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          <div className={`text-sm text-gray-700 bg-green-50 p-3 rounded overflow-y-auto border border-green-200 transition-all duration-300 ${
                            expandedPreviews.has(chunk.id.toString()) ? 'max-h-[80vh] min-h-96' : 'max-h-32'
                          }`}>
                            <KaTeXRenderer content={chunk.rewrittenText} />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Complete Rewrite View Modal */}
      {showCompleteView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Complete Rewritten Document</h2>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => downloadAllRewritten('txt')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download TXT
                </Button>
                <Button
                  onClick={() => downloadAllRewritten('word')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Word
                </Button>
                <Button
                  onClick={() => downloadAllRewritten('pdf')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => setShowCompleteView(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-sm max-w-none">
                <KaTeXRenderer 
                  content={chunks
                    .filter(chunk => chunk.rewritten)
                    .map(chunk => chunk.rewrittenText)
                    .join('\n\n')
                  }
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}