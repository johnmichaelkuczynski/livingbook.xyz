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

  // Clean up network when component unmounts or closes
  useEffect(() => {
    return () => {
      if (visNetworkRef.current) {
        visNetworkRef.current.destroy();
        visNetworkRef.current = null;
      }
    };
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

  // Create proper graph visualization with layout algorithms
  const updateVisNetwork = async (data: NetworkData) => {
    console.log('Creating graph visualization with', data.nodes.length, 'nodes and', data.edges.length, 'edges');
    
    if (!networkRef.current) {
      console.error('Container ref not available');
      return;
    }

    await createGraphVisualization(data);
  };

  // Create dynamic graph layout based on map type
  const createGraphVisualization = async (data: NetworkData) => {
    if (!networkRef.current || !data.nodes.length) return;
    
    const container = networkRef.current;
    container.innerHTML = '';
    
    // Use canvas-based visualization for reliability
    createInteractiveCanvasVisualization(data);
  };

  // Calculate node positions based on layout type
  const calculateLayout = (nodes: any[], edges: any[], layoutType: string) => {
    const centerX = 0;
    const centerY = 0;
    
    switch (layoutType) {
      case 'radial':
        return nodes.map((node, index) => {
          if (node.id === 'central') {
            return { ...node, x: centerX, y: centerY, fixed: true };
          }
          const angle = (index * 2 * Math.PI) / (nodes.length - 1);
          const radius = 200;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        });
        
      case 'tree':
        return nodes.map((node, index) => {
          if (node.id === 'central') {
            return { ...node, x: centerX, y: -200, fixed: true };
          }
          const cols = Math.ceil(Math.sqrt(nodes.length - 1));
          const row = Math.floor((index - 1) / cols);
          const col = (index - 1) % cols;
          return {
            ...node,
            x: centerX + (col - cols/2) * 150,
            y: centerY + row * 100
          };
        });
        
      case 'flowchart':
        return nodes.map((node, index) => {
          if (node.id === 'central') {
            return { ...node, x: centerX, y: centerY, fixed: true };
          }
          return {
            ...node,
            x: centerX + (index % 2 === 0 ? -1 : 1) * (100 + (index * 50)),
            y: centerY + (index - 1) * 80
          };
        });
        
      default:
        return nodes; // Let vis.js handle automatic layout
    }
  };

  // Get layout options for different map types
  const getLayoutOptions = (layoutType: string) => {
    const baseOptions = {
      nodes: {
        shape: 'dot',
        size: 25,
        font: { size: 14, color: '#333' },
        borderWidth: 2,
        shadow: true,
        chosen: true
      },
      edges: {
        width: 2,
        color: { color: '#666', highlight: '#333', hover: '#333' },
        arrows: { to: { enabled: true, scaleFactor: 1 } },
        font: { size: 12, align: 'middle' },
        smooth: { type: 'continuous' }
      },
      interaction: {
        hover: true,
        selectConnectedEdges: true,
        dragNodes: true,
        dragView: true,
        zoomView: true
      }
    };

    switch (layoutType) {
      case 'radial':
        return {
          ...baseOptions,
          physics: { enabled: false },
          layout: { randomSeed: 42 }
        };
        
      case 'tree':
        return {
          ...baseOptions,
          layout: {
            hierarchical: {
              direction: 'UD',
              sortMethod: 'directed',
              nodeSpacing: 150,
              levelSeparation: 100
            }
          },
          physics: { enabled: false }
        };
        
      case 'flowchart':
        return {
          ...baseOptions,
          layout: {
            hierarchical: {
              direction: 'LR',
              sortMethod: 'directed'
            }
          },
          physics: { enabled: false }
        };
        
      default:
        return {
          ...baseOptions,
          physics: {
            stabilization: { iterations: 100 },
            barnesHut: { gravitationalConstant: -2000, springConstant: 0.001 }
          }
        };
    }
  };

  // Interactive canvas visualization with proper graph rendering
  const createInteractiveCanvasVisualization = (data: NetworkData) => {
    const container = networkRef.current!;
    const canvas = document.createElement('canvas');
    const rect = container.getBoundingClientRect();
    
    // Set canvas size to container size
    canvas.width = Math.max(800, rect.width);
    canvas.height = Math.max(600, rect.height);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.border = '1px solid #ddd';
    canvas.style.cursor = 'grab';
    
    const ctx = canvas.getContext('2d')!;
    const layoutNodes = calculateLayout(data.nodes, data.edges, mapType);
    
    // Interaction state
    let isDragging = false;
    let selectedNode: any = null;
    let mousePos = { x: 0, y: 0 };
    let offset = { x: 0, y: 0 };
    let scale = 1;
    
    // Transform coordinates to canvas space
    const transform = (x: number, y: number) => ({
      x: canvas.width / 2 + (x + offset.x) * scale,
      y: canvas.height / 2 + (y + offset.y) * scale
    });
    
    // Inverse transform for mouse coordinates
    const inverseTransform = (x: number, y: number) => ({
      x: ((x - canvas.width / 2) / scale) - offset.x,
      y: ((y - canvas.height / 2) / scale) - offset.y
    });
    
    // Check if point is inside node
    const isPointInNode = (x: number, y: number, node: any) => {
      const pos = transform(node.x || 0, node.y || 0);
      const radius = (node.size || 25) * scale;
      const dx = x - pos.x;
      const dy = y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    };
    
    // Draw the complete graph
    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Save context for transformations
      ctx.save();
      
      // Draw edges first
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2 * scale;
      data.edges.forEach(edge => {
        const fromNode = layoutNodes.find(n => n.id === edge.from);
        const toNode = layoutNodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
          const from = transform(fromNode.x || 0, fromNode.y || 0);
          const to = transform(toNode.x || 0, toNode.y || 0);
          
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          
          // Draw arrow
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const arrowLength = 15 * scale;
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - arrowLength * Math.cos(angle - Math.PI/6), to.y - arrowLength * Math.sin(angle - Math.PI/6));
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - arrowLength * Math.cos(angle + Math.PI/6), to.y - arrowLength * Math.sin(angle + Math.PI/6));
          ctx.stroke();
          
          // Draw edge label
          if (edge.label) {
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            ctx.fillStyle = '#333';
            ctx.font = `${10 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(edge.label, midX, midY - 5);
          }
        }
      });
      
      // Draw nodes
      layoutNodes.forEach(node => {
        const pos = transform(node.x || 0, node.y || 0);
        const radius = (node.size || 25) * scale;
        
        // Highlight selected node
        if (selectedNode && selectedNode.id === node.id) {
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 4 * scale;
        } else {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 * scale;
        }
        
        // Draw node circle
        ctx.fillStyle = node.color || '#3b82f6';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label;
        ctx.fillText(label, pos.x, pos.y + radius + 20 * scale);
      });
      
      ctx.restore();
      
      // Draw UI controls
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${mapType.toUpperCase()} LAYOUT | Zoom: ${Math.round(scale * 100)}% | Drag to pan, scroll to zoom`, 10, 20);
    };
    
    // Mouse event handlers
    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    
    canvas.addEventListener('mousedown', (e) => {
      mousePos = getMousePos(e);
      
      // Check if clicking on a node
      selectedNode = layoutNodes.find(node => isPointInNode(mousePos.x, mousePos.y, node));
      
      if (selectedNode) {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        console.log('Selected node:', selectedNode.label);
      } else {
        // Start panning
        isDragging = true;
        canvas.style.cursor = 'grabbing';
      }
      
      draw();
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const newMousePos = getMousePos(e);
      
      if (isDragging) {
        if (selectedNode) {
          // Move selected node
          const worldDelta = inverseTransform(newMousePos.x - mousePos.x, newMousePos.y - mousePos.y);
          selectedNode.x = (selectedNode.x || 0) + worldDelta.x;
          selectedNode.y = (selectedNode.y || 0) + worldDelta.y;
        } else {
          // Pan view
          offset.x += (newMousePos.x - mousePos.x) / scale;
          offset.y += (newMousePos.y - mousePos.y) / scale;
        }
        draw();
      }
      
      mousePos = newMousePos;
    });
    
    canvas.addEventListener('mouseup', () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    });
    
    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.max(0.1, Math.min(3, scale * zoomFactor));
      draw();
    });
    
    // Initial draw
    draw();
    
    container.appendChild(canvas);
    console.log(`✓ Interactive ${mapType} visualization created with ${data.nodes.length} nodes`);
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