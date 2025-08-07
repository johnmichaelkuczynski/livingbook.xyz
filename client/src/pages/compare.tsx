import { useState, useCallback, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, MessageSquare, Send, X, BookOpen, Download, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import KaTeXRenderer from "@/components/KaTeXRenderer";
import { downloadAIResponseAsWord } from "@/utils/wordGenerator";
import TextSelectionPopup from "@/components/TextSelectionPopup";

// Performance fix: Memoized document content to prevent re-renders during typing
const MemoizedDocumentContent = memo(function MemoizedDocumentContent({ 
  content, 
  onTextSelection 
}: { 
  content: string;
  onTextSelection: () => void;
}) {
  return (
    <div 
      className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100 leading-relaxed cursor-text select-text"
      onMouseUp={onTextSelection}
      onTouchEnd={onTextSelection}
    >
      <KaTeXRenderer content={content} />
    </div>
  );
});

// Using any type to match existing codebase pattern
type Document = any;

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  selected?: boolean;
}

interface ChunkPair {
  id: string;
  chunkA?: DocumentChunk;
  chunkB?: DocumentChunk;
  instructions: string;
  isRewriting?: boolean;
  rewrittenContent?: string;
}

const ComparePage = memo(function ComparePage() {
  const [documentA, setDocumentA] = useState<Document | null>(null);
  const [documentB, setDocumentB] = useState<Document | null>(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [provider, setProvider] = useState("deepseek");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [dragActiveA, setDragActiveA] = useState(false);
  const [dragActiveB, setDragActiveB] = useState(false);
  const [textInputA, setTextInputA] = useState('');
  const [textInputB, setTextInputB] = useState('');
  const [inputModeA, setInputModeA] = useState<'upload' | 'text'>('upload');
  const [inputModeB, setInputModeB] = useState<'upload' | 'text'>('upload');
  
  // Document chunking states for large documents
  const [documentChunksA, setDocumentChunksA] = useState<any>(null);
  const [documentChunksB, setDocumentChunksB] = useState<any>(null);
  
  // Text Selection State
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionDocument, setSelectionDocument] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Performance fix: Isolated message change handler
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  // Text selection handler
  const handleTextSelection = useCallback((docTitle: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      if (text.length > 10) { // Only show popup for meaningful selections
        setSelectedText(text);
        setSelectionDocument(docTitle);
        setShowSelectionPopup(true);
      }
    }
  }, []);

  // Fetch comparison messages for the session with aggressive caching to prevent re-renders
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/compare/messages", sessionId],
    enabled: !!sessionId,
    queryFn: () => fetch(`/api/compare/messages/${sessionId}`).then(res => res.json()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    notifyOnChangeProps: [],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; provider: string; documentAId?: number; documentBId?: number; sessionId?: number }) => {
      try {
        console.log('Sending comparison message:', messageData);
        const response = await fetch("/api/compare/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          throw new Error(`Failed to send message: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        return result;
      } catch (error) {
        console.error('Network/Parse Error:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/compare/messages", sessionId || data.sessionId] });
      setMessage("");
    },
    onError: (error: any) => {
      console.error('Send message mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Check console for details.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      message: message.trim(),
      provider,
      documentAId: documentA?.id,
      documentBId: documentB?.id,
      sessionId: sessionId || undefined,
    });
  }, [message, provider, documentA?.id, documentB?.id, sessionId, sendMessageMutation]);

  const handleFileUpload = async (file: File, column: 'A' | 'B') => {
    const setUploading = column === 'A' ? setIsUploadingA : setIsUploadingB;
    const setDocument = column === 'A' ? setDocumentA : setDocumentB;
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File size must be under 50MB. Current file: ${Math.round(file.size / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const document = await response.json();
      setDocument(document);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.name === 'AbortError') {
        toast({
          title: "Upload Timeout",
          description: `Upload took too long. Try with a smaller file or check your connection.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Error",
          description: `Failed to upload document ${column}: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

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

  const handleDrop = (e: React.DragEvent, column: 'A' | 'B') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveA(false);
    setDragActiveB(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], column);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, column: 'A' | 'B') => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0], column);
    }
  };

  const handleTextSubmit = async (column: 'A' | 'B') => {
    const textInput = column === 'A' ? textInputA : textInputB;
    
    if (!textInput.trim()) {
      toast({
        title: "Empty text",
        description: `Please enter some text for Document ${column} before submitting.`,
        variant: "destructive",
      });
      return;
    }

    if (column === 'A') {
      setIsUploadingA(true);
    } else {
      setIsUploadingB(true);
    }
    
    try {
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
      if (column === 'A') {
        setDocumentA(result);
        setTextInputA('');
      } else {
        setDocumentB(result);
        setTextInputB('');
      }
      
    } catch (error) {
      console.error('Text processing error:', error);
      toast({
        title: "Text processing failed",
        description: `There was an error processing your text for Document ${column}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      if (column === 'A') {
        setIsUploadingA(false);
      } else {
        setIsUploadingB(false);
      }
    }
  };

  // Performance fix: Aggressively memoized document column component
  const DocumentColumn = memo(({ 
    title, 
    document: doc, 
    isUploading, 
    column 
  }: { 
    title: string; 
    document: Document | null; 
    isUploading: boolean; 
    column: 'A' | 'B';
  }) => {
    const textInput = column === 'A' ? textInputA : textInputB;
    const setTextInput = column === 'A' ? setTextInputA : setTextInputB;
    const inputMode = column === 'A' ? inputModeA : inputModeB;
    const setInputMode = column === 'A' ? setInputModeA : setInputModeB;
    const dragActive = column === 'A' ? dragActiveA : dragActiveB;
    
    return (
    <div className="flex-1">
      <Card className="h-[800px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {!doc ? (
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
                  <input
                    id={`file-input-${column}`}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => handleFileSelect(e, column)}
                    className="hidden"
                  />
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer transition-colors w-full min-h-[250px] md:min-h-[300px] flex items-center justify-center touch-manipulation select-none ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onClick={() => document.getElementById(`file-input-${column}`)?.click()}
                    onDrop={(e) => handleDrop(e, column)}
                    onDragEnter={(e) => handleDragEnter(e, column)}
                    onDragLeave={(e) => handleDragLeave(e, column)}
                    onDragOver={handleDragOver}
                  >
                    {isUploading ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                        <p className="text-xs text-gray-500">Large files may take up to 2 minutes</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className={`w-12 h-12 mx-auto ${
                          dragActive ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          {dragActive ? `Drop Document ${column} here` : `Upload Document ${column}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dragActive ? 'Release to upload' : 'Drop a file here or click to browse'}
                        </p>
                        {!dragActive && (
                          <>
                            <p className="text-xs text-gray-400">Supports: PDF, DOCX, TXT</p>
                            <p className="text-xs text-gray-400">Max size: 50MB</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col space-y-4">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Enter or paste text for Document ${column} here...`}
                    className="flex-1 min-h-[300px] resize-none"
                    disabled={isUploading}
                  />
                  <Button
                    onClick={() => handleTextSubmit(column)}
                    disabled={!textInput.trim() || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Create Document {column}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {doc.originalName || `Document ${column}`}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {doc.content?.length ? `${Math.round(doc.content.length / 1000)}K chars` : 'Unknown size'}
                  </Badge>
                  {sessionId && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Chat history preserved when replacing documents
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <div className="relative">
                    <input
                      id={`replace-${column}`}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0], column);
                          e.target.value = '';
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
                      const setDocument = column === 'A' ? setDocumentA : setDocumentB;
                      setDocument(null);
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-4 h-[600px]">
                <MemoizedDocumentContent
                  content={doc.content || 'No content available'}
                  onTextSelection={() => handleTextSelection(`Document ${column}`)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-between mb-4">
            <a 
              href="mailto:contact@zhisystems.ai" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Contact Us
            </a>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Living Book Creator</h1>
            <div className="w-24"></div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload and Compare Documents with AI
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 min-h-[900px] pb-32">
          {/* Document A Column */}
          <div className="lg:col-span-2">
            <DocumentColumn 
              title="Document A" 
              document={documentA} 
              isUploading={isUploadingA} 
              column="A"
            />
          </div>

          {/* Chat Column */}
          <div className="lg:col-span-2">
            <Card className="h-[800px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  AI Comparison Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {!documentA && !documentB ? (
                  <div className="flex-1 flex items-center justify-center text-center">
                    <div className="space-y-3">
                      <BookOpen className="w-16 h-16 mx-auto text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Upload Documents to Start
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Upload at least one document to begin AI-powered analysis and comparison.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">Start a conversation to compare your documents</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="mb-4">
                          <div className={`p-3 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-blue-100 dark:bg-blue-900 ml-4' 
                              : 'bg-gray-100 dark:bg-gray-700 mr-4'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  {msg.role === 'user' ? 'You' : 'AI'}
                                </div>
                                <div className="text-sm text-gray-800 dark:text-gray-200">
                                  <KaTeXRenderer content={msg.content} />
                                </div>
                              </div>
                              {msg.role === 'assistant' && (
                                <div className="flex gap-1 ml-2">
                                  <a
                                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(msg.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'))}`}
                                    download={`response-${msg.id}.txt`}
                                    className="h-6 w-6 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600 inline-flex items-center justify-center rounded-md"
                                    title="Download as TXT"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                  <button
                                    onClick={() => downloadAIResponseAsWord(msg.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'), msg.id, 'Document Comparison Response')}
                                    className="h-6 w-6 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600 inline-flex items-center justify-center rounded-md"
                                    title="Download as Word"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document B Column */}
          <div className="lg:col-span-2">
            <DocumentColumn 
              title="Document B" 
              document={documentB} 
              isUploading={isUploadingB} 
              column="B"
            />
          </div>
        </div>

        {/* Fixed Chat Input at Bottom of Screen */}
        {(documentA || documentB) && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600 shadow-lg z-50">
            <div className="p-4">
              <div className="flex space-x-3 max-w-7xl mx-auto">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full h-20 resize-none text-lg border-2 border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    disabled={sendMessageMutation.isPending}
                    autoComplete="off"
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-gramm="false"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={sendMessageMutation.isPending}
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="perplexity">Perplexity</option>
                  </select>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="px-4 py-2 h-auto"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text Selection Popup */}
        <TextSelectionPopup
          isOpen={showSelectionPopup}
          onClose={() => setShowSelectionPopup(false)}
          selectedText={selectedText}
          documentTitle={selectionDocument}
        />
      </div>
    </div>
  );
});

export default ComparePage;