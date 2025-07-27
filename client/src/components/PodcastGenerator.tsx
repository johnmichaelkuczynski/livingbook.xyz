import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Play, Pause, Download, Mic, Volume2, Settings, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import KaTeXRenderer from './KaTeXRenderer';

interface PodcastGeneratorProps {
  selectedText: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  isRegistered?: boolean;
}

interface PodcastScript {
  title: string;
  summary: string;
  strengthsWeaknesses: string;
  readerGains: string;
  quotations: string[];
  fullScript: string;
}

export default function PodcastGenerator({ 
  selectedText, 
  documentTitle, 
  isOpen, 
  onClose, 
  isRegistered = false 
}: PodcastGeneratorProps) {
  const [podcastScript, setPodcastScript] = useState<PodcastScript | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [customInstructions, setCustomInstructions] = useState('');
  const [useCustomInstructions, setUseCustomInstructions] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Generate podcast script
  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/podcast/generate', {
        selectedText,
        documentTitle,
        provider: selectedProvider,
        customInstructions: useCustomInstructions ? customInstructions : undefined,
        isRegistered
      });
    },
    onSuccess: (data: any) => {
      setPodcastScript(data.script);
      setIsRestricted(data.isRestricted);
      toast({
        title: "Script Generated",
        description: "Creating audio with Azure Speech Services..."
      });
      
      // Automatically generate audio for complete podcast experience
      setTimeout(() => {
        generateAudioMutation.mutate();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate podcast script",
        variant: "destructive"
      });
    }
  });

  // Generate audio from script
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      // For unregistered users, use the summary + key quotes instead of restricted fullScript
      let scriptForAudio = podcastScript?.fullScript || '';
      
      // If the script is restricted or empty, create audio from available parts
      if (!scriptForAudio || scriptForAudio.includes('[Full content available for registered users]')) {
        scriptForAudio = `
Welcome to our podcast analysis. 

${podcastScript?.summary || ''}

Key strengths and considerations: ${podcastScript?.strengthsWeaknesses || ''}

What readers can gain: ${podcastScript?.readerGains || ''}

Here are some key quotations from the text: ${podcastScript?.quotations?.join('. ') || ''}

Thank you for listening to this analysis.
        `.trim();
      }
      
      if (!scriptForAudio || scriptForAudio.length < 20) {
        console.error('❌ AUDIO GENERATION - No usable script content found');
        throw new Error("No script content available for audio generation");
      }
      
      console.log('🎧 AUDIO GENERATION - Using script content (length ' + scriptForAudio.length + '):', scriptForAudio.substring(0, 150) + '...');

      const response = await fetch('/api/podcast/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptText: scriptForAudio,
          voice: selectedVoice,
          isRegistered
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      console.log('🎧 AUDIO BLOB - Size:', audioBlob.size, 'bytes');
      console.log('🎧 AUDIO BLOB - Type:', audioBlob.type);
      console.log('🎧 AUDIO BLOB - URL:', blobUrl);
      return blobUrl;
    },
    onSuccess: (url) => {
      console.log('✅ AUDIO SUCCESS - Setting audio URL:', url);
      console.log('✅ AUDIO SUCCESS - Blob URL created, length:', url.length);
      
      // Force immediate state update and re-render
      setAudioUrl(url);
      console.log('🎧 STATE UPDATE - audioUrl set to:', url?.substring(0, 60) + '...');
      
      // Force re-render by triggering state change
      setPodcastScript(current => ({ ...current! })); // Trigger re-render
      
      toast({
        title: "🎧 Podcast Audio Ready!",
        description: "Your complete podcast is ready to play and download!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Audio generation failed",
        description: error.message || "Failed to generate podcast audio",
        variant: "destructive"
      });
    }
  });

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${documentTitle}-podcast.mp3`;
      a.click();
    }
  };

  const voiceOptions = [
    { value: 'en-US-JennyNeural', label: 'Jenny (Female, Clear)' },
    { value: 'en-US-DavisNeural', label: 'Davis (Male, Professional)' },
    { value: 'en-US-AriaNeural', label: 'Aria (Female, Warm)' },
    { value: 'en-US-GuyNeural', label: 'Guy (Male, Friendly)' },
    { value: 'en-US-AmberNeural', label: 'Amber (Female, Energetic)' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Mic className="w-5 h-5" />
            <span>🎧 Generate Podcast Summary</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Selected Text Preview */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Selected Text ({selectedText.length} characters):</h3>
            <ScrollArea className="h-32">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedText.length > 300 ? selectedText.substring(0, 300) + '...' : selectedText}
              </p>
            </ScrollArea>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">AI Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map(voice => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Instructions Toggle */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="useCustom"
                checked={useCustomInstructions}
                onChange={(e) => setUseCustomInstructions(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useCustom" className="text-sm font-medium">
                Use Custom Instructions
              </label>
            </div>
            
            {useCustomInstructions && (
              <Textarea
                placeholder="Enter your custom analysis instructions..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="h-24"
              />
            )}
          </div>

          {/* Generate Complete Podcast Button */}
          <Button 
            onClick={() => generateScriptMutation.mutate()}
            disabled={generateScriptMutation.isPending || generateAudioMutation.isPending}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
          >
            {generateScriptMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Script...
              </>
            ) : generateAudioMutation.isPending ? (
              <>
                <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                Creating Audio...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Generate Complete Podcast
              </>
            )}
          </Button>

          {/* Script Preview */}
          {podcastScript && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">{podcastScript.title}</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Summary:</h4>
                    <KaTeXRenderer content={podcastScript.summary} className="text-sm" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Strengths & Weaknesses:</h4>
                    <KaTeXRenderer content={podcastScript.strengthsWeaknesses} className="text-sm" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Reader Gains:</h4>
                    <KaTeXRenderer content={podcastScript.readerGains} className="text-sm" />
                  </div>
                  
                  {podcastScript.quotations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Key Quotations:</h4>
                      <ul className="text-sm space-y-1">
                        {podcastScript.quotations.map((quote, index) => (
                          <li key={index} className="italic">"{quote}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {isRestricted && (
                  <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      📝 Preview limited to first 100 words. Register for full access.
                    </p>
                  </div>
                )}
              </div>

              {/* Audio Generation */}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => generateAudioMutation.mutate()}
                  disabled={generateAudioMutation.isPending || !podcastScript}
                  className="flex-1"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {generateAudioMutation.isPending ? 'Generating Audio...' : 'Generate Audio'}
                </Button>
              </div>

              {/* Audio Player - Force Show When URL Exists */}
              {audioUrl ? (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
                    <Volume2 className="w-4 h-4 mr-2" />
                    🎧 Your Podcast is Ready!
                  </h4>
                  
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={handlePlayPause}
                      variant="outline"
                      size="sm"
                      className="bg-green-100 hover:bg-green-200 border-green-300"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <div className="flex-1">
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        controls
                        className="w-full"
                      />
                    </div>
                    
                    <Button
                      onClick={handleDownloadAudio}
                      variant="outline"
                      size="sm"
                      className="bg-blue-100 hover:bg-blue-200 border-blue-300"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isRestricted && (
                    <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        🎵 Audio limited to 30 seconds. Register for full podcast.
                      </p>
                    </div>
                  )}
                </div>
              ) : generateAudioMutation.isPending ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Creating Audio...</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">Azure Speech Services is generating your podcast</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Debug: Always Show Audio URL State */}
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-xs font-mono">
                  <div><strong>Audio URL:</strong> {audioUrl ? '✅ SET' : '❌ NOT SET'}</div>
                  <div><strong>URL Length:</strong> {audioUrl?.length || 0}</div>
                  <div><strong>Script Available:</strong> {podcastScript ? '✅ YES' : '❌ NO'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}