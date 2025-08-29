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
  message: string;
  onMessageChange: (message: string) => void;
  provider: string;
  onProviderChange: (provider: string) => void;
  onSendMessage: () => void;
  isPending: boolean;
}

export default function ComparisonChatInterface({ 
  documentA, 
  documentB, 
  sessionId, 
  onSessionIdChange,
  message,
  onMessageChange,
  provider,
  onProviderChange,
  onSendMessage,
  isPending
}: ComparisonChatInterfaceProps) {
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
    <Card className="h-[1400px] flex flex-col overflow-hidden">
      <CardHeader className="py-0 px-2 h-8 min-h-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span className="text-xs">Comparison Chat</span>
          </div>
          <Select value={provider} onValueChange={onProviderChange}>
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
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea 
            className="h-full" 
            style={{ 
              height: '1200px',
              maxHeight: '1200px', 
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollBehavior: 'smooth',
              border: '1px solid #e5e7eb',
              position: 'relative'
            }}
          >
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

              {isPending && (
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
      </CardContent>
    </Card>
  );
}