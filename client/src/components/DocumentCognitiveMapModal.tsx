import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, RefreshCw, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import mermaid from 'mermaid';

interface DocumentCognitiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentCognitiveMapModal({ isOpen, onClose, document }: DocumentCognitiveMapModalProps) {
  const [cognitiveMapContent, setCognitiveMapContent] = useState('');
  const [mermaidDiagram, setMermaidDiagram] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'default',
      fontFamily: 'arial',
      fontSize: 12
    });
  }, []);

  const generateCognitiveMap = async () => {
    if (!document) return;

    setIsGenerating(true);
    setCognitiveMapContent('');
    setMermaidDiagram('');

    try {
      const response = await apiRequest('POST', '/api/generate-document-cognitive-map', {
        documentId: document.id,
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setCognitiveMapContent(data.cognitiveMap);
        setMermaidDiagram(data.mermaidDiagram || '');
        
        toast({
          title: "Cognitive Map Generated",
          description: "Document analysis complete - visual diagram ready.",
        });
      } else {
        throw new Error('Failed to generate cognitive map');
      }
    } catch (error) {
      console.error('Cognitive map generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to create cognitive map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsInitialLoad(false);
    }
  };

  // Auto-generate cognitive map when modal opens
  useEffect(() => {
    if (isOpen && document && !cognitiveMapContent && !isGenerating && isInitialLoad) {
      generateCognitiveMap();
    }
  }, [isOpen, document]);

  // Render Mermaid diagram when content changes
  useEffect(() => {
    if (mermaidDiagram && mermaidRef.current) {
      // Clear previous content
      mermaidRef.current.innerHTML = '';
      
      // Generate unique ID for this diagram
      const id = `mermaid-diagram-${Date.now()}`;
      
      try {
        mermaid.render(id, mermaidDiagram).then((result) => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = result.svg;
          }
        }).catch((error) => {
          console.error('Mermaid rendering error:', error);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '<p class="text-red-500 text-sm">Error rendering diagram</p>';
          }
        });
      } catch (error) {
        console.error('Mermaid setup error:', error);
      }
    }
  }, [mermaidDiagram]);

  // Parse the cognitive map content into structured sections
  const parseStructuredContent = (content: string) => {
    const sections = {
      mainThesis: '',
      keyClaims: [] as string[],
      subClaims: [] as string[],
      evidence: [] as string[],
      definitions: [] as string[],
      assumptions: [] as string[]
    };

    const lines = content.split('\n').filter(line => line.trim());
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('MAIN THESIS:')) {
        currentSection = 'mainThesis';
        sections.mainThesis = trimmedLine.replace('MAIN THESIS:', '').trim();
      } else if (trimmedLine.startsWith('KEY CLAIMS:')) {
        currentSection = 'keyClaims';
      } else if (trimmedLine.startsWith('SUB-CLAIMS:')) {
        currentSection = 'subClaims';
      } else if (trimmedLine.startsWith('EVIDENCE:')) {
        currentSection = 'evidence';
      } else if (trimmedLine.startsWith('DEFINITIONS:')) {
        currentSection = 'definitions';
      } else if (trimmedLine.startsWith('ASSUMPTIONS:')) {
        currentSection = 'assumptions';
      } else if (trimmedLine.startsWith('- ')) {
        const content = trimmedLine.substring(2);
        switch (currentSection) {
          case 'keyClaims':
            sections.keyClaims.push(content);
            break;
          case 'subClaims':
            sections.subClaims.push(content);
            break;
          case 'evidence':
            sections.evidence.push(content);
            break;
          case 'definitions':
            sections.definitions.push(content);
            break;
          case 'assumptions':
            sections.assumptions.push(content);
            break;
        }
      }
    }

    return sections;
  };

  const structuredContent = cognitiveMapContent ? parseStructuredContent(cognitiveMapContent) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Brain className="w-6 h-6" />
            Cognitive Map - {document?.originalName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <h3 className="text-lg font-medium">Generating Cognitive Map...</h3>
              <p className="text-sm text-gray-600">Analyzing document structure and key relationships</p>
            </div>
          )}

          {/* Content Display */}
          {structuredContent && !isGenerating && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Structural Analysis of Document
                </Badge>
                <Button 
                  onClick={generateCognitiveMap} 
                  variant="outline" 
                  size="sm"
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Document Summary and Text Analysis */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Selected Passage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">
                        Complete document analysis - all content processed for comprehensive cognitive mapping.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Definitions */}
                  {structuredContent.definitions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-blue-600">Definitions:</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {structuredContent.definitions.map((def, index) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded border border-blue-200">
                            {def}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Assumptions */}
                  {structuredContent.assumptions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-purple-600">Assumptions:</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {structuredContent.assumptions.map((assumption, index) => (
                          <div key={index} className="text-sm p-2 bg-purple-50 rounded border border-purple-200">
                            {assumption}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column - Visual Cognitive Map Diagram */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Visual Cognitive Map</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Mermaid Diagram */}
                      {mermaidDiagram && (
                        <div className="w-full h-auto overflow-auto border rounded-lg bg-white p-4">
                          <div ref={mermaidRef} className="w-full h-auto"></div>
                        </div>
                      )}
                      
                      {/* Fallback if no diagram */}
                      {!mermaidDiagram && structuredContent && (
                        <div className="space-y-4">
                          {/* Main Thesis */}
                          {structuredContent.mainThesis && (
                            <div className="text-center">
                              <div className="p-3 bg-indigo-100 border border-indigo-300 rounded-lg">
                                <div className="font-semibold text-sm text-indigo-800 mb-1">Main Thesis:</div>
                                <div className="text-sm text-indigo-700">{structuredContent.mainThesis}</div>
                              </div>
                            </div>
                          )}

                          {/* Key Claims */}
                          {structuredContent.keyClaims.length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                              {structuredContent.keyClaims.map((claim, index) => (
                                <div key={index} className="p-3 bg-green-100 border border-green-300 rounded-lg">
                                  <div className="font-semibold text-sm text-green-800 mb-1">
                                    Key Claim {index + 1}:
                                  </div>
                                  <div className="text-sm text-green-700">{claim}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Raw Content (for fallback) */}
              {!structuredContent.mainThesis && cognitiveMapContent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cognitive Map Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
                      {cognitiveMapContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}