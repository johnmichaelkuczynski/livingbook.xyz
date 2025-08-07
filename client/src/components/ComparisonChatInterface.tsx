import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageSquare, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import KaTeXRenderer from './KaTeXRenderer';
import { downloadAIResponseAsWord } from '@/utils/wordGenerator';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ComparisonChatInterfaceProps {
  documentA: any | null;
  documentB: any | null;
  sessionId: number | null;
  onSessionIdChange: (sessionId: number) => void;
}

export default function ComparisonChatInterface({ 
  documentA, 
  documentB, 
  sessionId, 
  onSessionIdChange 
}: ComparisonChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('deepseek');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comparison messages for the session with aggressive caching
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/compare/messages", sessionId],
    enabled: !!sessionId,
    queryFn: () => fetch(`/api/compare/messages/${sessionId}`).then(res => res.json()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
        onSessionIdChange(data.sessionId);
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

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comparison Chat
          </div>
          <Select value={provider} onValueChange={setProvider}>
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
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}>
                  <div className={`rounded-lg p-4 max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    <KaTeXRenderer 
                      content={msg.content} 
                      className="text-sm whitespace-pre-wrap" 
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs opacity-70">
                        {formatTimestamp(msg.timestamp)}
                      </p>
                      {msg.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAIResponseAsWord(msg.content, msg.id, 'Comparison Response')}
                          className="text-xs opacity-70 hover:opacity-100 h-6 px-2"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Word
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {sendMessageMutation.isPending && (
                <div className="flex items-start gap-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Compare documents or ask questions..."
              className="flex-1 min-h-[80px] resize-none"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}