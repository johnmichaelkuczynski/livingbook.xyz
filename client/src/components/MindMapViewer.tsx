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
        try {
          console.log('Attempting to initialize vis.js network...');
          
          // Import vis-network
          const visNetwork = await import('vis-network');
          console.log('vis-network imported:', visNetwork);
          
          // Handle different import patterns
          const Network = visNetwork.Network || visNetwork.default?.Network;
          const DataSet = visNetwork.DataSet || visNetwork.default?.DataSet;
          
          if (!Network || !DataSet) {
            throw new Error('Network or DataSet not found in vis-network import');
          }
          
          console.log('Network and DataSet found, creating instance...');
          
          const data = { 
            nodes: new DataSet([]), 
            edges: new DataSet([]) 
          };
          
          const options = {
            physics: { 
              enabled: true, 
              stabilization: { iterations: 100 }
            },
            nodes: {
              font: { size: 16, color: '#333' },
              borderWidth: 2,
              shadow: true,
              chosen: true,
              shape: 'dot',
              size: 30
            },
            edges: {
              font: { size: 14, align: 'middle' },
              color: { color: '#666', highlight: '#333', hover: '#333' },
              arrows: { to: { enabled: true, scaleFactor: 1 } },
              smooth: { type: 'continuous' },
              width: 2
            },
            interaction: { hover: true, selectConnectedEdges: true },
            layout: { randomSeed: 42 }
          };
          
          visNetworkRef.current = new Network(networkRef.current, data, options);
          console.log('✓ Network initialized successfully');
        } catch (error) {
          console.error('✗ Error initializing network:', error);
          
          // Create a manual fallback visualization
          if (networkRef.current) {
            networkRef.current.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #666; background: #f9f9f9; border: 2px dashed #ccc; border-radius: 8px;">
                <div style="font-size: 16px; margin-bottom: 8px;">⚠️ Visualization Error</div>
                <div style="font-size: 14px;">Mind map will display here once network initializes</div>
                <div style="font-size: 12px; margin-top: 8px; color: #999;">Check console for details</div>
              </div>
            `;
          }
        }
      };
      
      // Add a small delay to ensure DOM is ready
      setTimeout(initNetwork, 100);
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
        console.log('Mind map generation successful:', result.mindMapData);
        setNetworkData(result.mindMapData);
        
        // Wait a moment for state to update, then update the visualization
        setTimeout(() => {
          updateVisNetwork(result.mindMapData);
        }, 100);
        
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

  // Update visualization with new data
  const updateVisNetwork = async (data: NetworkData) => {
    console.log('Render called', data);
    console.log('Nodes:', data.nodes);
    console.log('Edges:', data.edges);
    
    if (!networkRef.current) {
      console.error('Container ref not available');
      return;
    }
    
    // Create fallback visualization immediately
    createFallbackVisualization(data);
    
    // Try vis.js network if available
    if (visNetworkRef.current && data.nodes && data.edges) {
      try {
        const visNetwork = await import('vis-network');
        const DataSet = visNetwork.DataSet || visNetwork.default?.DataSet;
        
        if (DataSet) {
          console.log('Creating DataSets...');
          const nodes = new DataSet(data.nodes);
          const edges = new DataSet(data.edges);
          
          visNetworkRef.current.setData({ nodes, edges });
          visNetworkRef.current.redraw();
          visNetworkRef.current.fit();
          console.log('✓ Network render complete');
        }
      } catch (error) {
        console.error('Vis.js error, using fallback:', error);
      }
    }
  };

  // Create a simple fallback visualization
  const createFallbackVisualization = (data: NetworkData) => {
    if (!networkRef.current || !data.nodes.length) return;
    
    const container = networkRef.current;
    container.innerHTML = '';
    
    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.style.background = '#ffffff';
    svg.style.border = '1px solid #ddd';
    
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    
    // Draw edges first
    data.edges.forEach(edge => {
      const fromNode = data.nodes.find(n => n.id === edge.from);
      const toNode = data.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x?.toString() || centerX.toString());
        line.setAttribute('y1', fromNode.y?.toString() || centerY.toString());
        line.setAttribute('x2', toNode.x?.toString() || centerX.toString());
        line.setAttribute('y2', toNode.y?.toString() || centerY.toString());
        line.setAttribute('stroke', '#666');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }
    });
    
    // Draw nodes
    data.nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / data.nodes.length;
      const x = node.x || (centerX + radius * Math.cos(angle));
      const y = node.y || (centerY + radius * Math.sin(angle));
      
      // Create node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', (node.size || 20).toString());
      circle.setAttribute('fill', node.color || '#3b82f6');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
      
      // Create label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (y + 5).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.textContent = node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label;
      svg.appendChild(text);
    });
    
    container.appendChild(svg);
    console.log('✓ Fallback visualization created');
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
                {isGenerating ? 'Generating mind map...' : networkData.nodes.length > 0 ? `${networkData.nodes.length} concepts mapped` : 'No mind map generated yet'}
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
        
        <CardContent className="flex-1 flex gap-6 p-6">
          {/* Left Panel - Controls - Made Much Bigger */}
          <div className="w-[600px] flex flex-col space-y-6">
            {/* Source Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Source Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-base font-medium text-gray-700 mb-3 block">Selected Text (Optional)</label>
                  <Textarea
                    placeholder="Paste or type specific text to map..."
                    value={selectedText}
                    onChange={(e) => setSelectedText(e.target.value)}
                    className="mt-2 h-32 text-base leading-relaxed"
                  />
                </div>
                
                {availableChunks.length > 0 && (
                  <div>
                    <label className="text-base font-medium text-gray-700 mb-4 block">Or Select Chunks:</label>
                    <ScrollArea className="h-96 border rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-4">
                        {availableChunks.map((chunk) => (
                          <div
                            key={chunk.id}
                            className={`p-6 rounded-lg text-base cursor-pointer transition-colors border-2 ${
                              selectedChunks.includes(chunk.id)
                                ? 'bg-blue-50 border-blue-400 shadow-md'
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                            }`}
                            onClick={() => toggleChunkSelection(chunk.id)}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-gray-900 text-lg">Chunk {chunk.index + 1}</span>
                              <Badge variant="outline" className="text-base px-3 py-1 font-medium">{chunk.wordCount} words</Badge>
                            </div>
                            <p className="text-gray-700 leading-relaxed text-base">{chunk.preview}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Controls */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Generation & Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={generateMindMap}
                  disabled={isGenerating || !document}
                  className="w-full h-12 text-base"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-3" />
                      Generate {mapType} Map
                    </>
                  )}
                </Button>
                
                <div>
                  <label className="text-base font-medium text-gray-700 mb-3 block">Refinement Feedback</label>
                  <Textarea
                    placeholder="Provide feedback to refine the mind map..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="mt-2 h-32 text-base leading-relaxed"
                  />
                  <Button
                    onClick={regenerateWithFeedback}
                    disabled={isGenerating || !feedbackText.trim()}
                    variant="outline"
                    className="w-full mt-4 h-12 text-base"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
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
                  <div className="relative w-full h-full p-4" style={{ minHeight: '600px', backgroundColor: '#f8f9fa' }}>
                    {/* Debug info */}
                    <div className="absolute top-2 left-2 bg-yellow-100 p-2 rounded text-xs z-10">
                      Container visible: {networkData.nodes.length} nodes, {networkData.edges.length} edges
                    </div>
                    
                    {/* Mind Map Visualization Container */}
                    <div
                      ref={networkRef}
                      className="w-full h-full border-2 border-blue-200 rounded-lg overflow-hidden"
                      style={{ 
                        minHeight: '500px',
                        height: '100%',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {/* Default content before generation */}
                      {networkData.nodes.length === 0 && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <div>Mind Map Canvas Ready</div>
                            <div className="text-xs mt-1">
                              {visNetworkRef.current ? 'Network initialized ✓' : 'Using SVG fallback'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Debug display */}
                    {networkData.nodes.length > 0 && (
                      <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-lg max-w-md border">
                        <h3 className="font-bold mb-2 text-green-600">Mind Map Data Ready</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          ✓ {networkData.nodes.length} nodes, {networkData.edges.length} edges loaded
                        </p>
                        <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                          <strong>Sample Nodes:</strong>
                          {networkData.nodes.slice(0, 3).map((node, i) => (
                            <div key={i}>• {node.label}</div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs">
                          Network Status: {visNetworkRef.current ? '✓ Initialized' : '✗ Not Ready'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}