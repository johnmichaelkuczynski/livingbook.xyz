import { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Send, Paperclip, Bot, RotateCcw, Download, Mail, Calculator, Upload, FileDown } from 'lucide-react';
import { processMathNotation, containsMath } from '@/lib/mathUtils';
import MathRenderer from './MathRenderer';
import KaTeXRenderer from './KaTeXRenderer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { downloadAIResponseAsWord } from '@/utils/wordGenerator';
import { useDebouncedCallback } from '@/hooks/useDebounce';

interface ChatInterfaceProps {
  document: any | null;
  showInputInline?: boolean;
  onMessageToDocument?: (content: string, title: string) => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}



// Function to remove markdown symbols from text
function removeMarkupSymbols(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '') // Remove heading symbols ### ## #
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
    .replace(/__(.*?)__/g, '$1') // Remove bold __text__
    .replace(/_(.*?)_/g, '$1') // Remove italic _text_
    .replace(/`(.*?)`/g, '$1') // Remove inline code `text`
    .replace(/```[\s\S]*?```/g, (match) => { // Handle code blocks
      return match.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
    })
    .replace(/^\s*[\*\-\+]\s+/gm, '') // Remove bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/^\s*>\s+/gm, '') // Remove blockquotes
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links [text](url) -> text
    .trim();
}

