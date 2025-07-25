import { useState, useRef } from 'react';
import { Settings, Info, Send, FileText, RotateCcw, Upload, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';
import DocumentViewer from '@/components/DocumentViewer';
import ChunkedDocumentViewer from '@/components/ChunkedDocumentViewer';
import ChatInterface from '@/components/ChatInterface';
import RewritePanel from '@/components/RewritePanel';
import TextSelectionPopup from '@/components/TextSelectionPopup';
import PodcastGenerator from '@/components/PodcastGenerator';
import TextSelectionHandler from '@/components/TextSelectionHandler';
// Import chunkDocument function - we'll implement a client-side version

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [documentChunks, setDocumentChunks] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [isRewritePanelOpen, setIsRewritePanelOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showPodcastGenerator, setShowPodcastGenerator] = useState(false);
  const [podcastSelectedText, setPodcastSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    mutationFn: async (messageContent: string) => {
      const endpoint = currentDocument 
        ? `/api/chat/${currentDocument.id}/message`
        : '/api/chat/message';
        
      const response = await apiRequest('POST', endpoint, {
        message: messageContent,
        provider: selectedProvider,
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
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">DocMath AI</h1>
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)] pb-32">
        {/* Left Side: Document Area */}
        <div className="flex-1 flex flex-col p-8">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
          
          <div className="flex-1">
            {currentDocument ? (
              <TextSelectionHandler
                onTextSelect={(text) => {
                  setPodcastSelectedText(text);
                  setShowPodcastGenerator(true);
                }}
                documentTitle={currentDocument?.originalName}
              >
                <DocumentViewer 
                  document={currentDocument}
                  isLoading={isUploading}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onRewriteClick={handleRewriteClick}
                  onFileDrop={handleFile}
                  onTextSelection={(text) => {
                    setSelectedText(text);
                    setShowSelectionPopup(true);
                  }}
                />
              </TextSelectionHandler>
            ) : (
              <Card className="h-full min-h-[500px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Document Content
                    </div>
                    <Button 
                      onClick={() => {
                        setPodcastSelectedText("Algorithm: A fixed procedure for carrying out a task. The rules that we learn in grade school to multiply, add, etc., multi-digit numbers are algorithms. By formalizing inferences, logicians create algorithms for determining whether, given two statements, one of them follows from the other.");
                        setShowPodcastGenerator(true);
                      }}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs px-3 py-1 flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      🎧 Test Podcast
                    </Button>
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

        {/* Right Side: AI Chat Messages */}
        <div className="w-[600px] border-l border-gray-200 flex flex-col">
          <ChatInterface 
            document={currentDocument} 
            showInputInline={false} 
            onMessageToDocument={handleMessageToDocument}
          />
        </div>
      </div>

      {/* Fixed Chat Input at Bottom of Screen */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg z-50">
        <div className="p-4">
          <div className="flex space-x-3 max-w-7xl mx-auto">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentDocument ? "Ask me anything about your document..." : "Ask me any question..."}
                className="w-full h-20 resize-none text-lg border-2 border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={sendMessageMutation.isPending}
                autoComplete="off"
                spellCheck="true"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
              <button 
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <Send className="w-5 h-5 mr-2" />
                {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rewrite Panel */}
      <RewritePanel
        document={currentDocument}
        isOpen={isRewritePanelOpen}
        onClose={handleCloseRewritePanel}
        onApplyChunkToDocument={(chunkIndex: number, newContent: string) => {
          if (documentChunks && currentDocument) {
            // Update the specific chunk in document chunks
            const updatedChunks = [...documentChunks.chunks];
            if (updatedChunks[chunkIndex]) {
              updatedChunks[chunkIndex] = {
                ...updatedChunks[chunkIndex],
                content: newContent,
                isModified: true
              };
              
              setDocumentChunks({
                ...documentChunks,
                chunks: updatedChunks
              });

              // Also update the main document content
              const reconstructedContent = updatedChunks.map(chunk => chunk.content).join('\n\n');
              setCurrentDocument({
                ...currentDocument,
                content: reconstructedContent
              });

              toast({
                title: "Document Updated",
                description: `Chunk ${chunkIndex + 1} has been applied to the main document.`,
              });
            }
          }
        }}
      />

      {/* Text Selection Popup */}
      <TextSelectionPopup
        isOpen={showSelectionPopup}
        onClose={() => setShowSelectionPopup(false)}
        selectedText={selectedText}
        documentTitle={currentDocument?.originalName || "Document"}
      />

      {/* Podcast Generator */}
      <PodcastGenerator
        isOpen={showPodcastGenerator}
        onClose={() => setShowPodcastGenerator(false)}
        selectedText={podcastSelectedText}
        documentTitle={currentDocument?.originalName || "Document"}
        isRegistered={false}
      />

      {/* Force Test Button for Debugging */}
      <div className="fixed bottom-20 right-4 z-[9999]">
        <Button
          onClick={() => {
            const testText = "Algorithm: A fixed procedure for carrying out a task. The rules that we learn in grade school to multiply, add, etc., multi-digit numbers are algorithms. By formalizing inferences, logicians create algorithms for determining whether, given two statements, one of them follows from the other.";
            console.log('🎙️ FORCE TEST - Triggering podcast with sample text');
            setPodcastSelectedText(testText);
            setShowPodcastGenerator(true);
          }}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
        >
          <Mic className="w-4 h-4 mr-2" />
          🎧 Force Test
        </Button>
      </div>

    </div>
  );
}
