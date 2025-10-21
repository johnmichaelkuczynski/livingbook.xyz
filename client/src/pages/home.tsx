import { useState, useRef } from 'react';
import { Settings, Info, Send, FileText, RotateCcw, Upload, Mic, Volume2, FileEdit, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDialog } from '@/components/AuthDialog';
import { AddCreditsDialog } from '@/components/AddCreditsDialog';
import FileUpload from '@/components/FileUpload';
import SmartDocumentViewer from '@/components/SmartDocumentViewer';
import ChunkedDocumentViewer from '@/components/ChunkedDocumentViewer';
import ChatInterface from '@/components/ChatInterface';
import TextSelectionHandler from '@/components/TextSelectionHandler';
// Removed RewritePanel
// import TextSelectionPopup from '@/components/TextSelectionPopup'; // REMOVED
// Removed all text selection - just basic document viewing
import StudyGuideOutput from '@/components/StudyGuideOutput';
import SimpleStudyGuide from '@/components/SimpleStudyGuide';
import StudyGuideModal from '@/components/StudyGuideModal';
import TestMeModal from '@/components/TestMeModal';
import PodcastModal from '@/components/PodcastModal';
import RewriteModal from '@/components/RewriteModal';
import CognitiveMapModal from '@/components/CognitiveMapModal';
import SummaryThesisModal from '@/components/SummaryThesisModal';
import ThesisDeepDiveModal from '@/components/ThesisDeepDiveModal';
import SuggestedReadingsModal from '@/components/SuggestedReadingsModal';

