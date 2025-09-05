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
import { Play, Pause, Volume2, Users, User, Settings, Loader2, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ChunkPodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
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

interface PodcastResult {
  chunkIndex: number;
  success: boolean;
  script?: string;
  audioUrl?: string;
  filename?: string;
  wordCount?: number;
  error?: string;
}

type PodcastMode = 'normal-single' | 'normal-dialogue' | 'custom-single' | 'custom-dialogue';

export default function ChunkPodcastModal({ isOpen, onClose, document }: ChunkPodcastModalProps) {
  const [mode, setMode] = useState<PodcastMode>('normal-single');
  const [customInstructions, setCustomInstructions] = useState('');
  const [chunkInfo, setChunkInfo] = useState<ChunkInfo | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(new Set());
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState<number | null>(null);
  const [podcastResults, setPodcastResults] = useState<PodcastResult[]>([]);
  const [isAutoComplete, setIsAutoComplete] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && document) {
      loadDocumentChunks();
    }
  }, [isOpen, document]);

  const loadDocumentChunks = async () => {
    setIsLoadingChunks(true);
    try {
      const response = await apiRequest('GET', `/api/documents/${document.id}/chunks`);
      if (response.ok) {
        const data: ChunkInfo = await response.json();
        setChunkInfo(data);
        
        // For small documents, enable auto-complete mode
        if (!data.isLargeDocument) {
          setIsAutoComplete(true);
        } else {
          // For large documents, select all chunks by default
          const allChunks = new Set(data.chunks.map(c => c.index));
          setSelectedChunks(allChunks);
        }
      } else {
        throw new Error('Failed to load document chunks');
      }
    } catch (error) {
      console.error('Error loading chunks:', error);
      toast({
        title: "Error loading chunks",
        description: "Failed to analyze document structure.",
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

  const handleSelectAll = () => {
    if (!chunkInfo) return;
    const allChunks = new Set(chunkInfo.chunks.map(c => c.index));
    setSelectedChunks(allChunks);
  };

  const handleSelectNone = () => {
    setSelectedChunks(new Set());
  };

  const handleGeneratePodcast = async () => {
    if (!chunkInfo) return;

    if ((mode === 'custom-single' || mode === 'custom-dialogue') && !customInstructions.trim()) {
      toast({
        title: "Custom instructions required",
        description: "Please provide custom instructions for the podcast.",
        variant: "destructive",
      });
      return;
    }

    // For auto-complete mode (small documents)
    if (isAutoComplete) {
      await generateAutoCompletePodcast();
      return;
    }

    // For chunk-based mode (large documents)
    if (selectedChunks.size === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to generate a podcast.",
        variant: "destructive",
      });
      return;
    }

    await generateMultiChunkPodcast();
  };

  const generateAutoCompletePodcast = async () => {
    if (!chunkInfo) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setPodcastResults([]);

    try {
      const response = await apiRequest('POST', '/api/generate-auto-complete-podcast', {
        documentId: chunkInfo.documentId,
        provider: 'deepseek',
        type: mode.includes('dialogue') ? 'dialogue' : 'single',
        prompt: (mode === 'custom-single' || mode === 'custom-dialogue') ? customInstructions : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate auto-complete podcast: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result: PodcastResult = {
        chunkIndex: 0,
        success: !data.error,
        script: data.script,
        audioUrl: data.audioUrl,
        filename: data.filename,
        wordCount: data.wordCount,
        error: data.error
      };

      setPodcastResults([result]);
      setGenerationProgress(100);

      toast({
        title: result.success ? "Podcast generated successfully" : "Podcast generation completed with issues",
        description: result.success ? 
          "Your full-document podcast is ready!" : 
          "Audio generation failed, but script is available.",
        variant: result.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Auto-complete podcast generation error:', error);
      toast({
        title: "Failed to generate podcast",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMultiChunkPodcast = async () => {
    if (!chunkInfo) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentChunk(null);
    setPodcastResults([]);

    try {
      const chunkIndexes = Array.from(selectedChunks).sort((a, b) => a - b);
      
      const response = await apiRequest('POST', '/api/generate-multi-chunk-podcast', {
        documentId: chunkInfo.documentId,
        chunkIndexes,
        provider: 'deepseek',
        type: mode.includes('dialogue') ? 'dialogue' : 'single',
        prompt: (mode === 'custom-single' || mode === 'custom-dialogue') ? customInstructions : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate multi-chunk podcast: ${response.statusText}`);
      }

      const data = await response.json();
      setPodcastResults(data.results || []);
      setGenerationProgress(100);

      const successCount = data.results?.filter((r: PodcastResult) => r.success).length || 0;
      const totalCount = data.results?.length || 0;

      toast({
        title: `Podcast generation completed`,
        description: `Successfully generated ${successCount}/${totalCount} podcast segments.`,
        variant: successCount === totalCount ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Multi-chunk podcast generation error:', error);
      toast({
        title: "Failed to generate podcast",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCurrentChunk(null);
    }
  };

  const handlePlayAudio = (audioUrl: string) => {
    window.open(audioUrl, '_blank');
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedChunks(new Set());
    setPodcastResults([]);
    setGenerationProgress(0);
    setCurrentChunk(null);
    setIsGenerating(false);
    setCustomInstructions('');
    setMode('normal-single');
    onClose();
  };

  if (!chunkInfo && isLoadingChunks) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Analyzing Document</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span>Loading document chunks...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!chunkInfo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isAutoComplete ? 'Full Document Podcast' : 'Chunk-Based Podcast Generation'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[calc(90vh-120px)] overflow-hidden">
          {/* Left Column: Configuration */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Document Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Words:</span>
                  <Badge variant="outline">{chunkInfo.totalWords.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Document Type:</span>
                  <Badge variant={chunkInfo.isLargeDocument ? "destructive" : "default"}>
                    {chunkInfo.isLargeDocument ? 'Large (>1000 words)' : 'Small (≤1000 words)'}
                  </Badge>
                </div>
                {chunkInfo.isLargeDocument && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Total Chunks:</span>
                      <Badge variant="secondary">{chunkInfo.totalChunks}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Words/Chunk:</span>
                      <Badge variant="secondary">{chunkInfo.avgWordsPerChunk}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Podcast Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Podcast Style</Label>
                  <Select value={mode} onValueChange={(value: PodcastMode) => setMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal-single">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Single Host (Normal)
                        </div>
                      </SelectItem>
                      <SelectItem value="normal-dialogue">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Dialogue (Normal)
                        </div>
                      </SelectItem>
                      <SelectItem value="custom-single">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Single Host (Custom)
                        </div>
                      </SelectItem>
                      <SelectItem value="custom-dialogue">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Dialogue (Custom)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(mode === 'custom-single' || mode === 'custom-dialogue') && (
                  <div>
                    <Label>Custom Instructions</Label>
                    <Textarea
                      placeholder="Provide specific instructions for the podcast style, tone, or content focus..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chunk Selection for Large Documents */}
            {chunkInfo.isLargeDocument && !isAutoComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Select Chunks ({selectedChunks.size}/{chunkInfo.totalChunks})</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSelectNone}>
                        None
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {chunkInfo.chunks.map((chunk) => (
                        <div key={chunk.index} className="flex items-start gap-3 p-2 border rounded-lg">
                          <Checkbox
                            checked={selectedChunks.has(chunk.index)}
                            onCheckedChange={() => handleChunkToggle(chunk.index)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Chunk {chunk.index + 1}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {chunk.words} words
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {chunk.preview}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={handleGeneratePodcast} 
              disabled={isGenerating || (!isAutoComplete && selectedChunks.size === 0)}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  {isAutoComplete ? 'Generate Full Document Podcast' : `Generate ${selectedChunks.size} Podcast${selectedChunks.size !== 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-4">
            {isGenerating && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Generation Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={generationProgress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {currentChunk !== null ? 
                      `Processing chunk ${currentChunk + 1}...` : 
                      'Processing your request...'
                    }
                  </p>
                  {!isAutoComplete && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ⏱️ 10-second delays between chunks to avoid rate limits
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {podcastResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Generated Podcasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {podcastResults.map((result, index) => (
                        <div key={result.chunkIndex} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {isAutoComplete ? 'Full Document' : `Chunk ${result.chunkIndex + 1}`}
                              </Badge>
                              {result.wordCount && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.wordCount} words
                                </Badge>
                              )}
                            </div>
                            {result.audioUrl && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePlayAudio(result.audioUrl!)}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Play
                              </Button>
                            )}
                          </div>
                          
                          {result.error && (
                            <p className="text-xs text-red-600 mb-2">{result.error}</p>
                          )}
                          
                          {result.script && (
                            <div className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto">
                              <p className="whitespace-pre-wrap line-clamp-6">
                                {result.script.slice(0, 300)}
                                {result.script.length > 300 && '...'}
                              </p>
                            </div>
                          )}
                          
                          {result.audioUrl && (
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 Right-click the audio player and select "Save audio as..." to download
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}