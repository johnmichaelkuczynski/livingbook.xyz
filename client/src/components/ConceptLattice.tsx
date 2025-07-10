import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Download, Mail, MessageCircle, Edit3, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ConceptNode {
  id: string;
  type: 'main_idea' | 'basic_argument' | 'example' | 'supporting_quote' | 'fine_argument';
  content: string;
  parentId?: string;
  isExpanded?: boolean;
  isEditing?: boolean;
  color?: string;
  position?: { x: number; y: number };
  connections?: string[];
}

interface ConceptLatticeData {
  nodes: ConceptNode[];
  metadata: {
    sourceText: string;
    title: string;
    generatedAt: string;
  };
}

interface ConceptLatticeProps {
  selectedText: string;
  documentTitle: string;
  onClose: () => void;
  provider?: string;
}

const COLORS = {
  main_idea: '#2563eb',
  basic_argument: '#059669',
  example: '#d97706',
  supporting_quote: '#7c3aed',
  fine_argument: '#dc2626'
};

const TYPE_LABELS = {
  main_idea: 'Main Idea',
  basic_argument: 'Basic Argument',
  example: 'Example',
  supporting_quote: 'Supporting Quote',
  fine_argument: 'Fine Argument'
};

export default function ConceptLattice({ selectedText, documentTitle, onClose, provider = 'deepseek' }: ConceptLatticeProps) {
  const [latticeData, setLatticeData] = useState<ConceptLatticeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalInstruction, setGlobalInstruction] = useState('');
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const latticeRef = useRef<HTMLDivElement>(null);

  // Generate initial concept lattice
  const generateLattice = useCallback(async () => {
    if (!selectedText.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/concept-lattice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          title: documentTitle,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate concept lattice');
      }

      const data = await response.json();
      setLatticeData(data);
    } catch (error) {
      console.error('Error generating concept lattice:', error);
      toast({
        title: "Error",
        description: "Failed to generate concept lattice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedText, documentTitle, provider]);

  // Process global instruction
  const processGlobalInstruction = async () => {
    if (!globalInstruction.trim() || !latticeData) return;
    
    setIsProcessingGlobal(true);
    try {
      const response = await fetch('/api/concept-lattice/global-modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: globalInstruction,
          currentData: latticeData,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process global instruction');
      }

      const updatedData = await response.json();
      setLatticeData(updatedData);
      setGlobalInstruction('');
      toast({
        title: "Success",
        description: "Concept lattice updated successfully"
      });
    } catch (error) {
      console.error('Error processing global instruction:', error);
      toast({
        title: "Error",
        description: "Failed to process instruction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingGlobal(false);
    }
  };

  // Process node-specific chat
  const processNodeChat = async (nodeId: string) => {
    if (!chatMessage.trim() || !latticeData) return;
    
    setIsProcessingChat(true);
    try {
      const node = latticeData.nodes.find(n => n.id === nodeId);
      if (!node) return;

      const response = await fetch('/api/concept-lattice/node-modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          instruction: chatMessage,
          currentData: latticeData,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process node instruction');
      }

      const updatedData = await response.json();
      setLatticeData(updatedData);
      setChatMessage('');
      setActiveChat(null);
      toast({
        title: "Success",
        description: "Node updated successfully"
      });
    } catch (error) {
      console.error('Error processing node chat:', error);
      toast({
        title: "Error",
        description: "Failed to process instruction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingChat(false);
    }
  };

  // Toggle node content expansion (separate from child expansion)
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());
  
  const toggleContentExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedContent);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedContent(newExpanded);
  };

  // Toggle node hierarchy expansion (for children)
  const toggleHierarchyExpansion = (nodeId: string) => {
    if (!latticeData) return;
    
    const updatedNodes = latticeData.nodes.map(node => 
      node.id === nodeId 
        ? { ...node, isExpanded: !node.isExpanded }
        : node
    );
    
    setLatticeData({
      ...latticeData,
      nodes: updatedNodes
    });
  };

  // Get child nodes
  const getChildNodes = (parentId: string) => {
    if (!latticeData) return [];
    return latticeData.nodes.filter(node => node.parentId === parentId);
  };

  // Get main idea nodes
  const getMainIdeas = () => {
    if (!latticeData) return [];
    return latticeData.nodes.filter(node => node.type === 'main_idea');
  };

  // Export as image
  const exportAsImage = async (format: 'png' | 'jpg') => {
    if (!latticeRef.current) return;
    
    try {
      const canvas = await html2canvas(latticeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `concept-lattice-${documentTitle}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`);
      link.click();
      
      toast({
        title: "Success",
        description: `Concept lattice exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: "Error",
        description: "Failed to export image",
        variant: "destructive"
      });
    }
  };

  // Export as PDF
  const exportAsPDF = async () => {
    if (!latticeRef.current) return;
    
    try {
      const canvas = await html2canvas(latticeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`concept-lattice-${documentTitle}.pdf`);
      
      toast({
        title: "Success",
        description: "Concept lattice exported as PDF"
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    }
  };

  // Email lattice
  const emailLattice = async () => {
    if (!latticeRef.current) return;
    
    try {
      const canvas = await html2canvas(latticeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imageData = canvas.toDataURL('image/png');
      
      const response = await fetch('/api/concept-lattice/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          title: documentTitle,
          sourceText: selectedText.substring(0, 500) + '...'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast({
        title: "Success",
        description: "Concept lattice sent via email"
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive"
      });
    }
  };

  // Initialize lattice on mount
  useEffect(() => {
    generateLattice();
  }, [generateLattice]);

  // Render node with proper styling and interactions
  const renderNode = (node: ConceptNode, depth = 0) => {
    const hasChildren = getChildNodes(node.id).length > 0;
    const isHierarchyExpanded = node.isExpanded ?? true; // Children expanded by default
    const isContentExpanded = expandedContent.has(node.id);
    const childNodes = getChildNodes(node.id);

    const getNodeStyle = () => {
      const baseStyle = "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg mb-3";
      
      switch (node.type) {
        case 'main_idea':
          return `${baseStyle} text-xl font-bold bg-blue-50 border-blue-300 text-blue-900 shadow-md`;
        case 'basic_argument':
          return `${baseStyle} text-lg font-semibold bg-green-50 border-green-300 text-green-900`;
        case 'example':
          return `${baseStyle} text-base font-medium bg-orange-50 border-orange-300 text-orange-900`;
        case 'supporting_quote':
          return `${baseStyle} text-sm bg-purple-50 border-purple-300 text-purple-900 italic`;
        case 'fine_argument':
          return `${baseStyle} text-sm bg-red-50 border-red-300 text-red-900`;
        default:
          return `${baseStyle} bg-gray-50 border-gray-200 text-gray-900`;
      }
    };

    return (
      <div key={node.id} className="mb-4">
        <div 
          className={getNodeStyle()}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleHierarchyExpansion(node.id)}
                  className="p-1 h-6 w-6 mt-1"
                >
                  {isHierarchyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[node.type]}
                  </Badge>
                </div>
                <div className="w-full">
                  {node.type === 'supporting_quote' && '"'}
                  {node.content}
                  {node.type === 'supporting_quote' && '"'}
                </div>
              </div>
            </div>
            
            {node.type !== 'main_idea' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6 mt-1"
                    onClick={() => setActiveChat(node.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Modify: {TYPE_LABELS[node.type]}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium">Current content:</p>
                      <p className="text-sm">{node.content}</p>
                    </div>
                    <Textarea
                      placeholder="Enter your instruction (e.g., 'make this more concise', 'replace with a better example', 'add a quote from Darwin')"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => processNodeChat(node.id)}
                        disabled={isProcessingChat || !chatMessage.trim()}
                      >
                        {isProcessingChat ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Edit3 className="h-4 w-4 mr-2" />
                        )}
                        Apply Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveChat(null);
                          setChatMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {hasChildren && isHierarchyExpanded && (
          <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-300 pl-4">
            {childNodes.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Concept Lattice 1.0</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive visualization of "{documentTitle}"
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select defaultValue="png">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png" onClick={() => exportAsImage('png')}>PNG</SelectItem>
                <SelectItem value="jpg" onClick={() => exportAsImage('jpg')}>JPG</SelectItem>
                <SelectItem value="pdf" onClick={() => exportAsPDF()}>PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={emailLattice}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isGenerating ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Generating concept lattice...</p>
              </div>
            </div>
          ) : latticeData ? (
            <div className="space-y-6">
              {/* Global Control Panel */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Global Instructions</h3>
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Enter global instruction (e.g., 'Move arguments from Idea #2 to Idea #4', 'Replace all quotes with examples from psychology')"
                    value={globalInstruction}
                    onChange={(e) => setGlobalInstruction(e.target.value)}
                    className="flex-1 min-h-[80px]"
                  />
                  <Button
                    onClick={processGlobalInstruction}
                    disabled={isProcessingGlobal || !globalInstruction.trim()}
                    className="self-end"
                  >
                    {isProcessingGlobal ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Edit3 className="h-4 w-4 mr-2" />
                    )}
                    Apply
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Concept Lattice Visualization */}
              <div ref={latticeRef} className="bg-white p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-6 text-center">
                  {latticeData.metadata.title}
                </h2>
                
                <div className="space-y-6">
                  {getMainIdeas().map(mainIdea => (
                    <div key={mainIdea.id} className="space-y-4">
                      {renderNode(mainIdea)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Failed to generate concept lattice</p>
                <Button onClick={generateLattice}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}