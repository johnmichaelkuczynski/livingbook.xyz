import { useState, useRef } from 'react';
import { Settings, Info, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';
import DocumentViewer from '@/components/DocumentViewer';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUploaded = (document: any) => {
    setCurrentDocument(document);
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
      <div className="flex h-[calc(100vh-200px)]">
        {/* Left Side: Document Area */}
        <div className="flex-1 flex flex-col p-8">
          <FileUpload 
            onFileUploaded={handleFileUploaded}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
          <div className="flex-1 mt-6">
            <DocumentViewer 
              document={currentDocument}
              isLoading={isUploading}
            />
          </div>
        </div>

        {/* Right Side: AI Chat Messages */}
        <div className="w-96 border-l border-gray-200 flex flex-col">
          <ChatInterface document={currentDocument} showInputInline={false} />
        </div>
      </div>

      {/* Fixed Chat Input at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg z-50">
        <div className="p-6">
          <div className="flex space-x-4 max-w-7xl mx-auto">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your document..."
                className="min-h-[100px] max-h-40 resize-none text-lg border-2 border-gray-300 focus:border-primary"
                disabled={sendMessageMutation.isPending}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="px-8 py-6 bg-primary hover:bg-primary/90 text-lg font-semibold"
              >
                <Send className="w-5 h-5 mr-2" />
                {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
