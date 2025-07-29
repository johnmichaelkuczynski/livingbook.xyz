import React, { useState, useRef } from 'react';
import { X, Copy, Play, Pause, Download, Volume2 } from 'lucide-react';

interface VoiceOption {
  name: string;
  displayName: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { name: 'en-US-JennyNeural', displayName: 'Jenny (Female, Clear)' },
  { name: 'en-US-DavisNeural', displayName: 'Davis (Male, Professional)' },
  { name: 'en-US-AriaNeural', displayName: 'Aria (Female, Natural)' },
  { name: 'en-US-GuyNeural', displayName: 'Guy (Male, Casual)' },
  { name: 'en-US-AmberNeural', displayName: 'Amber (Female, Warm)' }
];

interface PodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: string;
  type: 'standard' | 'modern';
  selectedText: string;
}

export default function PodcastModal({
  isOpen,
  onClose,
  dialogue,
  type,
  selectedText
}: PodcastModalProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speaker1Voice, setSpeaker1Voice] = useState('en-US-DavisNeural');
  const [speaker2Voice, setSpeaker2Voice] = useState('en-US-JennyNeural');
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(dialogue);
    // Could add a toast notification here
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/podcast-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dialogue,
          voiceOptions: {
            speaker1: speaker1Voice,
            speaker2: speaker2Voice
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

    } catch (error) {
      console.error('Error generating audio:', error);
      // Could add toast notification for error
    } finally {
      setIsGeneratingAudio(false);
    }
  };

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

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `podcast-${type}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formatDialogue = (text: string) => {
    // Split by speaker lines and format
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      if (line.startsWith('Speaker 1:') || line.startsWith('Host:')) {
        return (
          <div key={index} style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#1d4ed8', 
              marginBottom: '4px' 
            }}>
              {line.startsWith('Host:') ? 'Host:' : 'Speaker 1:'}
            </div>
            <div style={{ 
              color: '#374151', 
              lineHeight: '1.6',
              paddingLeft: '16px'
            }}>
              {line.replace(/^(Speaker 1:|Host:)\s*/, '').trim()}
            </div>
          </div>
        );
      } else if (line.startsWith('Speaker 2:') || line.startsWith('Guest:')) {
        return (
          <div key={index} style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#dc2626', 
              marginBottom: '4px' 
            }}>
              {line.startsWith('Guest:') ? 'Guest:' : 'Speaker 2:'}
            </div>
            <div style={{ 
              color: '#374151', 
              lineHeight: '1.6',
              paddingLeft: '16px'
            }}>
              {line.replace(/^(Speaker 2:|Guest:)\s*/, '').trim()}
            </div>
          </div>
        );
      } else if (line.startsWith('**') || line.startsWith('#')) {
        // Handle titles and headers
        return (
          <div key={index} style={{ 
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '12px',
            fontSize: '18px'
          }}>
            {line.replace(/\*\*/g, '').replace(/#{1,6}\s?/, '')}
          </div>
        );
      } else if (line.trim()) {
        // Handle non-speaker lines
        return (
          <div key={index} style={{ 
            color: '#6b7280', 
            marginBottom: '8px',
            fontStyle: 'italic'
          }}>
            {line}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 4px 0'
            }}>
              Podcast Dialogue
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              {type === 'standard' ? 'Standard Summary Dialogue' : 'Modern Reconstruction (5 min)'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleCopy}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* Voice Selection and Audio Controls */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {/* Voice Selection */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                marginBottom: '6px', 
                color: '#374151',
                fontSize: '14px'
              }}>
                Speaker 1 Voice
              </label>
              <select
                value={speaker1Voice}
                onChange={(e) => setSpeaker1Voice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  fontSize: '14px'
                }}
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                marginBottom: '6px', 
                color: '#374151',
                fontSize: '14px'
              }}>
                Speaker 2 Voice
              </label>
              <select
                value={speaker2Voice}
                onChange={(e) => setSpeaker2Voice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  fontSize: '14px'
                }}
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: isGeneratingAudio ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isGeneratingAudio ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              <Volume2 size={16} />
              {isGeneratingAudio ? 'Generating Audio...' : 'Generate Audio'}
            </button>

            {audioUrl && (
              <>
                <button
                  onClick={handlePlayPause}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={handleDownloadAudio}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  <Download size={16} />
                  Download MP3
                </button>
              </>
            )}
          </div>

          {/* Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              style={{ display: 'none' }}
            />
          )}
        </div>

        {/* Selected Text Preview */}
        {selectedText && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Original Text
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflow: 'auto'
        }}>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {formatDialogue(dialogue)}
          </div>
        </div>
      </div>
    </div>
  );
}