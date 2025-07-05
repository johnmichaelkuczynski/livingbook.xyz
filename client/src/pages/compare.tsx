import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SimpleMathRenderer from "@/components/SimpleMathRenderer";

// Using any type to match existing codebase pattern
type Document = any;

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ComparePage() {
  const [documentA, setDocumentA] = useState<Document | null>(null);
  const [documentB, setDocumentB] = useState<Document | null>(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("documents");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comparison messages for the session
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/compare/messages", sessionId],
    enabled: !!sessionId,
    queryFn: () => fetch(`/api/compare/messages/${sessionId}`).then(res => res.json()),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; provider: string; documentAId?: number; documentBId?: number }) => {
      const response = await fetch("/api/compare/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/compare/messages"] });
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, column: 'A' | 'B') => {
    const setUploading = column === 'A' ? setIsUploadingA : setIsUploadingB;
    const setDocument = column === 'A' ? setDocumentA : setDocumentB;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const document = await response.json();
      setDocument(document);
      
      // Auto-switch to chat tab when a document is uploaded
      if (activeTab === "documents") {
        setActiveTab("chat");
      }
      
      toast({
        title: "Success",
        description: `Document ${column} uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to upload document ${column}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent, column: 'A' | 'B') => {
    e.preventDefault();
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
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      message: message.trim(),
      provider,
      documentAId: documentA?.id,
      documentBId: documentB?.id,
    });
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
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors w-full min-h-[300px] flex items-center justify-center"
                onDrop={(e) => handleDrop(e, column)}
                onDragOver={(e) => e.preventDefault()}
            >
              {isUploading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Upload Document {column}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Supports PDF, Word, and TXT files
                  </p>
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{doc.title}</h3>
                <Badge variant="secondary">{doc.fileType.toUpperCase()}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-[300px]">
                <SimpleMathRenderer content={doc.content} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const setDocument = column === 'A' ? setDocumentA : setDocumentB;
                  setDocument(null);
                }}
              >
                Remove Document
              </Button>
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
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
          >
            ← Back to Home
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
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
                  <>
                    <div className="flex-1 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[300px]">
                      {messages.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                          Ask AI to compare your documents!
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                              msg.role === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}>
                              <SimpleMathRenderer content={msg.content} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="perplexity">Perplexity</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder={`Compare ${documentA && documentB ? 'both documents' : documentA ? 'Document A' : 'Document B'}...`}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1"
                          rows={2}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          size="sm"
                          className="self-end"
                        >
                          {sendMessageMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}