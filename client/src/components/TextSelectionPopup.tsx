import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Download } from 'lucide-react';
import KaTeXRenderer from './KaTeXRenderer';
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

  // Reset messages and start automatic discussion when popup opens with new selection
  useEffect(() => {
    if (isOpen && selectedText) {
      setMessages([]);
      setCurrentMessage('');
      
      // Automatically start discussion about the selected text
      const startAutomaticDiscussion = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/chat/selection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: "Please provide a brief discussion of the meaning and significance of this selected text. What are the key ideas and why are they important?",
              selectedText: selectedText,
              documentTitle: documentTitle,
              conversationHistory: [],
              provider: provider
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await response.json();
          
          const aiMessage: ChatMessage = {
            id: Date.now(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date().toISOString()
          };

          setMessages([aiMessage]);
        } catch (error) {
          console.error('Auto-discussion error:', error);
        } finally {
          setIsLoading(false);
        }
      };

      // Start automatic discussion after a short delay
      setTimeout(startAutomaticDiscussion, 500);
    }
  }, [isOpen, selectedText, documentTitle, provider]);

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

  const downloadAsTxt = (content: string, messageId: number) => {
    const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    const blob = new Blob([cleanContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${messageId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsWord = (content: string, messageId: number) => {
    const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>AI Response ${messageId}</title>
        </head>
        <body style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.6; margin: 1in;">
          <h1>AI Response - DocMath AI</h1>
          <div>${cleanContent.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${messageId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Discuss This Passage</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col h-[70vh]">
          {/* Selected Text Display */}
          <div className="p-6 border-b bg-blue-50">
            <div className="mb-2">
              <span className="text-sm font-medium text-blue-700">Selected Passage:</span>
            </div>
            <ScrollArea className="max-h-[200px]">
              <div className="bg-white p-4 rounded-lg border border-blue-200 text-gray-700 leading-relaxed">
                {selectedText}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg">Ask a question about this passage...</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} data-message-id={message.id} className="space-y-3">
                      {message.role === 'user' ? (
                        <div className="bg-blue-100 p-4 rounded-lg">
                          <div className="text-sm font-medium text-blue-700 mb-1">YOU</div>
                          <div className="text-gray-800 font-medium">{message.content}</div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-600">AI</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAsTxt(message.content, message.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              TXT
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAsWord(message.content, message.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Word
                            </Button>
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <KaTeXRenderer content={message.content} className="prose" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-2">AI</div>
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-gray-50 p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask a question about this passage... (Enter to send, Shift+Enter for new line)"
                    className="min-h-[80px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Press Enter to send • Shift+Enter for new line</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select value={provider} onValueChange={setProvider}>
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
                      <Button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}