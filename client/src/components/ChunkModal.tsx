import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { FileText, Clock, CheckCircle, XCircle, Loader2, Brain, BookOpen, TestTube, Map, Lightbulb, Bookmark, MessageSquare, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export type ContentType = 'test-me' | 'cognitive-map' | 'summary-thesis' | 'thesis-deep-dive' | 'suggested-readings' | 'discuss' | 'rewrite';

interface ChunkModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  contentType: ContentType;
}

interface DocumentChunk {
  index: number;
  words: number;
  preview: string;
}

interface ChunkInfo {
  documentId: number;
  totalWords: number;
  isLargeDocument: boolean;
  chunks: DocumentChunk[];
  totalChunks: number;
  avgWordsPerChunk: number;
}

interface ContentResult {
  chunkIndex: number;
  success: boolean;
  content?: string;
  wordCount?: number;
  error?: string;
}

const CONTENT_CONFIG = {
  'test-me': {
    title: 'Generate Tests',
    description: 'Create practice tests and quizzes for selected chunks',
    icon: TestTube,
    color: 'bg-green-600 hover:bg-green-700',
    apiEndpoint: '/api/test-me'
  },
  'cognitive-map': {
    title: 'Generate Cognitive Maps',
    description: 'Create visual concept maps for selected chunks',
    icon: Map,
    color: 'bg-orange-600 hover:bg-orange-700',
    apiEndpoint: '/api/generate-cognitive-map'
  },
  'summary-thesis': {
    title: 'Generate Summary & Thesis',
    description: 'Create summaries and thesis statements for selected chunks',
    icon: Lightbulb,
    color: 'bg-yellow-600 hover:bg-yellow-700',
    apiEndpoint: '/api/generate-summary-thesis'
  },
  'thesis-deep-dive': {
    title: 'Thesis Deep Dive',
    description: 'Deep analysis and exploration of thesis concepts',
    icon: Brain,
    color: 'bg-indigo-600 hover:bg-indigo-700',
    apiEndpoint: '/api/generate-thesis-deep-dive'
  },
  'suggested-readings': {
    title: 'Suggested Readings',
    description: 'Generate relevant reading recommendations for selected chunks',
    icon: Bookmark,
    color: 'bg-purple-600 hover:bg-purple-700',
    apiEndpoint: '/api/generate-suggested-readings'
  },
  'discuss': {
    title: 'Discussion Points',
    description: 'Generate discussion topics and questions for selected chunks',
    icon: MessageSquare,
    color: 'bg-teal-600 hover:bg-teal-700',
    apiEndpoint: '/api/discuss'
  },
  'rewrite': {
    title: 'Rewrite Content',
    description: 'Rewrite and improve selected chunks with custom instructions',
    icon: Edit,
    color: 'bg-red-600 hover:bg-red-700',
    apiEndpoint: '/api/rewrite'
  }
};

