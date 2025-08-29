import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Play, Pause, Download, Volume2, Users, User, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  selectedText?: string;
}

type PodcastMode = 'normal-single' | 'normal-dialogue' | 'custom-single' | 'custom-dialogue';

export default function PodcastModal({ isOpen, onClose, document, selectedText }: PodcastModalProps) {
  const [mode, setMode] = useState<PodcastMode>('normal-single');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastScript, setPodcastScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<'script' | 'audio' | 'complete'>('script');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleGeneratePodcast = async () => {
    if ((mode === 'custom-single' || mode === 'custom-dialogue') && !customInstructions.trim()) {
      toast({
        title: "Custom instructions required",
        description: "Please provide custom instructions for the podcast.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setCurrentStep('script');
    
    try {
      // Generate podcast with single API call
      const response = await apiRequest('POST', '/api/generate-podcast', {
        selectedText: selectedText || document.content,
        provider: 'deepseek',
        podcastType: mode.includes('dialogue') ? 'dialogue' : 'single',
        customInstructions: (mode === 'custom-single' || mode === 'custom-dialogue') ? customInstructions : null,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // Check if response is audio file
      if (contentType && contentType.includes('audio/')) {
        // Direct audio response - create blob URL
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        setPodcastScript('Podcast generated successfully');
        setCurrentStep('complete');
      } else {
        // JSON response with audioUrl
        const data = await response.json();
        setPodcastScript(data.script || 'Script generated successfully');
        setCurrentStep('audio');
        
        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
          setCurrentStep('complete');
        } else {
          throw new Error('No audio URL returned from podcast generation');
        }
      }
      
      toast({
        title: "Podcast generated successfully",
        description: "Your podcast is ready to play!",
      });
      
    } catch (error) {
      console.error('Podcast generation error:', error);
      
      let errorMessage = "Please try again later.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Failed to generate podcast",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (!audioUrl) {
      toast({
        title: "No audio available",
        description: "Please generate a podcast first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For blob URLs, we need to fetch the blob data first
      if (audioUrl.startsWith('blob:')) {
        toast({
          title: "Preparing download...",
          description: "Getting your podcast ready.",
        });

        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        // Create download link
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `podcast-${Date.now()}.mp3`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: "Download started",
          description: "Your podcast is being downloaded.",
        });
        return;
      }

      // For server URLs, open in new tab for download
      window.open(audioUrl, '_blank');
      toast({
        title: "Download opened",
        description: "Right-click and save the audio file.",
      });
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed", 
        description: "Please right-click the audio player and select 'Save audio as...'",
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setMode('normal-single');
    setCustomInstructions('');
    setPodcastScript('');
    setAudioUrl('');
    setIsPlaying(false);
    setCurrentStep('script');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Generate Podcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Content Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Source Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {selectedText 
                  ? `Selected text: "${selectedText.substring(0, 100)}..."` 
                  : `Full document: ${document?.originalName || 'Untitled'}`
                }
              </p>
            </CardContent>
          </Card>

          {/* Podcast Mode Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Podcast Mode</Label>
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${mode === 'normal-single' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setMode('normal-single')}
              >
                <CardContent className="p-4 text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-medium">Normal Mode (One Host)</h3>
                  <p className="text-sm text-gray-600 mt-1">Single narrator discussing the content</p>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all ${mode === 'normal-dialogue' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setMode('normal-dialogue')}
              >
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-medium">Normal Mode (Two Hosts)</h3>
                  <p className="text-sm text-gray-600 mt-1">Two hosts having a conversation</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${mode === 'custom-single' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setMode('custom-single')}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <User className="w-6 h-6 text-primary" />
                    <Settings className="w-4 h-4 text-primary ml-1" />
                  </div>
                  <h3 className="font-medium">Custom (One Host)</h3>
                  <p className="text-sm text-gray-600 mt-1">Single host with custom instructions</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${mode === 'custom-dialogue' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setMode('custom-dialogue')}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-6 h-6 text-primary" />
                    <Settings className="w-4 h-4 text-primary ml-1" />
                  </div>
                  <h3 className="font-medium">Custom (Two Hosts)</h3>
                  <p className="text-sm text-gray-600 mt-1">Two hosts with custom instructions</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Custom Instructions */}
          {(mode === 'custom-single' || mode === 'custom-dialogue') && (
            <div className="space-y-2">
              <Label htmlFor="custom-instructions">Custom Instructions</Label>
              <Textarea
                id="custom-instructions"
                placeholder="Describe how you want the podcast to be structured and presented..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">
                      {currentStep === 'script' && 'Generating podcast script...'}
                      {currentStep === 'audio' && 'Converting to audio...'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentStep === 'script' && 'Creating engaging content from your text'}
                      {currentStep === 'audio' && 'Using Azure Speech Services to generate audio'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Script */}
          {podcastScript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Generated Script</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {podcastScript}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  ✅ Podcast Generated Successfully - High Quality Alloy Voice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePlayPause}
                    variant="default"
                    size="default"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="default"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
                
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full mt-4"
                  controls
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons - Always visible at bottom */}
          <div className="flex-shrink-0 flex justify-between pt-4 border-t bg-white">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button 
              onClick={handleGeneratePodcast}
              disabled={isGenerating || ((mode === 'custom-single' || mode === 'custom-dialogue') && !customInstructions.trim())}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Podcast'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}