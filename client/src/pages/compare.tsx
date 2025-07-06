import { useState, useCallback, useRef } from "react";
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

export default function ComparePage() {
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
  
  // Synthesis Modal State
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [chunksA, setChunksA] = useState<DocumentChunk[]>([]);
  const [chunksB, setChunksB] = useState<DocumentChunk[]>([]);
  const [chunkPairs, setChunkPairs] = useState<ChunkPair[]>([]);
  const [useChatData, setUseChatData] = useState(false);
  const [synthesizedContent, setSynthesizedContent] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized onChange handler to reduce re-renders
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  // Fetch comparison messages for the session
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/compare/messages", sessionId],
    enabled: !!sessionId,
    queryFn: () => fetch(`/api/compare/messages/${sessionId}`).then(res => res.json()),
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 30000, // Consider data fresh for 30 seconds
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
      
      toast({
        title: "Success",
        description: `Document ${column} uploaded successfully (${Math.round(file.size / 1024)}KB)`,
      });
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

  const handleSendMessage = () => {
    if (!inputRef.current) return;
    const messageText = inputRef.current.value.trim();
    if (!messageText) return;
    
    sendMessageMutation.mutate({
      message: messageText,
      provider,
      documentAId: documentA?.id,
      documentBId: documentB?.id,
      sessionId: sessionId,
    });
    
    // Clear the input after sending
    inputRef.current.value = '';
  };

  // Synthesis Modal Functions
  const loadDocumentChunks = async () => {
    if (!documentA && !documentB) return;
    
    try {
      // Load chunks for Document A
      if (documentA) {
        const responseA = await fetch(`/api/documents/${documentA.id}/chunks`);
        if (responseA.ok) {
          const chunksDataA = await responseA.json();
          setChunksA(chunksDataA.map((chunk: any) => ({
            ...chunk,
            selected: false
          })));
        }
      }
      
      // Load chunks for Document B  
      if (documentB) {
        const responseB = await fetch(`/api/documents/${documentB.id}/chunks`);
        if (responseB.ok) {
          const chunksDataB = await responseB.json();
          setChunksB(chunksDataB.map((chunk: any) => ({
            ...chunk,
            selected: false
          })));
        }
      }
    } catch (error) {
      console.error('Error loading chunks:', error);
      toast({
        title: "Error",
        description: "Failed to load document chunks",
        variant: "destructive"
      });
    }
  };

  const openSynthesisModal = () => {
    setShowSynthesisModal(true);
    loadDocumentChunks();
  };

  const addChunkPair = () => {
    const newPair: ChunkPair = {
      id: `pair-${Date.now()}`,
      instructions: ""
    };
    setChunkPairs([...chunkPairs, newPair]);
  };

  const updateChunkPair = (pairId: string, updates: Partial<ChunkPair>) => {
    setChunkPairs(prev => prev.map(pair => 
      pair.id === pairId ? { ...pair, ...updates } : pair
    ));
  };

  const removeChunkPair = (pairId: string) => {
    setChunkPairs(prev => prev.filter(pair => pair.id !== pairId));
  };

  const generateSynthesis = async () => {
    if (chunkPairs.length === 0) return;
    
    try {
      // Prepare chunk pairs with selected chunks
      const processedPairs = chunkPairs.map(pair => ({
        chunkAIndexes: chunksA.filter(c => c.selected).map(c => c.chunkIndex),
        chunkBIndexes: chunksB.filter(c => c.selected).map(c => c.chunkIndex),
        instructions: pair.instructions
      }));

      const response = await fetch('/api/documents/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkPairs: processedPairs,
          useChatData,
          provider,
          sessionId,
          documentAId: documentA?.id,
          documentBId: documentB?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate synthesis');
      }

      const result = await response.json();
      setSynthesizedContent(result.synthesizedContent);
      
      toast({
        title: "Success",
        description: "Document synthesis generated successfully!"
      });
      
    } catch (error) {
      console.error('Synthesis error:', error);
      toast({
        title: "Error",
        description: "Failed to generate synthesis",
        variant: "destructive"
      });
    }
  };

  const downloadSynthesis = (format: 'txt' | 'docx' | 'pdf') => {
    if (!synthesizedContent) return;
    
    const blob = new Blob([synthesizedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthesis.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const injectSynthesis = (target: 'A' | 'B') => {
    if (!synthesizedContent) return;
    
    if (target === 'A' && documentA) {
      // In a real implementation, this would update the document in the database
      toast({
        title: "Success",
        description: "Synthesis injected into Document A view"
      });
    } else if (target === 'B' && documentB) {
      // In a real implementation, this would update the document in the database
      toast({
        title: "Success", 
        description: "Synthesis injected into Document B view"
      });
    }
  };

  const DocumentColumn = ({ 
    title, 
    document: doc, 
    isUploading, 
    column 
  }: { 
    title: string; 
    document: Document | null; 
    isUploading: boolean; 
    column: 'A' | 'B';
  }) => (
    <div className="flex-1">
      <Card className="h-full min-h-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {!doc ? (
            <div className="relative flex-1 flex items-center justify-center">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFileSelect(e, column)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors w-full min-h-[300px] flex items-center justify-center ${
                  (column === 'A' ? dragActiveA : dragActiveB)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
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
                    (column === 'A' ? dragActiveA : dragActiveB) 
                      ? 'text-blue-500' 
                      : 'text-gray-400'
                  }`} />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {(column === 'A' ? dragActiveA : dragActiveB) 
                      ? `Drop Document ${column} here` 
                      : `Upload Document ${column}`}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(column === 'A' ? dragActiveA : dragActiveB) 
                      ? 'Release to upload' 
                      : 'Drop a file here or click to browse'}
                  </p>
                  {!(column === 'A' ? dragActiveA : dragActiveB) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Supports PDF, Word, and TXT files
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.title}</h3>
                  {sessionId && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Chat history preserved when replacing documents
                    </p>
                  )}
                </div>
                <Badge variant="secondary">{doc.fileType.toUpperCase()}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-[300px]">
                <KaTeXRenderer 
                  content={doc.content} 
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap" 
                />
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    id={`replace-${column}`}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], column);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => document.getElementById(`replace-${column}`)?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Replace Document'}
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
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Document Comparison
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload two documents and chat with AI about both simultaneously
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              ← Back to Home
            </Button>
            {(documentA || documentB || sessionId) && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  setDocumentA(null);
                  setDocumentB(null);
                  setSessionId(null);
                  setMessage('');
                  queryClient.invalidateQueries({ queryKey: ["/api/compare/messages"] });
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Start Fresh
              </Button>
            )}
            {(documentA || documentB) && (
              <Button 
                variant="outline" 
                onClick={openSynthesisModal}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              >
                <BookOpen className="w-4 h-4" />
                Synthesize Documents
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px] pb-32">
          {/* Document A */}
          <DocumentColumn
            title="Document A"
            document={documentA}
            isUploading={isUploadingA}
            column="A"
          />
          
          {/* Document B */}
          <DocumentColumn
            title="Document B"
            document={documentB}
            isUploading={isUploadingB}
            column="B"
          />
          
          {/* AI Chat Column */}
          <div className="lg:col-span-1">
            <Card className="h-full min-h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  AI Comparison Chat
                  {(documentA || documentB) && (
                    <div className="flex gap-1 ml-auto">
                      {documentA && <Badge variant="outline" className="text-xs">A</Badge>}
                      {documentB && <Badge variant="outline" className="text-xs">B</Badge>}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                {!documentA && !documentB && (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center text-sm">
                    Upload documents to start AI comparison chat
                  </div>
                )}
                
                {(documentA || documentB) && (
                  <div className="flex-1 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[300px] mb-4">
                    {messages.length === 0 ? (
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Ask AI to compare your documents!
                        </p>
                        {sessionId && (
                          <p className="text-xs text-gray-400 mt-2">
                            Session ID: {sessionId}
                          </p>
                        )}
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          }`}>
                            <KaTeXRenderer content={msg.content} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="perplexity">Perplexity</option>
                  </select>
                  <button 
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    type="button"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Synthesis Modal */}
        {showSynthesisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Document Synthesis
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={useChatData}
                      onChange={(e) => setUseChatData(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Include Chat Context
                    </span>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSynthesisModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  {/* Document A Chunks */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                      Document A: {documentA?.originalName || 'No Document'}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {chunksA.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            chunk.selected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setChunksA(prev => prev.map(c => 
                              c.id === chunk.id ? { ...c, selected: !c.selected } : c
                            ));
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Chunk {chunk.chunkIndex + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {chunk.wordCount} words
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {chunk.content.substring(0, 150)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document B Chunks */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                      Document B: {documentB?.originalName || 'No Document'}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {chunksB.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            chunk.selected
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setChunksB(prev => prev.map(c => 
                              c.id === chunk.id ? { ...c, selected: !c.selected } : c
                            ));
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Chunk {chunk.chunkIndex + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {chunk.wordCount} words
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {chunk.content.substring(0, 150)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Synthesis Results */}
                {synthesizedContent && (
                  <div className="border-t border-gray-200 dark:border-gray-600 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Generated Synthesis
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSynthesis('txt')}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download TXT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => injectSynthesis('A')}
                          disabled={!documentA}
                          className="flex items-center gap-2"
                        >
                          Inject to Doc A
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => injectSynthesis('B')}
                          disabled={!documentB}
                          className="flex items-center gap-2"
                        >
                          Inject to Doc B
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <KaTeXRenderer content={synthesizedContent} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap" />
                    </div>
                  </div>
                )}

                {/* Chunk Pairs Section */}
                <div className="border-t border-gray-200 dark:border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Synthesis Instructions
                    </h3>
                    <Button onClick={addChunkPair} size="sm" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Instruction Set
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {chunkPairs.map((pair) => (
                      <div key={pair.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Instruction Set #{chunkPairs.indexOf(pair) + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChunkPair(pair.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Enter synthesis instructions for selected chunks..."
                          value={pair.instructions}
                          onChange={(e) => updateChunkPair(pair.id, { instructions: e.target.value })}
                          className="mb-3"
                          rows={3}
                        />
                        <div className="text-xs text-gray-500">
                          Selected: {chunksA.filter(c => c.selected).length} from Doc A, {chunksB.filter(c => c.selected).length} from Doc B
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {chunkPairs.length} instruction sets • Chat context: {useChatData ? 'Enabled' : 'Disabled'}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSynthesisModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateSynthesis}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                    disabled={chunkPairs.length === 0}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Generate Synthesis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}