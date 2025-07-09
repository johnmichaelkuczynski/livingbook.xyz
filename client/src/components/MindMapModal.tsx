import { useState, useEffect, useRef } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Edit3, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MindMapNode {
  id: string;
  label: string;
  type: 'central_claim' | 'supporting_argument' | 'objection' | 'example' | 'concept' | 'connection';
  content: string;
  level: number;
  parentId?: string;
  originalText?: string;
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  type: 'supports' | 'opposes' | 'explains' | 'leads_to' | 'depends_on' | 'clusters_with';
  label?: string;
  strength?: number;
}

interface LocalMindMap {
  id: string;
  segmentId: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  centralClaim: string;
  summary: string;
  generatedAt: string;
}

interface MindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindMap: LocalMindMap | null;
  onAskAboutNode?: (nodeContent: string) => void;
}

const nodeTypeColors = {
  central_claim: '#e74c3c',
  supporting_argument: '#27ae60',
  objection: '#f39c12',
  example: '#3498db',
  concept: '#9b59b6',
  connection: '#95a5a6'
};

const edgeTypeStyles = {
  supports: { color: '#27ae60', dashes: false },
  opposes: { color: '#e74c3c', dashes: true },
  explains: { color: '#3498db', dashes: false },
  leads_to: { color: '#f39c12', dashes: false },
  depends_on: { color: '#9b59b6', dashes: true },
  clusters_with: { color: '#95a5a6', dashes: [10, 10] }
};

export default function MindMapModal({ isOpen, onClose, mindMap, onAskAboutNode }: MindMapModalProps) {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [layoutType, setLayoutType] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !mindMap || !mindMap.nodes || !mindMap.edges || !networkRef.current) {
      return;
    }

    // Destroy existing network
    if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
    }

    // Prepare nodes for vis.js
    const visNodes = new DataSet(
      mindMap.nodes.map(node => ({
        id: node.id,
        label: node.label,
        title: node.content, // Tooltip
        color: {
          background: node.color || nodeTypeColors[node.type],
          border: '#2c3e50',
          highlight: {
            background: '#ecf0f1',
            border: '#3498db'
          }
        },
        size: node.size || 20,
        font: {
          size: 14,
          color: '#2c3e50'
        },
        shape: getNodeShape(node.type),
        level: node.level || 0
      }))
    );

    // Prepare edges for vis.js
    const visEdges = new DataSet(
      mindMap.edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label || '',
        color: edgeTypeStyles[edge.type]?.color || '#95a5a6',
        dashes: edgeTypeStyles[edge.type]?.dashes || false,
        width: Math.max(1, (edge.strength || 0.5) * 3),
        arrows: {
          to: { enabled: true, scaleFactor: 1 }
        },
        font: {
          size: 10,
          align: 'middle'
        }
      }))
    );

    // Network options
    const options = {
      layout: getLayoutOptions(layoutType),
      physics: {
        enabled: true,
        stabilization: { iterations: 100 },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09
        }
      },
      interaction: {
        hover: true,
        selectConnectedEdges: false,
        tooltipDelay: 200
      },
      nodes: {
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.2)',
          size: 10,
          x: 2,
          y: 2
        }
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.2
        }
      }
    };

    // Create network
    networkInstanceRef.current = new Network(networkRef.current, { nodes: visNodes, edges: visEdges }, options);

    // Handle node selection
    networkInstanceRef.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = mindMap.nodes.find(n => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
        }
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
        networkInstanceRef.current = null;
      }
    };
  }, [isOpen, mindMap, layoutType]);

  const getNodeShape = (type: string): string => {
    switch (type) {
      case 'central_claim': return 'ellipse';
      case 'supporting_argument': return 'box';
      case 'objection': return 'diamond';
      case 'example': return 'circle';
      case 'concept': return 'star';
      default: return 'dot';
    }
  };

  const getLayoutOptions = (layout: string) => {
    switch (layout) {
      case 'hierarchical':
        return {
          hierarchical: {
            enabled: true,
            direction: 'UD',
            sortMethod: 'directed',
            levelSeparation: 150,
            nodeSpacing: 100
          }
        };
      case 'circular':
        return {
          randomSeed: 2
        };
      case 'force':
      default:
        return {
          randomSeed: 1
        };
    }
  };

  const exportAsPDF = async () => {
    if (!networkRef.current || !mindMap) return;

    try {
      const canvas = await html2canvas(networkRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;
      
      pdf.setFontSize(16);
      pdf.text(mindMap.title, pdfWidth / 2, 20, { align: 'center' });
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${mindMap.title}.pdf`);
      
      toast({
        title: "Export Successful",
        description: "Mind map exported as PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export mind map",
        variant: "destructive",
      });
    }
  };

  const getNodeTypeDescription = (type: string): string => {
    switch (type) {
      case 'central_claim': return 'Main thesis or argument';
      case 'supporting_argument': return 'Evidence or reasoning that supports the claim';
      case 'objection': return 'Counter-argument or criticism';
      case 'example': return 'Concrete illustration or case study';
      case 'concept': return 'Key term or idea';
      default: return 'Connected element';
    }
  };

  if (!mindMap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{mindMap.title}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">{mindMap.summary}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={layoutType} onValueChange={setLayoutType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="force">Force-directed</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportAsPDF}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(nodeTypeColors).map(([type, color]) => (
              <Badge key={type} variant="outline" className="text-xs">
                <div 
                  className="w-3 h-3 rounded mr-1" 
                  style={{ backgroundColor: color }}
                />
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main mind map area */}
          <div className="flex-1 relative">
            <div ref={networkRef} className="w-full h-full border rounded-lg bg-white" />
          </div>

          {/* Node details sidebar */}
          {selectedNode && (
            <div className="w-80 ml-4 border-l pl-4 flex flex-col">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
                  <p className="text-sm text-gray-500">{getNodeTypeDescription(selectedNode.type)}</p>
                </div>

                <ScrollArea className="h-48">
                  <p className="text-sm leading-relaxed">{selectedNode.content}</p>
                </ScrollArea>

                <div className="flex flex-col space-y-2">
                  {onAskAboutNode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onAskAboutNode(selectedNode.content)}
                    >
                      Ask AI about this node
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}