import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Share2, Brain } from 'lucide-react';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  level: number;
  connections: string[];
  isMainTopic: boolean;
  color: string;
}

interface MindMapProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MindMapViewer({ document, isOpen, onClose }: MindMapProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [scale, setScale] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate mind map from document content
  const generateMindMap = async () => {
    if (!document || !document.content) return;
    
    setIsGenerating(true);
    
    try {
      // Extract key concepts and topics from document content
      const concepts = extractConcepts(document.content);
      const mindMapNodes = createMindMapNodes(concepts);
      setNodes(mindMapNodes);
    } catch (error) {
      console.error('Error generating mind map:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract key concepts from document text
  const extractConcepts = (text: string): string[] => {
    // Simple concept extraction - in a real implementation, this would use NLP
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const concepts: string[] = [];
    
    sentences.forEach(sentence => {
      // Look for important terms (capitalized words, key phrases)
      const words = sentence.trim().split(/\s+/);
      const importantWords = words.filter(word => 
        word.length > 4 && 
        (word[0] === word[0].toUpperCase() || 
         word.includes('meaning') || 
         word.includes('semantic') ||
         word.includes('philosophy') ||
         word.includes('language') ||
         word.includes('concept'))
      );
      
      if (importantWords.length > 0) {
        concepts.push(...importantWords.slice(0, 3));
      }
    });
    
    // Remove duplicates and limit to reasonable number
    return [...new Set(concepts)].slice(0, 15);
  };

  // Create mind map nodes from concepts
  const createMindMapNodes = (concepts: string[]): MindMapNode[] => {
    const nodes: MindMapNode[] = [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    // Create main topic node
    const mainTopic = {
      id: 'main',
      text: document?.title || 'Main Topic',
      x: 400,
      y: 200,
      level: 0,
      connections: [],
      isMainTopic: true,
      color: '#1e40af'
    };
    nodes.push(mainTopic);
    
    // Create nodes for each concept
    concepts.forEach((concept, index) => {
      const angle = (index * 2 * Math.PI) / concepts.length;
      const radius = 150 + (index % 3) * 50;
      const x = 400 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      
      const node: MindMapNode = {
        id: `concept-${index}`,
        text: concept.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
        x,
        y,
        level: 1,
        connections: ['main'],
        isMainTopic: false,
        color: colors[index % colors.length]
      };
      nodes.push(node);
      mainTopic.connections.push(node.id);
    });
    
    return nodes;
  };

  // Initialize mind map when document changes
  useEffect(() => {
    if (document && isOpen) {
      generateMindMap();
    }
  }, [document, isOpen]);

  // Handle zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setScale(1);
    setDragOffset({ x: 0, y: 0 });
  };

  // Handle mouse interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setDragOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Export mind map as SVG
  const exportMindMap = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.title || 'mindmap'}_mindmap.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-5/6 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Mind Map: {document?.title || 'Document'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Badge variant="secondary" className="px-2">
              {Math.round(scale * 100)}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportMindMap}
            >
              <Download className="w-4 h-4" />
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
        
        <CardContent className="flex-1 overflow-hidden p-0">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating mind map...</p>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef}
              className="w-full h-full overflow-hidden cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 800 400"
                className="w-full h-full"
                style={{
                  transform: `scale(${scale}) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                  transformOrigin: 'center'
                }}
              >
                {/* Connection lines */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#666"
                    />
                  </marker>
                </defs>
                
                {nodes.map(node => 
                  node.connections.map(connectionId => {
                    const connectedNode = nodes.find(n => n.id === connectionId);
                    if (!connectedNode) return null;
                    
                    return (
                      <line
                        key={`${node.id}-${connectionId}`}
                        x1={node.x}
                        y1={node.y}
                        x2={connectedNode.x}
                        y2={connectedNode.y}
                        stroke="#666"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })
                )}
                
                {/* Nodes */}
                {nodes.map(node => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isMainTopic ? 40 : 30}
                      fill={node.color}
                      stroke="#fff"
                      strokeWidth="3"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={node.isMainTopic ? 12 : 10}
                      fontWeight={node.isMainTopic ? 'bold' : 'normal'}
                      className="pointer-events-none select-none"
                    >
                      {node.text.length > 12 ? node.text.substring(0, 12) + '...' : node.text}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}