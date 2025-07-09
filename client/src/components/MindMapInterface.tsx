import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Network, Merge, Download, Loader2, Map, Globe, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import MindMapViewer from './MindMapViewer';

interface TextSegment {
  id: string;
  content: string;
  type: 'chapter' | 'section' | 'paragraph' | 'thematic_break' | 'speaker_change';
  startPosition: number;
  endPosition: number;
  title?: string;
  summary?: string;
}

interface LocalMindMap {
  id: string;
  segmentId: string;
  title: string;
  nodes: any[];
  edges: any[];
  centralClaim: string;
  summary: string;
  generatedAt: string;
}

interface MetaMindMap {
  id: string;
  title: string;
  nodes: any[];
  edges: any[];
  localMaps: string[];
  globalThemes: string[];
  conceptualClusters: { [key: string]: string[] };
  generatedAt: string;
}

interface MindMapInterfaceProps {
  document: any | null;
  onAskAboutNode?: (nodeContent: string) => void;
  onJumpToText?: (startPos: number, endPos: number) => void;
}

export default function MindMapInterface({ document, onAskAboutNode, onJumpToText }: MindMapInterfaceProps) {
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [currentMindMap, setCurrentMindMap] = useState<LocalMindMap | null>(null);
  const [currentMetaMap, setCurrentMetaMap] = useState<MetaMindMap | null>(null);
  const [activeTab, setActiveTab] = useState('segments');
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch text segments
  const { data: segments = [], isLoading: segmentsLoading } = useQuery<TextSegment[]>({
    queryKey: document ? ['/api/documents/' + document.id + '/segments'] : ['no-segments'],
    enabled: !!document,
  });

  // Fetch existing mind maps for this document
  const { data: existingMaps = [], isLoading: mapsLoading } = useQuery<LocalMindMap[]>({
    queryKey: document ? ['/api/documents/' + document.id + '/mindmaps'] : ['no-maps'],
    enabled: !!document,
  });

  // Generate mind map mutation
  const generateMindMapMutation = useMutation({
    mutationFn: async ({ segmentId, provider }: { segmentId: string; provider: string }) => {
      return apiRequest('POST', '/api/mindmaps/generate', {
        documentId: document?.id,
        segmentId,
        provider
      });
    },
    onSuccess: (data) => {
      setCurrentMindMap(data);
      setActiveTab('local');
      queryClient.invalidateQueries({ 
        queryKey: document ? ['/api/documents/' + document.id + '/mindmaps'] : ['no-maps'] 
      });
      toast({
        title: "Mind Map Generated",
        description: "Local mind map created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate mind map",
        variant: "destructive",
      });
    }
  });

  // Generate meta mind map mutation
  const generateMetaMapMutation = useMutation({
    mutationFn: async ({ mapIds, provider }: { mapIds: string[]; provider: string }) => {
      return apiRequest('POST', '/api/mindmaps/generate-meta', {
        documentId: document?.id,
        mapIds,
        provider
      });
    },
    onSuccess: (data) => {
      setCurrentMetaMap(data);
      setActiveTab('meta');
      toast({
        title: "Meta Mind Map Generated",
        description: "Global mind map created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Meta Generation Failed",
        description: error.message || "Could not generate meta mind map",
        variant: "destructive",
      });
    }
  });

  // Merge segments mutation
  const mergeSegmentsMutation = useMutation({
    mutationFn: async ({ segmentIds, provider }: { segmentIds: string[]; provider: string }) => {
      return apiRequest('POST', '/api/mindmaps/merge-segments', {
        documentId: document?.id,
        segmentIds,
        provider
      });
    },
    onSuccess: (data) => {
      setCurrentMindMap(data);
      setActiveTab('local');
      setSelectedSegmentIds([]);
      queryClient.invalidateQueries({ 
        queryKey: document ? ['/api/documents/' + document.id + '/mindmaps'] : ['no-maps'] 
      });
      toast({
        title: "Segments Merged",
        description: "Combined mind map created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "Could not merge segments",
        variant: "destructive",
      });
    }
  });

  const handleGenerateMindMap = (segmentId: string) => {
    generateMindMapMutation.mutate({ segmentId, provider: selectedProvider });
  };

  const handleGenerateMetaMap = () => {
    const selectedMapIds = existingMaps
      .filter(map => selectedSegmentIds.includes(map.segmentId))
      .map(map => map.id);
    
    if (selectedMapIds.length < 2) {
      toast({
        title: "Select Multiple Maps",
        description: "Choose at least 2 mind maps to create a meta map",
        variant: "destructive",
      });
      return;
    }

    generateMetaMapMutation.mutate({ mapIds: selectedMapIds, provider: selectedProvider });
  };

  const handleMergeSegments = () => {
    if (selectedSegmentIds.length < 2) {
      toast({
        title: "Select Multiple Segments",
        description: "Choose at least 2 segments to merge",
        variant: "destructive",
      });
      return;
    }

    mergeSegmentsMutation.mutate({ segmentIds: selectedSegmentIds, provider: selectedProvider });
    setIsMergeDialogOpen(false);
  };

  const handleSegmentSelection = (segmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedSegmentIds(prev => [...prev, segmentId]);
    } else {
      setSelectedSegmentIds(prev => prev.filter(id => id !== segmentId));
    }
  };

  const handleJumpToSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment && onJumpToText) {
      onJumpToText(segment.startPosition, segment.endPosition);
    }
  };

  const getSegmentTypeColor = (type: string): string => {
    switch (type) {
      case 'chapter': return 'bg-blue-100 text-blue-800';
      case 'section': return 'bg-green-100 text-green-800';
      case 'thematic_break': return 'bg-purple-100 text-purple-800';
      case 'speaker_change': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!document) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Upload a document to generate mind maps</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <Card className="mb-4 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Mind Map Generator
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
              
              <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={selectedSegmentIds.length < 2}>
                    <Merge className="w-4 h-4 mr-1" />
                    Merge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Merge Selected Segments</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Create a unified mind map from {selectedSegmentIds.length} selected segments.
                    </p>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleMergeSegments}
                        disabled={mergeSegmentsMutation.isPending}
                      >
                        {mergeSegmentsMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Merge className="w-4 h-4 mr-1" />
                        )}
                        Merge Segments
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateMetaMap}
                disabled={selectedSegmentIds.length < 2 || generateMetaMapMutation.isPending}
              >
                {generateMetaMapMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-1" />
                )}
                Meta Map
              </Button>
            </div>
          </div>
          
          {selectedSegmentIds.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <Badge variant="secondary">{selectedSegmentIds.length} segments</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSegmentIds([])}
              >
                Clear
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Local Map
            </TabsTrigger>
            <TabsTrigger value="meta" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Meta Map
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="segments" className="h-full m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Text Segments</CardTitle>
                  <p className="text-sm text-gray-500">
                    {segmentsLoading ? 'Loading...' : `${segments.length} segments identified`}
                  </p>
                </CardHeader>
                <CardContent className="h-full overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {segments.map((segment) => {
                        const hasExistingMap = existingMaps.some(map => map.segmentId === segment.id);
                        const isSelected = selectedSegmentIds.includes(segment.id);
                        
                        return (
                          <div 
                            key={segment.id} 
                            className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleSegmentSelection(segment.id, checked as boolean)
                                  }
                                />
                                <Badge className={getSegmentTypeColor(segment.type)}>
                                  {segment.type.replace('_', ' ')}
                                </Badge>
                                {hasExistingMap && (
                                  <Badge variant="outline">
                                    <Brain className="w-3 h-3 mr-1" />
                                    Mapped
                                  </Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleGenerateMindMap(segment.id)}
                                disabled={generateMindMapMutation.isPending}
                              >
                                {generateMindMapMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Brain className="w-4 h-4 mr-1" />
                                )}
                                Map
                              </Button>
                            </div>
                            
                            <h4 className="font-medium mb-2">{segment.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {segment.content.substring(0, 200)}...
                            </p>
                            
                            <div className="mt-2 text-xs text-gray-400">
                              {segment.content.length} characters • 
                              Position {segment.startPosition}-{segment.endPosition}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="local" className="h-full m-0">
              <MindMapViewer
                mindMap={currentMindMap}
                onNodeClick={(node) => console.log('Node clicked:', node)}
                onAskAboutNode={onAskAboutNode}
                onJumpToSegment={handleJumpToSegment}
              />
            </TabsContent>

            <TabsContent value="meta" className="h-full m-0">
              <MindMapViewer
                mindMap={currentMetaMap as any}
                isMetaMap={true}
                onNodeClick={(node) => console.log('Meta node clicked:', node)}
                onJumpToSegment={handleJumpToSegment}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}