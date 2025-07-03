import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Play, CheckSquare, Square } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import SimpleMathRenderer from './SimpleMathRenderer';

interface RewritePanelProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
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

export default function RewritePanel({ document, isOpen, onClose }: RewritePanelProps) {
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [isRewriting, setIsRewriting] = useState(false);
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Original:</p>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                          <SimpleMathRenderer content={chunk.text.substring(0, 300) + (chunk.text.length > 300 ? '...' : '')} />
                        </div>
                      </div>
                      
                      {chunk.rewrittenText && (
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-2">Rewritten:</p>
                          <div className="text-sm text-gray-700 bg-green-50 p-3 rounded max-h-32 overflow-y-auto border border-green-200">
                            <SimpleMathRenderer content={chunk.rewrittenText.substring(0, 300) + (chunk.rewrittenText.length > 300 ? '...' : '')} />
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
    </div>
  );
}