export default function ChunkModal({ isOpen, onClose, document, contentType }: ChunkModalProps) {
  const [chunkInfo, setChunkInfo] = useState<ChunkInfo | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(new Set());
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState<number | null>(null);
  const [results, setResults] = useState<ContentResult[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [provider, setProvider] = useState('openai');
  
  const { toast } = useToast();
  const config = CONTENT_CONFIG[contentType];

  useEffect(() => {
    if (isOpen && document) {
      loadDocumentChunks();
      setSelectedChunks(new Set());
      setResults([]);
      setGenerationProgress(0);
      setCurrentChunk(null);
    }
  }, [isOpen, document]);

  const loadDocumentChunks = async () => {
    setIsLoadingChunks(true);
    try {
      const response = await apiRequest('GET', `/api/documents/${document.id}/chunks`);
      if (response.ok) {
        const data: ChunkInfo = await response.json();
        setChunkInfo(data);
      } else {
        toast({
          title: "Error loading document chunks",
          description: "Failed to load document structure",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading chunks:', error);
      toast({
        title: "Error loading chunks",
        description: "Failed to analyze document structure",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleChunkToggle = (chunkIndex: number) => {
    const newSelected = new Set(selectedChunks);
    if (newSelected.has(chunkIndex)) {
      newSelected.delete(chunkIndex);
    } else {
      newSelected.add(chunkIndex);
    }
    setSelectedChunks(newSelected);
  };

  const selectAllChunks = () => {
    if (chunkInfo) {
      setSelectedChunks(new Set(chunkInfo.chunks.map(chunk => chunk.index)));
    }
  };

  const clearSelection = () => {
    setSelectedChunks(new Set());
  };

  const generateContent = async () => {
    if (selectedChunks.size === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to process",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setGenerationProgress(0);
    
    const selectedChunkArray = Array.from(selectedChunks);
    const totalChunks = selectedChunkArray.length;
    
    try {
      for (let i = 0; i < selectedChunkArray.length; i++) {
        const chunkIndex = selectedChunkArray[i];
        setCurrentChunk(chunkIndex);
        setGenerationProgress(((i + 1) / totalChunks) * 100);

        try {
          const requestBody: any = {
            documentId: document.id,
            chunkIndex: chunkIndex,
            provider: provider
          };

          // Add custom instructions for rewrite content type
          if (contentType === 'rewrite' && customInstructions.trim()) {
            requestBody.customInstructions = customInstructions.trim();
          }

          const response = await apiRequest('POST', config.apiEndpoint, requestBody);
          
          if (response.ok) {
            const data = await response.json();
            const result: ContentResult = {
              chunkIndex,
              success: true,
              content: data[Object.keys(data).find(key => key !== 'chunkIndex') || 'content'],
              wordCount: chunkInfo?.chunks.find(c => c.index === chunkIndex)?.words
            };
            
            setResults(prev => [...prev, result]);
            
            toast({
              title: `Chunk ${chunkIndex + 1} completed`,
              description: `${config.title.replace('Generate ', '')} generated successfully`,
            });
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error(`Error processing chunk ${chunkIndex}:`, error);
          const result: ContentResult = {
            chunkIndex,
            success: false,
            error: `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          setResults(prev => [...prev, result]);
          
          toast({
            title: `Chunk ${chunkIndex + 1} failed`,
            description: "Failed to generate content for this chunk",
            variant: "destructive",
          });
        }

        // Add delay between requests (except for the last one)
        if (i < selectedChunkArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        }
      }
      
      toast({
        title: "Content generation completed",
        description: `Processed ${selectedChunkArray.length} chunks successfully`,
      });
      
    } catch (error) {
      console.error('Content generation error:', error);
      toast({
        title: "Generation failed",
        description: "An unexpected error occurred during content generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCurrentChunk(null);
      setGenerationProgress(0);
    }
  };

  const IconComponent = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <IconComponent className="w-6 h-6" />
            {config.title}
          </DialogTitle>
          <p className="text-gray-600 mt-2">{config.description}</p>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* Left Panel - Chunk Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Select Document Chunks</span>
                  {chunkInfo && (
                    <Badge variant="outline">
                      {chunkInfo.totalWords.toLocaleString()} total words
                    </Badge>
                  )}
                </CardTitle>
                
                {chunkInfo && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      onClick={selectAllChunks}
                      variant="outline"
                      size="sm"
                    >
                      Select All ({chunkInfo.chunks.length})
                    </Button>
                    <Button
                      onClick={clearSelection}
                      variant="outline"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                    <Badge variant="secondary">
                      {selectedChunks.size} selected
                    </Badge>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 min-h-0">
                {isLoadingChunks ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-3">Loading document chunks...</span>
                  </div>
                ) : chunkInfo ? (
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {chunkInfo.chunks.map((chunk) => (
                        <Card 
                          key={chunk.index}
                          className={`cursor-pointer transition-all ${
                            selectedChunks.has(chunk.index)
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleChunkToggle(chunk.index)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={selectedChunks.has(chunk.index)}
                                onChange={() => handleChunkToggle(chunk.index)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-medium">
                                    Chunk {chunk.index + 1}
                                  </h3>
                                  <Badge variant="outline">
                                    {chunk.words} words
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {chunk.preview}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No chunks available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Settings & Generation */}
          <div className="w-80 flex flex-col gap-4">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>AI Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">ZHI 1</SelectItem>
                      <SelectItem value="anthropic">ZHI 2</SelectItem>
                      <SelectItem value="deepseek">ZHI 3</SelectItem>
                      <SelectItem value="perplexity">ZHI 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contentType === 'rewrite' && (
                  <div>
                    <Label>Custom Instructions</Label>
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="How should the content be rewritten? (optional)"
                      rows={3}
                    />
                  </div>
                )}

                <Button
                  onClick={generateContent}
                  disabled={isGenerating || selectedChunks.size === 0}
                  className={`w-full ${config.color} text-white`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <IconComponent className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Progress */}
            {isGenerating && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Generation Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600">
                      {currentChunk !== null && `Processing chunk ${currentChunk + 1}...`}
                    </p>
                    <p className="text-xs text-gray-500">
                      10-second delay between chunks to avoid rate limits
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {results.length > 0 && (
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Generated Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {results.map((result) => (
                        <Card key={result.chunkIndex} className="p-4">
                          <div className="flex items-start gap-3">
                            {result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm mb-2">
                                Chunk {result.chunkIndex + 1}
                                {result.wordCount && (
                                  <Badge variant="outline" className="ml-2">
                                    {result.wordCount} words
                                  </Badge>
                                )}
                              </div>
                              {result.success && result.content ? (
                                <div className="bg-gray-50 rounded-lg p-4 border">
                                  <ScrollArea className="max-h-[500px]">
                                    <div className="text-sm text-gray-900 whitespace-pre-wrap font-sans leading-relaxed pr-4">
                                      {result.content}
                                    </div>
                                  </ScrollArea>
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                  {result.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            Select chunks and generate {config.title.toLowerCase()} with 10-second delays between requests
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}