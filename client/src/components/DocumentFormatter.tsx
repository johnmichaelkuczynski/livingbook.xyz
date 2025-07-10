import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Wand2, 
  Download, 
  Edit3, 
  AlignCenter, 
  AlignLeft,
  Calculator,
  Eye,
  EyeOff,
  Check,
  X,
  Scan
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import MathRenderer from './MathRenderer';

interface DocumentFormatterProps {
  document: any | null;
  onDocumentUpdate?: (updatedContent: string) => void;
}

interface MathSegment {
  id: string;
  start: number;
  end: number;
  original: string;
  latex: string;
  isValid: boolean;
  isEditing: boolean;
}

export default function DocumentFormatter({ document, onDocumentUpdate }: DocumentFormatterProps) {
  const [formattedContent, setFormattedContent] = useState('');
  const [instruction, setInstruction] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [mathMode, setMathMode] = useState(false);
  const [showLatex, setShowLatex] = useState(false);
  const [mathSegments, setMathSegments] = useState<MathSegment[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document?.content) {
      setFormattedContent(document.content);
    }
  }, [document]);

  // Basic formatting operations
  const applyBasicFormatting = (content: string): string => {
    return content
      .replace(/[ \t]+/g, ' ') // Remove extra spaces
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Remove triple+ line breaks
      .replace(/^(.+)$/gm, (match, line) => { // Indent paragraphs
        if (line.trim() === '') return line;
        if (line.match(/^(Chapter|Section|\d+\.|\#)/i)) return line; // Don't indent headers
        return '    ' + line.trim();
      });
  };

  const centerTitle = (content: string): string => {
    const lines = content.split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      lines[0] = '                    ' + lines[0].trim(); // Center first line
    }
    return lines.join('\n');
  };

  const fixSpacing = (content: string): string => {
    return content
      .replace(/[ \t]+/g, ' ') // Single spaces
      .replace(/\n{3,}/g, '\n\n') // Max 2 line breaks
      .replace(/^\s+|\s+$/gm, match => match.replace(/[^\n]/g, '')); // Trim lines but keep breaks
  };

  const removeDoubleLineBreaks = (content: string): string => {
    return content.replace(/\n\n+/g, '\n');
  };

  // Natural language formatting using AI
  const applyNaturalLanguageFormatting = async (content: string, instruction: string): Promise<string> => {
    try {
      const response = await fetch('/api/format-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          instruction,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.formattedContent;
    } catch (error) {
      console.error('Formatting error:', error);
      toast({
        title: "Formatting failed",
        description: "Could not apply natural language formatting. Please try again.",
        variant: "destructive",
      });
      return content;
    }
  };

  // Math detection and conversion
  const detectMathExpressions = (text: string): MathSegment[] => {
    const mathPatterns = [
      /\b[a-zA-Z]\s*[\+\-\*\/\=]\s*[a-zA-Z0-9]/g, // Basic algebra
      /\b\d+\s*[\+\-\*\/\^]\s*\d+/g, // Numeric expressions
      /\b[a-zA-Z]\^[0-9]/g, // Exponents
      /\b(sin|cos|tan|log|ln|sqrt)\s*\([^)]+\)/g, // Functions
      /\b\d*\/\d+/g, // Fractions
      /\b[a-zA-Z]+_[a-zA-Z0-9]+/g, // Subscripts
    ];

    const segments: MathSegment[] = [];
    let segmentId = 0;

    mathPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const id = `math_${segmentId++}`;
        const original = match[0];
        const latex = convertToLatex(original);
        
        segments.push({
          id,
          start: match.index,
          end: match.index + original.length,
          original,
          latex,
          isValid: true,
          isEditing: false,
        });
      }
    });

    return segments.sort((a, b) => a.start - b.start);
  };

  const convertToLatex = (expression: string): string => {
    let latex = expression;
    
    // Basic conversions
    latex = latex.replace(/\^(\d+)/g, '^{$1}'); // Exponents
    latex = latex.replace(/(\w+)_(\w+)/g, '$1_{$2}'); // Subscripts
    latex = latex.replace(/\*/g, ' \\cdot '); // Multiplication
    latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}'); // Square root
    latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}'); // Fractions
    
    return latex;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      
      setSelectedText(selectedText);
      setSelectionRange({
        start: range.startOffset,
        end: range.endOffset
      });
    }
  };

  const convertSelectionToMath = () => {
    if (!selectedText || !selectionRange) return;

    const latex = convertToLatex(selectedText);
    const newSegment: MathSegment = {
      id: `math_${Date.now()}`,
      start: selectionRange.start,
      end: selectionRange.end,
      original: selectedText,
      latex,
      isValid: true,
      isEditing: false,
    };

    setMathSegments(prev => [...prev, newSegment].sort((a, b) => a.start - b.start));
    setSelectedText('');
    setSelectionRange(null);
  };

  const performMathSweep = () => {
    const detected = detectMathExpressions(formattedContent);
    setMathSegments(detected);
    
    toast({
      title: "Math sweep complete",
      description: `Found ${detected.length} potential math expressions`,
    });
  };

  const renderContent = () => {
    if (!mathMode || mathSegments.length === 0) {
      return (
        <div 
          ref={contentRef}
          className="whitespace-pre-wrap p-4 min-h-[400px] focus:outline-none border-2 border-dashed border-gray-200 rounded-lg"
          contentEditable
          onBlur={(e) => {
            const newContent = e.currentTarget.textContent || '';
            setFormattedContent(newContent);
            if (onDocumentUpdate) {
              onDocumentUpdate(newContent);
            }
          }}
          onMouseUp={handleTextSelection}
          suppressContentEditableWarning={true}
        >
          {formattedContent}
        </div>
      );
    }

    // Render with math segments
    let content = formattedContent;
    let offset = 0;

    const processedSegments = [...mathSegments].reverse();
    
    processedSegments.forEach(segment => {
      const before = content.substring(0, segment.start + offset);
      const after = content.substring(segment.end + offset);
      
      const mathElement = showLatex 
        ? `$$${segment.latex}$$`
        : segment.latex;
        
      content = before + mathElement + after;
      offset += mathElement.length - (segment.end - segment.start);
    });

    return (
      <div className="p-4 min-h-[400px] border-2 border-dashed border-gray-200 rounded-lg">
        {showLatex ? (
          <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
        ) : (
          <div className="whitespace-pre-wrap">
            {content.split(/(\$\$[^$]+\$\$)/).map((part, index) => {
              if (part.startsWith('$$') && part.endsWith('$$')) {
                const latex = part.slice(2, -2);
                return (
                  <MathRenderer 
                    key={index} 
                    expression={latex} 
                    displayMode={false}
                    className="inline-block mx-1 px-2 py-1 bg-blue-50 rounded border"
                  />
                );
              }
              return <span key={index}>{part}</span>;
            })}
          </div>
        )}
      </div>
    );
  };

  const formatDocument = async () => {
    setIsFormatting(true);
    
    let content = formattedContent;
    
    if (instruction.trim()) {
      content = await applyNaturalLanguageFormatting(content, instruction);
    } else {
      content = applyBasicFormatting(content);
    }
    
    setFormattedContent(content);
    setInstruction('');
    setIsFormatting(false);
    
    if (onDocumentUpdate) {
      onDocumentUpdate(content);
    }
    
    toast({
      title: "Document formatted",
      description: "Applied formatting rules successfully",
    });
  };

  const exportDocument = async (format: 'word' | 'pdf') => {
    try {
      const response = await fetch('/api/export-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formattedContent,
          format,
          title: document?.originalName || 'Formatted Document',
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      // Create temporary link element for download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${document?.originalName || 'document'}.${format === 'word' ? 'docx' : 'pdf'}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Document exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!document) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
        <p className="text-gray-500">Upload a document to start formatting</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Document Formatter</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant={mathMode ? "default" : "outline"}
                size="sm"
                onClick={() => setMathMode(!mathMode)}
              >
                <Calculator className="w-4 h-4 mr-1" />
                Math Mode
              </Button>
              {mathMode && (
                <Button
                  variant={showLatex ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowLatex(!showLatex)}
                >
                  {showLatex ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Format Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setFormattedContent(fixSpacing(formattedContent))}>
              Fix Spacing
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFormattedContent(centerTitle(formattedContent))}>
              <AlignCenter className="w-4 h-4 mr-1" />
              Center Title
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFormattedContent(removeDoubleLineBreaks(formattedContent))}>
              Remove Double Breaks
            </Button>
            {mathMode && (
              <>
                <Button size="sm" variant="outline" onClick={performMathSweep}>
                  <Scan className="w-4 h-4 mr-1" />
                  Math Sweep
                </Button>
                {selectedText && (
                  <Button size="sm" variant="default" onClick={convertSelectionToMath}>
                    Convert to Math
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Natural Language Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Formatting Instructions</label>
            <div className="flex space-x-2">
              <Textarea
                placeholder="e.g., 'remove double line breaks', 'align section headers', 'fix bullet points'..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button onClick={formatDocument} disabled={isFormatting}>
                <Wand2 className="w-4 h-4 mr-1" />
                {isFormatting ? 'Formatting...' : 'Format Now'}
              </Button>
            </div>
          </div>

          {/* Export Options */}
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => exportDocument('word')}>
              <Download className="w-4 h-4 mr-1" />
              Export Word
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportDocument('pdf')}>
              <Download className="w-4 h-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Math Segments Panel */}
      {mathMode && mathSegments.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">Math Expressions</h4>
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {mathSegments.map((segment) => (
                <div key={segment.id} className="flex items-center space-x-2 text-sm">
                  <Badge variant={segment.isValid ? "default" : "destructive"}>
                    {segment.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </Badge>
                  <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-xs">
                    {segment.original} → {segment.latex}
                  </code>
                  <Button size="sm" variant="ghost">
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Live Preview</h3>
          <Badge variant="outline">
            {formattedContent.length} characters
          </Badge>
        </div>
        
        <ScrollArea className="max-h-[600px]">
          {renderContent()}
        </ScrollArea>
      </Card>
    </div>
  );
}