import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Share2, Brain, RefreshCw, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MindMapProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
}

type MindMapType = 'radial' | 'tree' | 'flowchart' | 'concept' | 'argument';

interface NetworkData {
  nodes: any[];
  edges: any[];
}

export default function MindMapViewer({ document, isOpen, onClose }: MindMapProps) {
  const [mapType, setMapType] = useState<MindMapType>('radial');
  const [selectedText, setSelectedText] = useState('');
  const [networkData, setNetworkData] = useState<NetworkData>({ nodes: [], edges: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [availableChunks, setAvailableChunks] = useState<any[]>([]);
  const networkRef = useRef<HTMLDivElement>(null);
  const visNetworkRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize vis.js network when component mounts
  useEffect(() => {
    if (isOpen && networkRef.current && !visNetworkRef.current) {
      const initNetwork = async () => {
        const vis = await import('vis-network');
        const data = { nodes: new vis.DataSet([]), edges: new vis.DataSet([]) };
        const options = {
          physics: { enabled: true, stabilization: { iterations: 100 } },
          nodes: {
            font: { size: 14, color: '#333' },
            borderWidth: 2,
            shadow: true,
            chosen: true,
            shape: 'dot',
            size: 25
          },
          edges: {
            font: { size: 12, align: 'middle' },
            color: { color: '#666', highlight: '#333', hover: '#333' },
            arrows: { to: { enabled: true, scaleFactor: 1 } },
            smooth: { type: 'continuous' }
          },
          interaction: { hover: true, selectConnectedEdges: true },
          layout: { randomSeed: 42 }
        };
        visNetworkRef.current = new vis.Network(networkRef.current, data, options);
      };
      initNetwork();
    }
  }, [isOpen]);

  // Parse document into chunks when document changes
  useEffect(() => {
    if (document && document.content) {
      const paragraphs = document.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
      const chunks = paragraphs.map((content: string, index: number) => ({
        id: `chunk-${index}`,
        index,
        content: content.trim(),
        wordCount: content.split(/\s+/).length,
        preview: content.trim().slice(0, 100) + (content.length > 100 ? '...' : '')
      }));
      setAvailableChunks(chunks);
    }
  }, [document]);

  // Generate mind map from selected content
  const generateMindMap = async () => {
    if (!document) return;
    
    setIsGenerating(true);
    
    try {
      // Determine content to process
      let contentToProcess = selectedText;
      if (!contentToProcess && selectedChunks.length > 0) {
        contentToProcess = selectedChunks.map(chunkId => {
          const chunk = availableChunks.find(c => c.id === chunkId);
          return chunk ? chunk.content : '';
        }).join('\n\n');
      }
      if (!contentToProcess) {
        contentToProcess = document.content;
      }

      // Call AI service to generate mind map
      const response = await apiRequest('POST', '/api/mindmap/generate', {
        content: contentToProcess,
        mapType: mapType,
        documentTitle: document.title || 'Document',
        feedback: feedbackText || undefined
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNetworkData(result.mindMapData);
        updateVisNetwork(result.mindMapData);
        toast({
          title: "Mind Map Generated",
          description: `Created ${mapType} mind map with ${result.mindMapData.nodes.length} concepts.`
        });
      } else {
        throw new Error(result.error || 'Failed to generate mind map');
      }
    } catch (error) {
      console.error('Error generating mind map:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate mind map",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Update vis.js network with new data
  const updateVisNetwork = (data: NetworkData) => {
    if (visNetworkRef.current) {
      const vis = require('vis-network');
      const nodes = new vis.DataSet(data.nodes);
      const edges = new vis.DataSet(data.edges);
      visNetworkRef.current.setData({ nodes, edges });
      visNetworkRef.current.fit();
    }
  };

  // Regenerate mind map with feedback
  const regenerateWithFeedback = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback or clarifications before regenerating.",
        variant: "destructive"
      });
      return;
    }
    await generateMindMap();
    setFeedbackText('');
  };

  // Download mind map as image
  const downloadMindMap = async (format: 'png' | 'jpg' | 'pdf') => {
    if (!networkRef.current || networkData.nodes.length === 0) {
      toast({
        title: "No Mind Map",
        description: "Generate a mind map first before downloading.",
        variant: "destructive"
      });
      return;
    }

    try {
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(networkRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      if (format === 'pdf') {
        const jsPDF = await import('jspdf');
        const pdf = new jsPDF.jsPDF('landscape');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`mindmap-${document?.title || 'document'}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `mindmap-${document?.title || 'document'}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`);
        link.click();
      }

      toast({
        title: "Download Complete",
        description: `Mind map saved as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download mind map",
        variant: "destructive"
      });
    }
  };

  // Send mind map via email
  const emailMindMap = async () => {
    if (!networkRef.current || networkData.nodes.length === 0) {
      toast({
        title: "No Mind Map",
        description: "Generate a mind map first before sending.",
        variant: "destructive"
      });
      return;
    }

    try {
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(networkRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imageData = canvas.toDataURL('image/png');
      
      const response = await apiRequest('POST', '/api/mindmap/email', {
        imageData,
        documentTitle: document?.title || 'Document',
        mapType
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Email Sent",
          description: "Mind map has been sent via email"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: "Email Failed",
        description: "Failed to send mind map via email",
        variant: "destructive"
      });
    }
  };

  // Handle chunk selection
  const toggleChunkSelection = (chunkId: string) => {
    setSelectedChunks(prev => 
      prev.includes(chunkId) 
        ? prev.filter(id => id !== chunkId)
        : [...prev, chunkId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl h-[95vh] flex flex-col bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Mind Map: {document?.title || 'Document'}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {isGenerating ? 'Generating mind map...' : `${networkData.nodes.length} concepts mapped`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={mapType} onValueChange={(value: MindMapType) => setMapType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radial">Radial</SelectItem>
                <SelectItem value="tree">Tree</SelectItem>
                <SelectItem value="flowchart">Flowchart</SelectItem>
                <SelectItem value="concept">Concept</SelectItem>
                <SelectItem value="argument">Argument</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMindMap('png')}
              disabled={networkData.nodes.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMindMap('pdf')}
              disabled={networkData.nodes.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={emailMindMap}
              disabled={networkData.nodes.length === 0}
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex gap-4 p-4">
          {/* Left Panel - Controls */}
          <div className="w-80 flex flex-col space-y-4">
            {/* Source Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Source Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Selected Text (Optional)</label>
                  <Textarea
                    placeholder="Paste or type specific text to map..."
                    value={selectedText}
                    onChange={(e) => setSelectedText(e.target.value)}
                    className="mt-1 h-20 text-xs"
                  />
                </div>
                
                {availableChunks.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Or Select Chunks:</label>
                    <ScrollArea className="h-32 border rounded p-2">
                      {availableChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`p-2 mb-1 rounded text-xs cursor-pointer transition-colors ${
                            selectedChunks.includes(chunk.id)
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => toggleChunkSelection(chunk.id)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Chunk {chunk.index + 1}</span>
                            <Badge variant="outline" className="text-xs">{chunk.wordCount} words</Badge>
                          </div>
                          <p className="text-gray-600">{chunk.preview}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Generation & Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={generateMindMap}
                  disabled={isGenerating || !document}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate {mapType} Map
                    </>
                  )}
                </Button>
                
                <div>
                  <label className="text-xs font-medium text-gray-700">Refinement Feedback</label>
                  <Textarea
                    placeholder="Provide feedback to refine the mind map..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="mt-1 h-20 text-xs"
                  />
                  <Button
                    onClick={regenerateWithFeedback}
                    disabled={isGenerating || !feedbackText.trim()}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refine Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Visualization */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1">
              <CardContent className="p-0 h-full">
                {isGenerating ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Analyzing content and creating {mapType} mind map...</p>
                      <p className="text-sm text-gray-500 mt-1">This may take 30-60 seconds</p>
                    </div>
                  </div>
                ) : networkData.nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg mb-2">No mind map generated yet</p>
                      <p className="text-sm">Click "Generate {mapType} Map" to create a visual representation</p>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={networkRef}
                    className="w-full h-full"
                    style={{ minHeight: '500px' }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}