import LoadingIndicator from '@/components/LoadingIndicator';
// Import chunkDocument function - we'll implement a client-side version

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [documentChunks, setDocumentChunks] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [isRewritePanelOpen, setIsRewritePanelOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  // const [showSelectionPopup, setShowSelectionPopup] = useState(false); // REMOVED
  const [selectedText, setSelectedText] = useState('');
  const [studyGuideContent, setStudyGuideContent] = useState('');
  const [showStudyGuide, setShowStudyGuide] = useState(false);
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const [isGeneratingStudyGuide, setIsGeneratingStudyGuide] = useState(false);

  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [podcastDialogue, setPodcastDialogue] = useState('');
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [podcastType, setPodcastType] = useState<'standard' | 'modern'>('standard');
  const [cognitiveMapContent, setCognitiveMapContent] = useState('');
  const [showCognitiveMap, setShowCognitiveMap] = useState(false);
  const [isGeneratingCognitiveMap, setIsGeneratingCognitiveMap] = useState(false);
  const [summaryThesisContent, setSummaryThesisContent] = useState('');
  const [showSummaryThesis, setShowSummaryThesis] = useState(false);
  const [isGeneratingSummaryThesis, setIsGeneratingSummaryThesis] = useState(false);
  const [thesisDeepDiveContent, setThesisDeepDiveContent] = useState('');
  const [showThesisDeepDive, setShowThesisDeepDive] = useState(false);
  const [isGeneratingThesisDeepDive, setIsGeneratingThesisDeepDive] = useState(false);
  const [suggestedReadingsContent, setSuggestedReadingsContent] = useState('');
  const [showSuggestedReadings, setShowSuggestedReadings] = useState(false);
  const [isGeneratingSuggestedReadings, setIsGeneratingSuggestedReadings] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout, updateCredits } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);

  // Simple client-side chunking function
  const chunkDocumentClient = (content: string, maxWords: number = 10000) => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const totalWordCount = words.length;
    
    if (totalWordCount <= maxWords) {
      return {
        originalContent: content,
        chunks: [{
          id: `chunk-0`,
          chunkIndex: 0,
          content: content.trim(),
          wordCount: totalWordCount,
          isModified: false,
          isEditing: false
        }],
        totalWordCount,
        chunkCount: 1
      };
    }
    
    const chunks = [];
    let chunkIndex = 0;
    
    for (let i = 0; i < words.length; i += maxWords) {
      const chunkWords = words.slice(i, i + maxWords);
      const chunkContent = chunkWords.join(' ');
      
      chunks.push({
        id: `chunk-${chunkIndex}`,
        chunkIndex,
        content: chunkContent,
        wordCount: chunkWords.length,
        isModified: false,
        isEditing: false
      });
      
      chunkIndex++;
    }
    
    return {
      originalContent: content,
      chunks,
      totalWordCount,
      chunkCount: chunks.length
    };
  };

  const handleFileUploaded = (document: any) => {
    setCurrentDocument(document);
    
    // Prepare chunks ONLY for rewrite functionality (not for display)
    if (document && document.content) {
      const wordCount = document.content.split(/\s+/).filter((word: string) => word.length > 0).length;
      if (wordCount > 1000) {
        // Chunk the document ONLY for rewrite functionality
        const chunkedDoc = chunkDocumentClient(document.content, 1000);
        setDocumentChunks(chunkedDoc);
      } else {
        setDocumentChunks(null);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      toast({
        title: "Empty text",
        description: "Please enter some text before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Send text to backend for processing
      const response = await fetch('/api/documents/create-from-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textInput.trim(),
          title: `Text Input (${new Date().toLocaleTimeString()})`
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Text processing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      handleFileUploaded(result);
      setTextInput('');
      
      toast({
        title: "Text processed successfully",
        description: "Your text is ready for analysis.",
      });
      
    } catch (error) {
      console.error('Text processing error:', error);
      toast({
        title: "Text processing failed",
        description: "There was an error processing your text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF, Word document, or text file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
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
      handleFileUploaded(result);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; selectedText: string }) => {
      const endpoint = currentDocument 
        ? `/api/chat/${currentDocument.id}/message`
        : '/api/chat/message';
      
      console.log('🔍 MUTATION - Sending to server:', {
        message: messageData.content,
        selectedText: messageData.selectedText ? `"${messageData.selectedText.substring(0, 100)}..."` : 'null'
      });
        
      const response = await apiRequest('POST', endpoint, {
        message: messageData.content,
        provider: selectedProvider,
        selectedText: messageData.selectedText || null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (currentDocument) {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/' + currentDocument.id + '/messages'] });
      } else {
        // Handle response for non-document chats
        toast({
          title: "AI Response",
          description: data.message,
        });
      }
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      
      let errorTitle = "Error sending message";
      let errorDescription = "Failed to send message. Please try again.";
      
      if (error.message?.includes("Document not found")) {
        errorTitle = "Document not found";
        errorDescription = "The document you're trying to chat with no longer exists. Please refresh the page and upload your document again.";
        // Clear the current document to prevent further errors
        setCurrentDocument(null);
        setDocumentChunks(null);
      } else if (error.message?.includes("Invalid document ID")) {
        errorTitle = "Invalid document";
        errorDescription = "There's an issue with the document. Please refresh the page and try again.";
        setCurrentDocument(null);
        setDocumentChunks(null);
      } else {
        errorDescription = error.message || errorDescription;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Check if we have a current document and it's valid
    if (currentDocument && (!currentDocument.id || isNaN(currentDocument.id))) {
      toast({
        title: "Invalid document",
        description: "There's an issue with the current document. Please refresh the page and upload your document again.",
        variant: "destructive",
      });
      setCurrentDocument(null);
      setDocumentChunks(null);
      return;
    }
    
    // Capture selected text at the moment of sending
    const currentSelectedText = selectedText;
    console.log('🔍 SENDING MESSAGE WITH SELECTED TEXT:', currentSelectedText ? `"${currentSelectedText.substring(0, 100)}..."` : 'null');
    console.log('🔍 FULL SELECTED TEXT LENGTH:', currentSelectedText ? currentSelectedText.length : 0);
    console.log('🔍 CURRENT DOCUMENT ID:', currentDocument?.id);
    
    // Store the selected text to be used in the mutation
    const messageData = {
      content: message.trim(),
      selectedText: currentSelectedText
    };
    
    sendMessageMutation.mutate(messageData);
    // Clear message and selected text after sending
    setMessage('');
    setSelectedText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRewriteClick = () => {
    setIsRewritePanelOpen(true);
  };

  const handleCloseRewritePanel = () => {
    setIsRewritePanelOpen(false);
  };

  const handleStartFresh = () => {
    setCurrentDocument(null);
    setDocumentChunks(null);
    setMessage('');
    queryClient.clear();
    toast({
      title: "Fresh start",
      description: "All documents and conversation history cleared.",
    });
  };

  // Mutation to create document from AI message
  const createDocumentMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const response = await apiRequest('POST', '/api/documents/create-from-text', {
        title,
        content
      });
      return response.json();
    },
    onSuccess: (document: any) => {
      setCurrentDocument(document);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document created",
        description: `"${document.originalName}" is now available for analysis and rewriting.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create document",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleMessageToDocument = (content: string, title: string) => {
    createDocumentMutation.mutate({ title, content });
  };

  // Bottom toolbar handlers
  const handleStudyGuide = async (text?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToUse = text || selectedText || currentDocument?.content || '';
    console.log('🎯 HANDLE STUDY GUIDE - Called with text:', textToUse.substring(0, 100) + '...');
    
    if (!textToUse.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (isProcessingSelection) {
      console.log('❌ Already processing selection, skipping...');
      return;
    }

    console.log('🎯 Starting Study Guide generation process...');
    
    // Clear previous content and show modal immediately
    setStudyGuideContent('');
    setIsProcessingSelection(true);
    setIsGeneratingStudyGuide(true);
    setShowStudyGuideModal(true); // Open modal immediately with loading state
    
    console.log('🎯 Modal state set - showStudyGuideModal:', true, 'isGeneratingStudyGuide:', true);

    try {
      const response = await fetch('/api/study-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToUse,
          documentTitle: currentDocument?.originalName || 'Document',
          provider: selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate study guide: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Study guide received:', data.studyGuide);
      setStudyGuideContent(data.studyGuide);
      // Keep modal open - it's already open from earlier setShowStudyGuideModal(true)
      console.log('Study guide content loaded:', data.studyGuide.length, 'characters');

      toast({
        title: "Study Guide Generated",
        description: "Your personalized study guide is ready!",
      });

    } catch (error) {
      console.error('Study guide generation error:', error);
      toast({
        title: "Failed to generate study guide",
        description: "Please try again with a different text selection.",
        variant: "destructive",
      });
      setShowStudyGuideModal(false); // Close modal on error
    } finally {
      setIsGeneratingStudyGuide(false);
      setIsProcessingSelection(false);
    }
  };

  const handleTestMe = async (text?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToUse = text || selectedText || currentDocument?.content || '';
    if (!textToUse?.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    if (isProcessingSelection) {
      return;
    }

    // Update selectedText state so the modal can use it
    setSelectedText(textToUse);
    setIsGeneratingTest(true);
    setShowTestModal(true);
    
    try {
      // Modal will handle the generation process
    } catch (error) {
      console.error('Test generation error:', error);
      toast({
        title: "Error",
        description: "Failed to prepare test generation.",
        variant: "destructive",
      });
      setShowTestModal(false);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handlePodcast = async (type: 'standard' | 'modern', text?: string) => {
    const textToUse = text || selectedText;
    
    if (!textToUse.trim()) {
      toast({
        title: "No text selected",
        description: "Please select some text first.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (isProcessingSelection) {
      return;
    }

    setIsProcessingSelection(true);

    try {
      const podcastType = type === 'standard' ? 'Standard Summary Dialogue' : 'Modern Reconstruction (5 min)';
      
      toast({
        title: "Generating Podcast",
        description: `Creating ${podcastType} audio...`,
      });

      const prompt = type === 'standard' 
        ? `Create a podcast-style dialogue between two speakers discussing the ideas in the selected passage. One speaker should summarize the main points; the other should ask clarifying or challenging questions. Keep the tone intelligent, focused, and conversational.

IMPORTANT: Keep the total dialogue to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Selected passage:
"""
${textToUse}
"""

Format the response as alternating speakers:
Speaker 1: [dialogue]
Speaker 2: [dialogue]
Speaker 1: [dialogue]
...`
        : `Create a podcast-style dialogue between two speakers. One speaker reconstructs the author's position based on the selected text; the other evaluates or updates that position using modern cognitive science, philosophy of mind, or adjacent fields. Avoid fluff. Focus on structure, function, and explanatory power.

IMPORTANT: Keep the total dialogue to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Selected passage:
"""
${textToUse}
"""

Format the response as alternating speakers:
Speaker 1: [dialogue]
Speaker 2: [dialogue]
Speaker 1: [dialogue]
...`;

      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToUse,
          documentTitle: currentDocument?.originalName || 'Document',
          provider: selectedProvider,
          type: type,
          prompt: prompt,
          voiceOptions: {
            speaker1: 'en-US-DavisNeural',
            speaker2: 'en-US-JennyNeural'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate podcast: ${response.statusText}`);
      }

      // Download the MP3 file directly
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcast-${type}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Podcast Generated",
        description: `${podcastType} MP3 downloaded successfully!`,
      });

    } catch (error) {
      console.error('Podcast generation error:', error);
      toast({
        title: "Failed to generate podcast",
        description: "Please try again with a different text selection.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingSelection(false);
    }
  };

  const handleCognitiveMap = async (text?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToAnalyze = text || selectedText || currentDocument?.content || '';
    if (!textToAnalyze.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🧠 COGNITIVE MAP CLICKED - Text length:', textToAnalyze.length);
    console.log('🧠 Starting Cognitive Map generation process...');
    
    setIsGeneratingCognitiveMap(true);
    setShowCognitiveMap(true);
    setCognitiveMapContent('');
    console.log('🧠 Modal state set - showCognitiveMap:', true, 'isGeneratingCognitiveMap:', true);
    
    try {
      const response = await fetch('/api/generate-cognitive-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToAnalyze,
          provider: selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate cognitive map: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Cognitive map received:', data.cognitiveMap);
      setCognitiveMapContent(data.cognitiveMap);
      console.log('Cognitive map content loaded:', data.cognitiveMap.length, 'characters');
      
    } catch (error) {
      console.error('Cognitive map generation error:', error);
      toast({
        title: "Error generating cognitive map",
        description: "Failed to generate cognitive map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCognitiveMap(false);
    }
  };

  const handleSummaryThesis = async (text?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToUse = text || selectedText || currentDocument?.content || '';
    if (!textToUse.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (isProcessingSelection) {
      return;
    }

    // Update selectedText state
    setSelectedText(textToUse);
    
    // Clear previous content and show modal immediately
    setSummaryThesisContent('');
    setIsProcessingSelection(true);
    setIsGeneratingSummaryThesis(true);
    setShowSummaryThesis(true); // Open modal immediately with loading state

    try {
      const response = await fetch('/api/summary-thesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToUse,
          provider: selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary+thesis: ${response.statusText}`);
      }

      const data = await response.json();
      setSummaryThesisContent(data.summaryThesis);
      
      toast({
        title: "Summary & Thesis Generated",
        description: "Your structured analysis is ready!",
      });
      
    } catch (error) {
      console.error('Summary+Thesis generation error:', error);
      toast({
        title: "Error generating summary+thesis",
        description: "Failed to generate analysis. Please try again.",
        variant: "destructive",
      });
      setShowSummaryThesis(false); // Close modal on error
    } finally {
      setIsGeneratingSummaryThesis(false);
      setIsProcessingSelection(false);
    }
  };

  const handleThesisDeepDive = async (text?: string, comparisonTarget?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToUse = text || selectedText || currentDocument?.content || '';
    if (!textToUse.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (isProcessingSelection) {
      return;
    }

    // Update selectedText state
    setSelectedText(textToUse);
    
    // Clear previous content and show modal immediately
    setThesisDeepDiveContent('');
    setIsProcessingSelection(true);
    setIsGeneratingThesisDeepDive(true);
    setShowThesisDeepDive(true); // Open modal immediately with loading state

    try {
      const response = await fetch('/api/generate-thesis-deep-dive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToUse,
          provider: selectedProvider,
          comparisonTarget: comparisonTarget
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate thesis deep-dive: ${response.statusText}`);
      }

      const data = await response.json();
      setThesisDeepDiveContent(data.thesisDeepDive);
      
      toast({
        title: "Thesis Deep-Dive Generated",
        description: comparisonTarget 
          ? `Comprehensive analysis with ${comparisonTarget} comparison ready!`
          : "Comprehensive thesis analysis ready!",
      });
      
    } catch (error) {
      console.error('Thesis Deep-Dive generation error:', error);
      toast({
        title: "Error generating thesis deep-dive",
        description: "Failed to generate analysis. Please try again.",
        variant: "destructive",
      });
      setShowThesisDeepDive(false); // Close modal on error
    } finally {
      setIsGeneratingThesisDeepDive(false);
      setIsProcessingSelection(false);
    }
  };

  const handleSuggestedReadings = async (text?: string) => {
    // Use passed text, or selected text, or entire document content
    const textToAnalyze = text || selectedText || currentDocument?.content || '';
    if (!textToAnalyze.trim()) {
      toast({
        title: "No document content",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    console.log('📚 SUGGESTED READINGS CLICKED - Text length:', textToAnalyze.length);
    console.log('📚 HANDLE SUGGESTED READINGS - Called with text:', textToAnalyze.slice(0, 100) + '...');
    console.log('📚 Starting Suggested Readings generation process...');

    // Prevent multiple simultaneous requests
    if (isProcessingSelection) {
      return;
    }

    // Clear previous content and show modal immediately
    setSuggestedReadingsContent('');
    setIsProcessingSelection(true);
    setIsGeneratingSuggestedReadings(true);
    setShowSuggestedReadings(true); // Open modal immediately with loading state
    console.log('📚 Modal state set - showSuggestedReadings:', true, 'isGeneratingSuggestedReadings:', true);

    try {
      const response = await fetch('/api/generate-suggested-readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: textToAnalyze,
          provider: selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate suggested readings: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Suggested readings received:', data.suggestedReadings);
      setSuggestedReadingsContent(data.suggestedReadings);
      console.log('Suggested readings content loaded:', data.suggestedReadings.length, 'characters');
      
      toast({
        title: "Suggested Readings Generated",
        description: "Relevant academic works ready for review!",
      });
      
    } catch (error) {
      console.error('Suggested Readings generation error:', error);
      toast({
        title: "Error generating suggested readings",
        description: "Failed to generate reading list. Please try again.",
        variant: "destructive",
      });
      setShowSuggestedReadings(false); // Close modal on error
    } finally {
      setIsGeneratingSuggestedReadings(false);
      setIsProcessingSelection(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a 
              href="mailto:contact@zhisystems.ai"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Contact Us
            </a>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Living Book Creator</h1>
                <p className="text-xs text-gray-500">Document Processing & AI Assistant</p>
              </div>

            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/compare'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
                Compare Docs
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/formatter'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Formatter
              </Button>
              {currentDocument && (
                <Button 
                  variant="outline" 
                  onClick={handleStartFresh}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Start Fresh
                </Button>
              )}
              <Button 
                variant="default" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90"
              >
                <FileText className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
              <Button variant="ghost" size="sm">
                <Info className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
              {user ? (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCreditsDialog(true)}
                    data-testid="button-add-credits"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    + Add Credits
                  </Button>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">{user.username}</span>
                    <span className="text-xs font-semibold text-blue-600" data-testid="text-credits">
                      {user.credits.toLocaleString()} credits
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAuthDialog(true)}
                  data-testid="button-open-auth"
                >
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <AddCreditsDialog 
        open={showAddCreditsDialog} 
        onOpenChange={setShowAddCreditsDialog}
        onCreditsAdded={updateCredits}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6 pb-32">
        {/* Document Area - Full Width */}
        <div className="flex flex-col p-8">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
          
          <div className="flex-1 relative" style={{ minHeight: '600px', maxHeight: '80vh' }}>
            {currentDocument ? (
              <div className="h-full">
                <TextSelectionHandler
                  onDiscuss={(text) => {
                    // Set the selected text and prepare message
                    setSelectedText(text);
                    const discussMessage = `Discuss this with me: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`;
                    
                    // Scroll to chat section
                    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Send the message automatically after a brief delay
                    setTimeout(() => {
                      const messageData = {
                        content: discussMessage,
                        selectedText: text
                      };
                      sendMessageMutation.mutate(messageData);
                    }, 300);
                  }}
                  onRewrite={() => setShowRewriteModal(true)}
                  onStudyGuide={handleStudyGuide}
                  onTestMe={handleTestMe}
                  onPodcast={() => setShowPodcastModal(true)}
                  onCognitiveMap={handleCognitiveMap}
                  onSummaryThesis={handleSummaryThesis}
                  onThesisDeepDive={handleThesisDeepDive}
                  onSuggestedReadings={handleSuggestedReadings}
                >
                  <SmartDocumentViewer 
                    content={currentDocument.content}
                    onTextSelection={(text) => {
                      setSelectedText(text);
                      console.log('Text selected:', text.substring(0, 100) + '...');
                    }}
                  />
                </TextSelectionHandler>
              </div>
            ) : (
              <Card className="h-full min-h-[500px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Document Content
                    </div>

                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Tabs 
                    value={inputMode} 
                    onValueChange={(value) => setInputMode(value as 'upload' | 'text')}
                    className="flex-1 flex flex-col"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="upload" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="text" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Enter Text
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="flex-1 flex items-center justify-center">
                      <div className="w-full h-full flex items-center justify-center">
                        <div
                          className="border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer transition-colors w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 touch-manipulation select-none"
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = Array.from(e.dataTransfer.files);
                            if (files.length > 0) {
                              handleFile(files[0]);
                            }
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {isUploading ? (
                            <div className="space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                              <p className="text-xs text-gray-500">Large files may take up to 2 minutes</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Upload className="w-12 h-12 mx-auto text-gray-400" />
                              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Click or drag to upload a document
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload a PDF, Word document, or text file to view its content with properly rendered mathematical notation.
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Supports PDF, Word, and TXT files
                              </p>
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 touch-manipulation"
                              >
                                Select File
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="text" className="flex-1 flex flex-col space-y-4">
                      <Textarea
                        placeholder="Type or paste your text here..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="flex-1 min-h-[350px] resize-vertical"
                        disabled={isUploading}
                        style={{
                          pointerEvents: 'auto',
                          userSelect: 'text',
                          WebkitUserSelect: 'text',
                          MozUserSelect: 'text',
                          msUserSelect: 'text',
                          position: 'relative',
                          zIndex: 100,
                          backgroundColor: 'white',
                          touchAction: 'manipulation'
                        }}
                        autoComplete="off"
                        spellCheck="true"
                        tabIndex={0}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {textInput.length} characters • {textInput.trim().split(/\s+/).filter(word => word.length > 0).length} words
                        </p>
                        <Button 
                          onClick={handleTextSubmit} 
                          disabled={!textInput.trim() || isUploading}
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Process Text
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        
        {/* Chat Interface - Below Document */}
        <div className="mt-6" ref={chatSectionRef}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Chat
                </div>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">ZHI 1</SelectItem>
                    <SelectItem value="anthropic">ZHI 2</SelectItem>
                    <SelectItem value="deepseek">ZHI 3</SelectItem>
                    <SelectItem value="perplexity">ZHI 4</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChatInterface 
                document={currentDocument} 
                showInputInline={false} 
                onMessageToDocument={handleMessageToDocument}
              />
              
              {/* Chat Input Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedText 
                          ? "Ask about the selected text..." 
                          : currentDocument 
                            ? "Ask me anything about your document..." 
                            : "Ask me any question..."
                      }
                      className={`w-full h-20 resize-none text-lg ${selectedText ? 'border-green-500 bg-green-50' : ''}`}
                      disabled={sendMessageMutation.isPending}
                      style={{
                        pointerEvents: 'auto',
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text',
                        msUserSelect: 'text',
                        position: 'relative',
                        zIndex: 100,
                        backgroundColor: selectedText ? '#f0f9ff' : 'white',
                        touchAction: 'manipulation'
                      }}
                      autoComplete="off"
                      spellCheck="true"
                      tabIndex={0}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="px-6 py-3 h-20"
                      type="button"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Podcast Modal */}
      <PodcastModal
        isOpen={showPodcastModal}
        onClose={() => setShowPodcastModal(false)}
        document={currentDocument}
        selectedText={selectedText}
      />

      {/* Rewrite Modal */}
      <RewriteModal
        isOpen={showRewriteModal}
        onClose={() => setShowRewriteModal(false)}
        document={currentDocument}
        selectedText={selectedText}
      />

      {/* Study Guide Modal */}
      <StudyGuideModal
        isOpen={showStudyGuideModal}
        onClose={() => setShowStudyGuideModal(false)}
        content={studyGuideContent}
        isLoading={isGeneratingStudyGuide}
      />

      {/* Test Me Modal */}
      <TestMeModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        selectedText={selectedText}
        isGenerating={isGeneratingTest}
      />

      {/* Cognitive Map Modal */}
      <CognitiveMapModal
        isOpen={showCognitiveMap}
        onClose={() => setShowCognitiveMap(false)}
        content={cognitiveMapContent}
        isLoading={isGeneratingCognitiveMap}
        selectedText={selectedText}
      />

      {/* Summary+Thesis Modal */}
      <SummaryThesisModal
        isOpen={showSummaryThesis}
        onClose={() => setShowSummaryThesis(false)}
        selectedText={selectedText}
      />

      {/* Thesis Deep-Dive Modal */}
      <ThesisDeepDiveModal
        isOpen={showThesisDeepDive}
        onClose={() => setShowThesisDeepDive(false)}
        selectedText={selectedText}
        content={thesisDeepDiveContent}
        isLoading={isGeneratingThesisDeepDive}
        onRegenerate={handleThesisDeepDive}
      />

      {/* Suggested Readings Modal */}
      <SuggestedReadingsModal
        isOpen={showSuggestedReadings}
        onClose={() => setShowSuggestedReadings(false)}
        content={suggestedReadingsContent}
        isLoading={isGeneratingSuggestedReadings}
        selectedText={selectedText}
      />



    </div>
  );
}
