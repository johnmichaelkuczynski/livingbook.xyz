import { useState, useCallback, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, MessageSquare, Send, X, BookOpen, Download, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DocumentViewerIframe from "@/components/DocumentViewerIframe";
import ComparisonChatInterface from "@/components/ComparisonChatInterface";
import TextSelectionPopup from "@/components/TextSelectionPopup";
import TextSelectionHandler from "@/components/TextSelectionHandler";
import KaTeXRenderer from "@/components/KaTeXRenderer";
import { downloadAIResponseAsWord } from "@/utils/wordGenerator";
import StudyGuideModal from "@/components/StudyGuideModal";
import TestMeModal from "@/components/TestMeModal";
import PodcastModal from "@/components/PodcastModal";
import RewriteModal from "@/components/RewriteModal";
import CognitiveMapModal from "@/components/CognitiveMapModal";
import SummaryThesisModal from "@/components/SummaryThesisModal";
import ThesisDeepDiveModal from "@/components/ThesisDeepDiveModal";
import SuggestedReadingsModal from "@/components/SuggestedReadingsModal";
import SynthesizeDocumentsModal from "@/components/SynthesizeDocumentsModal";
import DualTextSelectionInterface from "@/components/DualTextSelectionInterface";
import ProgressModal from "@/components/ProgressModal";

// Using any type to match existing codebase pattern
type Document = any;

export default function ComparePage() {
  const [documentA, setDocumentA] = useState<Document | null>(null);
  const [documentB, setDocumentB] = useState<Document | null>(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [dragActiveA, setDragActiveA] = useState(false);
  const [dragActiveB, setDragActiveB] = useState(false);
  const [textInputA, setTextInputA] = useState('');
  const [textInputB, setTextInputB] = useState('');
  const [messages, setMessages] = useState<Array<{id: number, role: string, content: string, timestamp: string}>>([]);
  
  // Document chunking states for large documents (1000 word chunks)
  const [documentChunksA, setDocumentChunksA] = useState<string[]>([]);
  const [documentChunksB, setDocumentChunksB] = useState<string[]>([]);
  const [selectedChunkA, setSelectedChunkA] = useState<number>(0);
  const [selectedChunkB, setSelectedChunkB] = useState<number>(0);
  
  // Text Selection State - Enhanced for dual selection
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [showDualSelectionPopup, setShowDualSelectionPopup] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedTextA, setSelectedTextA] = useState("");
  const [selectedTextB, setSelectedTextB] = useState("");
  const [selectionDocument, setSelectionDocument] = useState<string>("");
  
  // Modal States for Text Selection Features
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [showCognitiveMapModal, setShowCognitiveMapModal] = useState(false);
  const [showSummaryThesisModal, setShowSummaryThesisModal] = useState(false);
  const [showThesisDeepDiveModal, setShowThesisDeepDiveModal] = useState(false);
  const [showSuggestedReadingsModal, setShowSuggestedReadingsModal] = useState(false);
  const [showSynthesizeModal, setShowSynthesizeModal] = useState(false);
  const [cognitiveMapContent, setCognitiveMapContent] = useState('');
  const [isGeneratingDualMap, setIsGeneratingDualMap] = useState(false);
  const [dualMapProgress, setDualMapProgress] = useState(0);
  const [dualMapStatus, setDualMapStatus] = useState('');
  const [isGeneratingDualPodcast, setIsGeneratingDualPodcast] = useState(false);
  const [dualPodcastProgress, setDualPodcastProgress] = useState(0);
  const [dualPodcastStatus, setDualPodcastStatus] = useState('');
  
  // Chat state
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Utility function to chunk documents by word count (1000 words)
  const chunkDocument = (content: string): string[] => {
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    const chunkSize = 1000;
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
    }
    
    return chunks.length > 0 ? chunks : [content];
  };

  // Function to count words in a string
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Handle text submission
  const handleTextSubmit = async (column: 'A' | 'B') => {
    const textInput = column === 'A' ? textInputA : textInputB;
    
    // Proper validation - check if there's any text (even one character)
    if (!textInput || textInput.trim().length === 0) {
      toast({
        title: "Empty text",
        description: `Please enter some text for Document ${column} before submitting.`,
        variant: "destructive",
      });
      return;
    }

    // Set uploading state
    if (column === 'A') {
      setIsUploadingA(true);
    } else {
      setIsUploadingB(true);
    }
    
    try {
      // Send text to backend for processing
      const response = await fetch('/api/documents/create-from-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textInput.trim(),
          title: `Text Input ${column} (${new Date().toLocaleTimeString()})`
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Text processing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Set the document - API returns document directly, not in result.document
      if (column === 'A') {
        setDocumentA(result);
        setTextInputA(''); // Clear text input after successful processing
      } else {
        setDocumentB(result);
        setTextInputB(''); // Clear text input after successful processing
      }
      
      toast({
        title: "Text processed successfully",
        description: `Document ${column} created from your text input.`,
      });
      
    } catch (error) {
      console.error('Text processing error:', error);
      toast({
        title: "Processing failed",
        description: `Failed to process text for Document ${column}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      // Clear uploading state
      if (column === 'A') {
        setIsUploadingA(false);
      } else {
        setIsUploadingB(false);
      }
    }
  };

  // Handle file upload  
  const handleFileUpload = async (file: File, column: 'A' | 'B') => {
    // Set uploading state
    if (column === 'A') {
      setIsUploadingA(true);
    } else {
      setIsUploadingB(true);
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload result:', result);
      
      // Set the document and create chunks if large
      const wordCount = countWords(result.content);
      const chunks = wordCount > 1000 ? chunkDocument(result.content) : [];
      
      if (column === 'A') {
        setDocumentA(result);
        setDocumentChunksA(chunks);
        setSelectedChunkA(0);
      } else {
        setDocumentB(result);
        setDocumentChunksB(chunks);
        setSelectedChunkB(0);
      }
      
      toast({
        title: "File uploaded successfully",
        description: `Document ${column} uploaded and processed.`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload file for Document ${column}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      // Clear uploading state
      if (column === 'A') {
        setIsUploadingA(false);
      } else {
        setIsUploadingB(false);
      }
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent, column: 'A' | 'B') => {
    e.preventDefault();
    e.stopPropagation();
    if (column === 'A') setDragActiveA(true);
    else setDragActiveB(true);
  };

  const handleDragLeave = (e: React.DragEvent, column: 'A' | 'B') => {
    e.preventDefault();
    e.stopPropagation();
    if (column === 'A') setDragActiveA(false);
    else setDragActiveB(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Text Selection Handlers
  const handleStudyGuide = () => {
    setShowSelectionPopup(false);
    setShowStudyGuideModal(true);
  };

  const handleTestMe = () => {
    setShowSelectionPopup(false);
    setShowTestModal(true);
  };

  const handlePodcast = () => {
    setShowSelectionPopup(false);
    setPodcastModal(true);
  };

  const handleRewrite = () => {
    setShowSelectionPopup(false);
    setShowRewriteModal(true);
  };

  const handleCognitiveMap = async (text: string) => {
    setSelectedText(text);
    setSelectionDocument(documentA ? documentA.originalName : "Unknown Document");
    setShowCognitiveMapModal(true);
    
    // Generate cognitive map content
    try {
      const response = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: text,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate cognitive map: ${response.statusText}`);
      }

      const data = await response.json();
      setCognitiveMapContent(data.cognitiveMap);
      
    } catch (error) {
      console.error('Cognitive map generation error:', error);
      toast({
        title: "Error generating cognitive map",
        description: "Failed to generate cognitive map. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSummaryThesis = () => {
    setShowSelectionPopup(false);
    setShowSummaryThesisModal(true);
  };

  const handleThesisDeepDive = () => {
    setShowSelectionPopup(false);
    setShowThesisDeepDiveModal(true);
  };

  const handleSuggestedReadings = () => {
    setShowSelectionPopup(false);
    setShowSuggestedReadingsModal(true);
  };

  // Multi-document handlers for both documents
  const handleSynthesizeDocuments = () => {
    if (!documentA || !documentB) return;
    setShowSynthesizeModal(true);
  };

  // Download handlers for chat functionality
  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    
    const chatContent = messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      return `[${timestamp}] ${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`;
    }).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Chat downloaded",
      description: "Conversation saved successfully.",
    });
  };

  const handleDownloadMessage = (msg: any) => {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const content = `[${timestamp}] ${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${timestamp.replace(/[/:]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Message downloaded",
      description: "Single message saved successfully.",
    });
  };

  const handleDualPodcast = () => {
    if (!documentA || !documentB) return;
    // Set up for dual document podcast
    setSelectedText(`Document A: ${documentA.content}\n\nDocument B: ${documentB.content}`);
    setSelectionDocument("Both Documents");
    setShowPodcastModal(true);
  };

  const handleDualCognitiveMap = async () => {
    if (!documentA || !documentB) return;
    
    const combinedText = `Document A: ${documentA.content}\n\nDocument B: ${documentB.content}`;
    setSelectedText(combinedText);
    setSelectionDocument("Both Documents");
    setShowCognitiveMapModal(true);
    
    // Generate cognitive map content
    try {
      const response = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: combinedText,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate cognitive map: ${response.statusText}`);
      }

      const data = await response.json();
      setCognitiveMapContent(data.cognitiveMap);
      
    } catch (error) {
      console.error('Cognitive map generation error:', error);
      toast({
        title: "Error generating cognitive map",
        description: "Failed to generate cognitive map. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDualRewrite = () => {
    if (!documentA || !documentB) return;
    setSelectedText(`Document A: ${documentA.content}\n\nDocument B: ${documentB.content}`);
    setSelectionDocument("Both Documents");
    setShowRewriteModal(true);
  };

  const handleDualTestMe = () => {
    if (!documentA || !documentB) return;
    setSelectedText(`Document A: ${documentA.content}\n\nDocument B: ${documentB.content}`);
    setSelectionDocument("Both Documents");
    setShowTestModal(true);
  };

  // Utility function to clean HTML and extract text
  const cleanHtmlText = (html: string): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  };

  // Handle dual action functions (for selected text from both documents)
  const handleDualAction = async (action: string) => {
    if (!selectedTextA || !selectedTextB) return;
    
    // Clean both texts of any HTML formatting
    const cleanTextA = cleanHtmlText(selectedTextA);
    const cleanTextB = cleanHtmlText(selectedTextB);
    
    const combinedContent = `Selected from ${documentA?.title || 'Document A'}:\n${cleanTextA}\n\nSelected from ${documentB?.title || 'Document B'}:\n${cleanTextB}`;
    
    setSelectedText(combinedContent);
    setSelectionDocument("Both Documents (Selected Passages)");
    
    switch (action) {
      case 'podcast':
        await handleDualDocumentPodcast(cleanTextA, cleanTextB);
        break;
      case 'cognitive-map':
        await handleDualDocumentMindMap(cleanTextA, cleanTextB);
        break;
      case 'test-me':
        setShowTestModal(true);
        break;
      case 'study-guide':
        setShowStudyGuideModal(true);
        break;
      case 'rewrite':
        setShowRewriteModal(true);
        break;
    }
  };

  // Handle dual document mind map generation with progress tracking
  const handleDualDocumentMindMap = async (textA: string, textB: string) => {
    setIsGeneratingDualMap(true);
    setDualMapProgress(0);
    setShowCognitiveMapModal(true);

    try {
      // Step 1: Generate mind map for Document A
      setDualMapStatus('Generating mind map for Document A...');
      setDualMapProgress(10);
      
      const responseA = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: textA,
          provider: provider,
          documentTitle: documentA?.title || 'Document A'
        }),
      });

      if (!responseA.ok) throw new Error('Failed to generate mind map for Document A');
      const dataA = await responseA.json();
      
      setDualMapProgress(40);

      // Step 2: Generate mind map for Document B
      setDualMapStatus('Generating mind map for Document B...');
      
      const responseB = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: textB,
          provider: provider,
          documentTitle: documentB?.title || 'Document B'
        }),
      });

      if (!responseB.ok) throw new Error('Failed to generate mind map for Document B');
      const dataB = await responseB.json();
      
      setDualMapProgress(70);

      // Step 3: Generate meta-map showing analogies and similarities
      setDualMapStatus('Generating meta-map with analogies and similarities...');
      
      const metaPrompt = `Analyze the following two mind maps and create a meta-map that identifies analogies, similarities, connections, and contrasts between them:

MIND MAP A (${documentA?.title || 'Document A'}):
${dataA.cognitiveMap}

MIND MAP B (${documentB?.title || 'Document B'}):
${dataB.cognitiveMap}

Create a structured analysis that shows:
1. Key similarities between the two documents
2. Analogous concepts or structures
3. Contrasting viewpoints or approaches
4. Potential connections or bridges between the ideas
5. A visual Mermaid diagram showing the relationships

Format as LOGICAL STRUCTURE and MERMAID DIAGRAM sections.`;

      const metaResponse = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: metaPrompt,
          provider: provider,
          documentTitle: 'Meta-Analysis: Analogies & Similarities'
        }),
      });

      if (!metaResponse.ok) throw new Error('Failed to generate meta-map');
      const metaData = await metaResponse.json();
      
      setDualMapProgress(100);

      // Combine all three maps into comprehensive analysis
      const combinedAnalysis = `TWO-DOCUMENT MIND MAP ANALYSIS

==================== DOCUMENT A MIND MAP ====================
${documentA?.title || 'Document A'}

${dataA.cognitiveMap}

==================== DOCUMENT B MIND MAP ====================
${documentB?.title || 'Document B'}

${dataB.cognitiveMap}

==================== META-MAP: ANALOGIES & SIMILARITIES ====================
Cross-Document Analysis

${metaData.cognitiveMap}`;

      setCognitiveMapContent(combinedAnalysis);
      setDualMapStatus('Complete! Generated mind maps for both documents and meta-analysis.');
      
    } catch (error) {
      console.error('Dual mind map generation error:', error);
      toast({
        title: "Error generating dual mind map",
        description: "Failed to generate complete analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDualMap(false);
      setDualMapProgress(0);
      setDualMapStatus('');
    }
  };

  // Handle dual document podcast generation with specific protocol
  const handleDualDocumentPodcast = async (textA: string, textB: string) => {
    setIsGeneratingDualPodcast(true);
    setDualPodcastProgress(0);
    setShowPodcastModal(true);

    try {
      setDualPodcastStatus('Creating comparative podcast script...');
      setDualPodcastProgress(20);

      const podcastPrompt = `Create a comparative podcast episode analyzing two documents with the following exact structure:

DOCUMENT A (${documentA?.title || 'Document A'}):
${textA}

DOCUMENT B (${documentB?.title || 'Document B'}):
${textB}

Generate a podcast with exactly this format:

I. INTRO
- Welcome listeners and introduce the comparative analysis
- Briefly mention both documents being analyzed

II. SUMMARY OF DOCUMENT A
- Comprehensive summary of Document A's key points, arguments, and content

III. SUMMARY OF DOCUMENT B  
- Comprehensive summary of Document B's key points, arguments, and content

IV. SIMILARITIES BETWEEN THE TWO DOCUMENTS
Analyze similarities in respect of:
- Content (themes, topics, subject matter)
- Style (writing approach, tone, structure)
- Mentality (worldview, philosophical approach)
- Target-audience (intended readers, level of complexity)
- Author-agenda (goals, purposes, intentions)

V. DISSIMILARITIES BETWEEN THE TWO DOCUMENTS
Analyze differences in respect of:
- Content (contrasting themes, different topics)
- Style (different writing approaches, contrasting tones)
- Mentality (opposing worldviews, different philosophical approaches)
- Target-audience (different intended readers, varying complexity levels)
- Author-agenda (different goals, contrasting purposes)

VI. CONCLUSION
- Synthesize the comparative analysis
- Highlight the most significant insights from the comparison
- Provide final thoughts on the relationship between the documents

Keep the entire episode to exactly 3.5 minutes (450-500 words maximum). Make it engaging and informative.`;

      setDualPodcastProgress(40);

      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: podcastPrompt,
          provider: provider,
          type: 'dual-document-comparison',
          documentTitle: `Comparative Analysis: ${documentA?.title || 'Document A'} vs ${documentB?.title || 'Document B'}`
        }),
      });

      setDualPodcastProgress(80);

      if (!response.ok) {
        throw new Error(`Failed to generate dual podcast: ${response.statusText}`);
      }

      setDualPodcastProgress(100);
      setDualPodcastStatus('Dual-document podcast generated successfully!');

      // The response will be handled by the PodcastModal component
      
    } catch (error) {
      console.error('Dual podcast generation error:', error);
      toast({
        title: "Error generating dual podcast",
        description: "Failed to generate comparative podcast. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDualPodcast(false);
      setDualPodcastProgress(0);
      setDualPodcastStatus('');
    }
  };

  // Handle clearing all documents and chat
  const handleClearAll = () => {
    setDocumentA(null);
    setDocumentB(null);
    setMessages([]);
    setSessionId(null);
    setTextInputA('');
    setTextInputB('');
    setDocumentChunksA([]);
    setDocumentChunksB([]);
    setSelectedTextA('');
    setSelectedTextB('');
    setSelectedChunkA(0);
    setSelectedChunkB(0);
    
    toast({
      title: "Cleared all content",
      description: "Documents and chat history have been cleared.",
    });
  };

  // Handle sending chat messages
  const handleSendMessage = async () => {
    if (!message.trim() || !documentA || !documentB) return;
    
    const userMessage = message.trim();
    setMessage(''); // Clear input immediately
    
    try {
      const response = await fetch('/api/compare/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          documentAId: documentA.id,
          documentBId: documentB.id,
          provider: provider,
          sessionId: sessionId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Set session ID if it's a new session
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }
      
      // Add user message and AI response to messages
      const newUserMessage = {
        id: Date.now(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      
      const newAiMessage = {
        id: result.id || Date.now() + 1,
        role: result.role || 'assistant',
        content: result.content || 'No response received',
        timestamp: result.timestamp || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newUserMessage, newAiMessage]);
      
      toast({
        title: "Message sent",
        description: "AI response received successfully.",
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Restore the message if it failed
      setMessage(userMessage);
    }
  };

  // Document Column component - SUPPORTS BOTH FILE UPLOAD AND TEXT INPUT
  const DocumentColumn = ({  
    title, 
    document: doc, 
    isUploading, 
    column,
    dragActive,
    textInput,
    setTextInput,
    onFileUpload,
    onTextSubmit,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onTextSelection
  }: { 
    title: string; 
    document: Document | null; 
    isUploading: boolean; 
    column: 'A' | 'B';
    dragActive: boolean;
    textInput: string;
    setTextInput: (value: string) => void;
    onFileUpload: (file: File, column: 'A' | 'B') => void;
    onTextSubmit: (column: 'A' | 'B') => void;
    onDragEnter: (e: React.DragEvent, column: 'A' | 'B') => void;
    onDragLeave: (e: React.DragEvent, column: 'A' | 'B') => void;
    onDragOver: (e: React.DragEvent) => void;
    onTextSelection: (docTitle: string) => void;
  }) => {
    return (
    <div className="flex-1">
      <Card className="h-[1400px] flex flex-col overflow-hidden">
        <CardHeader className="py-0 px-2 h-8 min-h-0">
          <CardTitle className="flex items-center gap-1 text-xs">
            <FileText className="w-3 h-3" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-2" style={{ height: 'calc(100% - 32px)' }}>
          {!doc ? (
            <div className="flex-1 flex flex-col space-y-2">
              {/* File Upload Section */}
              <div className="flex-shrink-0">
                <div 
                  className={`flex items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
                    isUploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' :
                    dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 
                    'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragEnter={(e) => onDragEnter(e, column)}
                  onDragLeave={(e) => onDragLeave(e, column)}
                  onDragOver={onDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      onFileUpload(files[0], column);
                    }
                  }}
                  onClick={() => {
                    document.getElementById(`file-input-${column}`)?.click();
                  }}
                  style={{ minHeight: '100px' }}
                >
                  <input
                    id={`file-input-${column}`}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onFileUpload(e.target.files[0], column);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    className="hidden"
                  />
                  <div className="text-center">
                    {isUploading ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Uploading Document {column}...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className={`w-8 h-8 mx-auto ${
                          dragActive ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {dragActive ? `Drop file here` : `Upload Document ${column}`}
                        </p>
                        {!dragActive && (
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`file-input-${column}`)?.click();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                          >
                            Select File
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* OR Divider */}
              <div className="flex items-center justify-center py-2">
                <div className="border-t border-gray-300 flex-1"></div>
                <span className="px-3 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900">OR</span>
                <div className="border-t border-gray-300 flex-1"></div>
              </div>
              
              {/* Text Input Section */}
              <div className="flex-1 flex flex-col space-y-2">
                <Textarea
                  placeholder={`Type or paste your text for Document ${column} here...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 resize-none min-h-[400px]"
                  disabled={isUploading}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {textInput.length} characters • {textInput.trim().split(/\s+/).filter(word => word.length > 0).length} words
                  </p>
                  <Button 
                    onClick={() => onTextSubmit(column)} 
                    disabled={!textInput.trim() || isUploading}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <FileText className="w-4 h-4" />
                    Process Text
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-0">
              <div className="flex items-center justify-between mb-0 h-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">{doc.title}</h3>
                </div>
                <div className="flex gap-2 ml-4">
                  <div className="relative">
                    <input
                      id={`replace-${column}`}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onFileUpload(e.target.files[0], column);
                          e.target.value = ''; // Reset input
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => document.getElementById(`replace-${column}`)?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      {isUploading ? 'Uploading...' : 'Replace'}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (column === 'A') {
                        setDocumentA(null);
                      } else {
                        setDocumentB(null);
                      }
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded m-2 overflow-hidden">
                <DocumentViewerIframe 
                  content={doc.content}
                  onTextSelection={(selectedText: string) => {
                    setSelectedText(selectedText);
                    setSelectionDocument(`Document ${column}: ${doc.title}`);
                    setShowSelectionPopup(true);
                  }}
                />
              </div>
              
              {documentChunksA && column === 'A' && (
                <div className="mx-2 mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                    Large document chunked: {documentChunksA.chunkCount} sections, {documentChunksA.totalWordCount} words
                  </p>
                </div>
              )}
              
              {documentChunksB && column === 'B' && (
                <div className="mx-2 mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                    Large document chunked: {documentChunksB.chunkCount} sections, {documentChunksB.totalWordCount} words
                  </p>
                </div>
              )}
            </div>
          )}
          
          {showSelectionPopup && selectionDocument === title && (
            <TextSelectionHandler
              selectedText={selectedText}
              onStudyGuide={handleStudyGuide}
              onTestMe={handleTestMe}
              onPodcast={handlePodcast}
              onRewrite={handleRewrite}
              onCognitiveMap={handleCognitiveMap}
              onSummaryThesis={handleSummaryThesis}
              onThesisDeepDive={handleThesisDeepDive}
              onSuggestedReadings={handleSuggestedReadings}
              onClose={() => setShowSelectionPopup(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
    );
  };

  // Rest of the component implementation with handlers and return statement would go here
  // For now, return a simple placeholder to make the file compilable
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Living Book Creator - Document Comparison
          </h1>
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 border-red-300 dark:border-red-600"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 min-h-[900px] pb-32 overflow-visible">
          {/* Document A - Takes 2/6 */}
          <div className="lg:col-span-2">
            <DocumentColumn
              title="Document A"
              document={documentA}
              isUploading={isUploadingA}
              column="A"
              dragActive={dragActiveA}
              textInput={textInputA}
              setTextInput={setTextInputA}
              onFileUpload={handleFileUpload}
              onTextSubmit={handleTextSubmit}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onTextSelection={() => {}}
            />
          </div>
          
          {/* Document B - Takes 2/6 */}
          <div className="lg:col-span-2">
            <DocumentColumn
              title="Document B"
              document={documentB}
              isUploading={isUploadingB}
              column="B"
              dragActive={dragActiveB}
              textInput={textInputB}
              setTextInput={setTextInputB}
              onFileUpload={handleFileUpload}
              onTextSubmit={handleTextSubmit}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onTextSelection={() => {}}
            />
          </div>
          
          {/* Chat Column - Takes 2/6 */}
          <div className="lg:col-span-2">
            <Card className="h-[1400px] flex flex-col">
              <CardHeader className="py-0 px-2 h-8 min-h-0">
                <CardTitle className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    AI Chat & Functions
                  </div>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-20 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-2 space-y-2">
                {/* Multi-Document Functions */}
                {documentA && documentB && (
                  <div className="flex-shrink-0 space-y-2">
                    <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Both Documents:</h3>
                    <div className="grid grid-cols-2 gap-1">
                      <Button onClick={handleSynthesizeDocuments} size="sm" variant="outline" className="text-xs h-6">
                        Synthesize
                      </Button>
                      <Button onClick={handleDualPodcast} size="sm" variant="outline" className="text-xs h-6">
                        Podcast
                      </Button>
                      <Button onClick={handleDualCognitiveMap} size="sm" variant="outline" className="text-xs h-6">
                        Mind Map
                      </Button>
                      <Button onClick={handleDualRewrite} size="sm" variant="outline" className="text-xs h-6">
                        Combine
                      </Button>
                      <Button onClick={handleDualTestMe} size="sm" variant="outline" className="text-xs h-6">
                        Test Me
                      </Button>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2"></div>
                  </div>
                )}

                {/* Dual Text Selection Interface */}
                {documentA && documentB && (
                  <div className="flex-shrink-0 space-y-2">
                    <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Passages from Both Documents:</h3>
                    <DualTextSelectionInterface
                      documentA={documentA}
                      documentB={documentB}
                      chunksA={documentChunksA}
                      chunksB={documentChunksB}
                      selectedChunkA={selectedChunkA}
                      selectedChunkB={selectedChunkB}
                      selectedTextA={selectedTextA}
                      selectedTextB={selectedTextB}
                      onChunkAChange={setSelectedChunkA}
                      onChunkBChange={setSelectedChunkB}
                      onTextASelect={setSelectedTextA}
                      onTextBSelect={setSelectedTextB}
                      onDualAction={handleDualAction}
                    />
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2"></div>
                  </div>
                )}

                {/* Chat Messages Area */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded border overflow-y-auto p-2">
                  {!documentA && !documentB ? (
                    <p className="text-sm text-gray-500 text-center mt-8">
                      Upload or enter text for both documents to start chatting
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center mt-8">
                      Ask a question about your documents...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-2 rounded-lg relative group ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          }`}>
                            <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                            {/* Individual message download button */}
                            <Button
                              onClick={() => handleDownloadMessage(msg)}
                              size="sm"
                              variant="ghost"
                              className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-4 w-4 ${
                                msg.role === 'user' ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <Download className="w-2 h-2" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask about both documents..."
                      className="flex-1 min-h-[80px] resize-none"
                      disabled={!documentA || !documentB}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || !documentA || !documentB}
                        className="self-end"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={handleDownloadChat}
                        disabled={messages.length === 0}
                        variant="outline"
                        size="sm"
                        className="self-end"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {documentA && documentB 
                      ? "Press Enter to send, Shift+Enter for new line"
                      : "Upload both documents to enable chat"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Text Selection Popup */}
        {showSelectionPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-medium mb-2">Selected Text Functions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Source: {selectionDocument}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleStudyGuide} size="sm">Study Guide</Button>
                <Button onClick={handleTestMe} size="sm">Test Me</Button>
                <Button onClick={handlePodcast} size="sm">Podcast</Button>
                <Button onClick={handleRewrite} size="sm">Rewrite</Button>
                <Button onClick={handleCognitiveMap} size="sm">Cognitive Map</Button>
                <Button onClick={handleSummaryThesis} size="sm">Summary</Button>
                <Button onClick={handleThesisDeepDive} size="sm">Deep Dive</Button>
                <Button onClick={handleSuggestedReadings} size="sm">Readings</Button>
              </div>
              <Button 
                onClick={() => setShowSelectionPopup(false)} 
                variant="outline" 
                className="w-full mt-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* All Modals */}
        <StudyGuideModal
          isOpen={showStudyGuideModal}
          onClose={() => setShowStudyGuideModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <TestMeModal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <PodcastModal
          isOpen={showPodcastModal}
          onClose={() => setShowPodcastModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <RewriteModal
          isOpen={showRewriteModal}
          onClose={() => setShowRewriteModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <CognitiveMapModal
          isOpen={showCognitiveMapModal}
          onClose={() => setShowCognitiveMapModal(false)}
          content={cognitiveMapContent}
          selectedText={selectedText}
        />

        <SummaryThesisModal
          isOpen={showSummaryThesisModal}
          onClose={() => setShowSummaryThesisModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <ThesisDeepDiveModal
          isOpen={showThesisDeepDiveModal}
          onClose={() => setShowThesisDeepDiveModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <SuggestedReadingsModal
          isOpen={showSuggestedReadingsModal}
          onClose={() => setShowSuggestedReadingsModal(false)}
          content={selectedText}
          title={selectionDocument}
        />

        <SynthesizeDocumentsModal
          isOpen={showSynthesizeModal}
          onClose={() => setShowSynthesizeModal(false)}
          documentA={documentA}
          documentB={documentB}
        />

        <ProgressModal
          isOpen={isGeneratingDualMap}
          progress={dualMapProgress}
          status={dualMapStatus}
          title="Generating Two-Document Mind Map"
        />

        <ProgressModal
          isOpen={isGeneratingDualPodcast}
          progress={dualPodcastProgress}
          status={dualPodcastStatus}
          title="Generating Comparative Podcast"
        />
      </div>
    </div>
  );
}