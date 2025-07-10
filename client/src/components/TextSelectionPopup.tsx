import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, MessageSquare, X, Send, FileText } from 'lucide-react';
import { KaTeXRenderer } from './KaTeXRenderer';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TextSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  documentTitle?: string;
  selectionPosition?: { x: number; y: number };
}

export default function TextSelectionPopup({
  isOpen,
  onClose,
  selectedText,
  documentTitle = "Document",
  selectionPosition
}: TextSelectionPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'deepseek' | 'perplexity'>('openai');
  const { toast } = useToast();

  // Reset messages when popup opens with new selection
  useEffect(() => {
    if (isOpen && selectedText) {
      setMessages([]);
      setCurrentMessage('');
    }
  }, [isOpen, selectedText]);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          selectedText: selectedText,
          documentTitle: documentTitle,
          conversationHistory: messages,
          provider: provider
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadConversation = async (format: 'pdf' | 'docx' | 'txt') => {
    if (messages.length === 0) {
      toast({
        title: "No Conversation",
        description: "Start a conversation before downloading.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create conversation content with selected text and messages
      const conversationContent = `SELECTED TEXT FROM "${documentTitle}":
${selectedText}

CONVERSATION:
${messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}`;

      const response = await fetch('/api/download/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: conversationContent,
          format: format,
          filename: `selection-conversation-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate download');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selection-conversation.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Conversation downloaded as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download conversation",
        variant: "destructive"
      });
    }
  };

  const wordCount = selectedText.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = selectedText.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Text Selection Chat
              <Badge variant="outline" className="text-xs">
                {wordCount} words • {charCount} chars
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Selected Text Panel */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Selected Text from {documentTitle}</h3>
              <Badge variant="secondary" className="text-xs">
                {wordCount} words
              </Badge>
            </div>
            <ScrollArea className="flex-1 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[400px] max-h-[500px]">
              <KaTeXRenderer 
                content={selectedText} 
                className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap" 
              />
            </ScrollArea>
          </div>

          {/* Chat Panel */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">AI Discussion</h3>
              <div className="flex items-center gap-2">
                <Select value={provider} onValueChange={(value) => setProvider(value as any)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadConversation('pdf')}
                    disabled={messages.length === 0}
                    className="text-xs px-2 py-1"
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadConversation('docx')}
                    disabled={messages.length === 0}
                    className="text-xs px-2 py-1"
                  >
                    Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadConversation('txt')}
                    disabled={messages.length === 0}
                    className="text-xs px-2 py-1"
                  >
                    TXT
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[300px] max-h-[400px]">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                  Ask AI about the selected text!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}>
                        <KaTeXRenderer content={msg.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="space-y-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask AI about the selected text..."
                className="min-h-[80px] resize-none"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}