import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import mermaid from 'mermaid';

interface CognitiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
  selectedText: string;
}

export default function CognitiveMapModal({ isOpen, onClose, content, isLoading, selectedText }: CognitiveMapModalProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual'); 
  const [parsedContent, setParsedContent] = useState<{ textStructure: string; mermaidCode: string }>({
    textStructure: '',
    mermaidCode: ''
  });
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#f3f4f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#6b7280',
        lineColor: '#6b7280',
        secondaryColor: '#e5e7eb',
        tertiaryColor: '#f9fafb'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 20
      },
      fontFamily: 'Inter, system-ui, sans-serif'
    });
  }, []);

  // Parse content when it changes
  useEffect(() => {
    if (!content) return;

    try {
      // Look for structured content with text and mermaid sections
      const textMatch = content.match(/LOGICAL STRUCTURE:([\s\S]*?)(?:MERMAID DIAGRAM:|$)/i);
      const mermaidMatch = content.match(/MERMAID DIAGRAM:([\s\S]*?)$/i);

      if (textMatch && mermaidMatch) {
        let mermaidCode = mermaidMatch[1].trim();
        
        // Clean up the mermaid code to remove problematic syntax
        mermaidCode = mermaidCode
          .replace(/```mermaid\n?|\n?```/g, '') // Remove code blocks
          .replace(/^\s*-\s+/gm, '') // Remove markdown list items
          .replace(/\*\*/g, '') // Remove bold markdown
          .replace(/\*/g, '') // Remove italic markdown
          .replace(/#{1,6}\s?/g, ''); // Remove headers
        
        setParsedContent({
          textStructure: textMatch[1].trim(),
          mermaidCode: mermaidCode
        });
      } else {
        // Fallback: treat entire content as text structure
        setParsedContent({
          textStructure: content,
          mermaidCode: generateFallbackMermaid(content)
        });
      }
    } catch (error) {
      console.error('Error parsing cognitive map content:', error);
      setParsedContent({
        textStructure: content,
        mermaidCode: generateFallbackMermaid(content)
      });
    }
  }, [content]);

  // Render Mermaid diagram
  useEffect(() => {
    if (viewMode === 'visual' && parsedContent.mermaidCode && mermaidRef.current) {
      const renderMermaid = async () => {
        try {
          const id = `mermaid-${Date.now()}`;
          mermaidRef.current!.innerHTML = '';
          
          // Validate mermaid code before rendering
          let cleanCode = parsedContent.mermaidCode
            .replace(/```mermaid\n?|\n?```/g, '')
            .replace(/^\s*-\s+/gm, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();
          
          // Ensure it starts with graph declaration
          if (!cleanCode.startsWith('graph ')) {
            cleanCode = 'graph TD\n' + cleanCode;
          }
          
          console.log('Rendering Mermaid code:', cleanCode);
          
          const { svg } = await mermaid.render(id, cleanCode);
          mermaidRef.current!.innerHTML = svg;
          
          // Style the rendered SVG
          const svgElement = mermaidRef.current!.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
          
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          console.error('Failed code:', parsedContent.mermaidCode);
          
          // Try fallback diagram
          try {
            const fallbackCode = generateFallbackMermaid(parsedContent.textStructure || 'Analysis failed');
            const { svg } = await mermaid.render(`fallback-${Date.now()}`, fallbackCode);
            mermaidRef.current!.innerHTML = svg;
          } catch (fallbackError) {
            mermaidRef.current!.innerHTML = `
              <div class="p-8 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                <div class="text-lg font-medium text-gray-700 mb-2">Diagram Unavailable</div>
                <p class="text-sm">The visual diagram could not be generated.</p>
                <p class="text-sm">Please use the "Text View" to see the logical structure.</p>
              </div>
            `;
          }
        }
      };
      
      renderMermaid();
    }
  }, [viewMode, parsedContent.mermaidCode]);

  const generateFallbackMermaid = (text: string): string => {
    // Extract key concepts and create a simple hierarchy
    const lines = text.split('\n').filter(line => line.trim() && !line.includes('LOGICAL STRUCTURE') && !line.includes('MERMAID DIAGRAM'));
    
    let mermaidCode = 'graph TD\n';
    let nodeCount = 0;
    const nodes: string[] = [];
    
    lines.slice(0, 8).forEach((line) => {
      // Clean and truncate the line for node labels
      let cleanLine = line
        .replace(/^[-•→├└│\s]*/, '') // Remove tree symbols
        .replace(/[^\w\s:.,]/g, '') // Remove special chars except basic punctuation
        .slice(0, 40); // Limit length
      
      if (cleanLine.trim()) {
        const nodeId = `N${nodeCount}`;
        nodes.push(nodeId);
        mermaidCode += `    ${nodeId}["${cleanLine.trim()}"]\n`;
        
        // Connect to previous node if not the first
        if (nodeCount > 0) {
          mermaidCode += `    ${nodes[Math.max(0, nodeCount - 1)]} --> ${nodeId}\n`;
        }
        nodeCount++;
      }
    });
    
    return mermaidCode || 'graph TD\n    A["Content Analysis"]';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cognitive Map</h2>
            <p className="text-sm text-gray-600 mt-1">Structural analysis of selected text</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setViewMode(viewMode === 'visual' ? 'text' : 'visual')}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              {viewMode === 'visual' ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{viewMode === 'visual' ? 'Text View' : 'Visual View'}</span>
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Selected Text */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Selected Passage</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="text-sm text-gray-700 leading-relaxed">
                {selectedText}
              </div>
            </ScrollArea>
          </div>

          {/* Cognitive Map */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">
                {viewMode === 'visual' ? 'Visual Cognitive Map' : 'Logical Structure'}
              </h3>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Analyzing structure...</span>
                </div>
              ) : viewMode === 'visual' ? (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div 
                      ref={mermaidRef} 
                      className="w-full overflow-x-auto"
                      style={{ minHeight: '400px' }}
                    />
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                      {parsedContent.textStructure || content}
                    </pre>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}