export default function ChatInterface({ document, showInputInline = true, onMessageToDocument }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [isTyping, setIsTyping] = useState(false);
  const [mathRenderingEnabled, setMathRenderingEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateCredits } = useAuth();

  // Debounced message update to prevent excessive re-renders during typing
  const debouncedSetMessage = useDebouncedCallback((value: string) => {
    // This is already handled by the controlled input, but we can add 
    // any additional logic here if needed for performance
  }, 100);

  // Fetch chat messages for the current document or global chat
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: document ? ['/api/chat/' + document.id + '/messages'] : ['/api/chat/messages'],
    refetchInterval: false, // Disable aggressive polling to improve input performance
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const endpoint = document ? `/api/chat/${document.id}/message` : '/api/chat/message';
      const response = await apiRequest('POST', endpoint, {
        message: messageContent,
        provider: selectedProvider,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data: any) => {
      // Invalidate and refetch messages
      const queryKey = document ? ['/api/chat/' + document.id + '/messages'] : ['/api/chat/messages'];
      queryClient.invalidateQueries({ queryKey });
      setMessage('');
      setIsTyping(false);
      
      // Update credits if new balance is provided
      if (data.newBalance !== undefined) {
        updateCredits(data.newBalance);
        if (data.creditsUsed) {
          toast({
            title: "Credits used",
            description: `${data.creditsUsed.toLocaleString()} credits used. Balance: ${data.newBalance.toLocaleString()}`,
          });
        }
      }
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
      
      let errorTitle = "Failed to send message";
      let errorDescription = "Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Insufficient credits")) {
          errorTitle = "Insufficient credits";
          errorDescription = error.message + " Please add credits to continue.";
        } else if (error.message.includes("Document not found")) {
          errorTitle = "Document not found";
          errorDescription = "The document you're trying to chat with no longer exists. Please refresh the page and upload your document again.";
        } else if (error.message.includes("Invalid document ID")) {
          errorTitle = "Invalid document";
          errorDescription = "There's an issue with the document. Please refresh the page and try again.";
        } else {
          errorDescription = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });



  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTextareaFocus = () => {
    // Ensure the textarea is properly focused for all browsers
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  };

  const handleQuickAction = (action: string) => {
    let quickMessage = '';
    switch (action) {
      case 'explain':
        quickMessage = 'Can you explain the main concepts in this document?';
        break;
      case 'solve':
        quickMessage = 'Can you help me solve a similar problem based on this document?';
        break;
      case 'summarize':
        quickMessage = 'Can you provide a summary of this document?';
        break;
    }
    if (quickMessage) {
      setMessage(quickMessage);
    }
  };

  const handleRewrite = (originalMessage: string) => {
    const rewritePrompt = `Please rewrite and improve this response: "${originalMessage}"`;
    setMessage(rewritePrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Only scroll to bottom when user sends a message (not on every change)
  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [sendMessageMutation.isSuccess]);

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

  // Function to download message as PDF
  const downloadMessageAsPDF = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const processedContent = containsMath(content) ? processMathNotation(content) : content;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Response - DocMath AI</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
            .math-katex { font-size: 1.1em; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>AI Response - DocMath AI</h1>
          <div>${processedContent}</div>
          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
          <script>
            // Render any remaining math elements
            document.querySelectorAll('.math-katex').forEach(element => {
              if (element.textContent) {
                try {
                  katex.render(element.textContent, element, { displayMode: element.classList.contains('display') });
                } catch (e) {
                  console.log('KaTeX render error:', e);
                }
              }
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Function to email message via SendGrid
  const emailMessage = async (content: string) => {
    try {
      const processedContent = containsMath(content) ? processMathNotation(content) : content;
      
      const response = await apiRequest('POST', '/api/email/send', {
        subject: 'AI Response from DocMath AI',
        content: processedContent,
        contentType: 'html'
      });

      toast({
        title: "Email sent successfully",
        description: "The response has been sent to your email address.",
      });
    } catch (error) {
      toast({
        title: "Email failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to convert AI message to document
  const convertToDocument = (content: string) => {
    // Clean up markdown formatting from the content
    const cleanedContent = removeMarkupSymbols(content);
    
    // Extract first line or first 50 characters as title
    const lines = cleanedContent.split('\n').filter(line => line.trim());
    let title = 'AI Generated Content';
    
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Use first line if it's short enough, otherwise use first 50 chars
      if (firstLine.length <= 60) {
        title = firstLine.replace(/[^\w\s-]/g, '').trim();
      } else {
        title = cleanedContent.substring(0, 50).replace(/[^\w\s-]/g, '').trim() + '...';
      }
    }

    if (onMessageToDocument) {
      onMessageToDocument(cleanedContent, title);
      toast({
        title: "Converted to document",
        description: "AI response has been converted to a document you can analyze and rewrite.",
      });
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={mathRenderingEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setMathRenderingEnabled(!mathRenderingEnabled)}
              className="flex items-center space-x-1"
            >
              <Calculator className="w-4 h-4" />
              <span className="text-xs">Math</span>
            </Button>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">ZHI 1</SelectItem>
                <SelectItem value="anthropic">ZHI 2</SelectItem>
                <SelectItem value="deepseek">ZHI 3</SelectItem>
                <SelectItem value="perplexity">ZHI 4</SelectItem>
                <SelectItem value="grok">ZHI 5</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Takes up remaining space */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4 pb-4">

            {/* Chat Messages */}
            {messages.map((msg) => (
              <div key={msg.id} data-message-id={msg.id} className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`rounded-lg p-6 inline-block w-full max-w-none ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {mathRenderingEnabled ? (
                      <KaTeXRenderer content={removeMarkupSymbols(msg.content)} className="prose whitespace-pre-wrap text-lg" />
                    ) : (
                      <div className="prose text-lg whitespace-pre-wrap">{removeMarkupSymbols(msg.content)}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => convertToDocument(msg.content)}
                          className="text-xs text-gray-400 hover:text-gray-600 h-6 px-2"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Use as Doc
                        </Button>
                        <a
                          href={`data:text/plain;charset=utf-8,${encodeURIComponent(removeMarkupSymbols(msg.content))}`}
                          download={`ai-response-${msg.id}.txt`}
                          className="text-xs text-gray-400 hover:text-gray-600 h-6 px-2 inline-flex items-center border border-transparent bg-transparent hover:bg-gray-100 rounded-md"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          TXT
                        </a>
                        <button
                          onClick={() => downloadAIResponseAsWord(removeMarkupSymbols(msg.content), msg.id, 'AI Response')}
                          className="text-xs text-gray-400 hover:text-gray-600 h-6 px-2 inline-flex items-center border border-transparent bg-transparent hover:bg-gray-100 rounded-md"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Word
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => emailMessage(msg.content)}
                          className="text-xs text-gray-400 hover:text-gray-600 h-6 px-2"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRewrite(msg.content)}
                          className="text-xs text-gray-400 hover:text-gray-600 h-6 px-2"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Rewrite
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">U</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input - Fixed at bottom */}
      {showInputInline && (
      <div className="border-t border-gray-200 px-2 py-3 flex-shrink-0 bg-white" style={{ position: 'relative', zIndex: 40 }}>
        <div className="flex space-x-1">
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={handleTextareaClick}
                onFocus={handleTextareaFocus}
                placeholder={document ? "Ask me anything about your document..." : "Ask me any question..."}
                className="w-full min-h-[120px] max-h-60 resize-none pr-10 text-lg border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                disabled={sendMessageMutation.isPending}
                style={{ 
                  pointerEvents: 'auto',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  position: 'relative',
                  zIndex: 1,
                  backgroundColor: 'white',
                  touchAction: 'manipulation'
                }}
                autoComplete="off"
                spellCheck="true"
                tabIndex={0}
              />
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="px-4 py-6 bg-primary hover:bg-primary/90 text-base font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1,
              border: 'none',
              outline: 'none'
            }}
            type="button"
          >
            <Send className="w-5 h-5 mr-2" />
            {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
        
        {/* Quick Actions */}
        {document && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('explain')}
              className="text-xs"
            >
              Explain this section
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('solve')}
              className="text-xs"
            >
              Solve similar problem
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('summarize')}
              className="text-xs"
            >
              Summarize document
            </Button>
          </div>
        )}
      </div>
      )}
    </Card>
  );
}
