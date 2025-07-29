import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Readable } from 'stream';

interface VoiceOption {
  name: string;
  displayName: string;
  gender: 'Male' | 'Female';
  locale: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: 'en-US-JennyNeural', displayName: 'Jenny (Female, Clear)', gender: 'Female', locale: 'en-US' },
  { name: 'en-US-DavisNeural', displayName: 'Davis (Male, Professional)', gender: 'Male', locale: 'en-US' },
  { name: 'en-US-AriaNeural', displayName: 'Aria (Female, Natural)', gender: 'Female', locale: 'en-US' },
  { name: 'en-US-GuyNeural', displayName: 'Guy (Male, Casual)', gender: 'Male', locale: 'en-US' },
  { name: 'en-US-AmberNeural', displayName: 'Amber (Female, Warm)', gender: 'Female', locale: 'en-US' }
];

export async function synthesizeSpeech(
  text: string,
  voiceName: string = 'en-US-JennyNeural'
): Promise<Buffer> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error('Azure Speech Service credentials not configured');
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
  speechConfig.speechSynthesisVoiceName = voiceName;

  // Clean text for plain text synthesis - remove all formatting but keep readability
  const cleanText = text
    // Remove markdown and formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/_([^_]+)_/g, '$1')
    
    // Remove brackets and special characters, keep essential punctuation
    .replace(/\[([^\]]*)\]/g, '$1')
    .replace(/\([^)]*\)/g, '')
    
    // Clean whitespace and line breaks
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\r/g, '')
    .trim();

  console.log(`🎤 Synthesizing text for ${voiceName}: ${cleanText.substring(0, 100)}...`);

  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    // Use plain text synthesis instead of SSML to avoid parsing errors
    synthesizer.speakTextAsync(
      cleanText,
      (result) => {
        if (result.errorDetails) {
          console.error('Azure Speech synthesis error:', result.errorDetails);
          synthesizer.close();
          reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          return;
        }

        if (result.audioData) {
          const audioBuffer = Buffer.from(result.audioData);
          console.log(`✅ Successfully synthesized ${audioBuffer.length} bytes of audio`);
          synthesizer.close();
          resolve(audioBuffer);
        } else {
          synthesizer.close();
          reject(new Error('No audio data received from Azure Speech Service'));
        }
      },
      (error) => {
        console.error('Azure Speech synthesis error:', error);
        synthesizer.close();
        reject(error);
      }
    );
  });
}

export async function generatePodcastAudio(
  dialogue: string,
  speakerVoices: { speaker1: string; speaker2: string } = {
    speaker1: 'en-US-DavisNeural',
    speaker2: 'en-US-JennyNeural'
  }
): Promise<Buffer> {
  try {
    // Parse dialogue into speaker segments
    const segments = parseDialogue(dialogue);
    const audioBuffers: Buffer[] = [];

    for (const segment of segments) {
      let voiceName: string;
      
      if (segment.speaker === 'Speaker 1' || segment.speaker === 'Host') {
        voiceName = speakerVoices.speaker1;
      } else if (segment.speaker === 'Speaker 2' || segment.speaker === 'Guest') {
        voiceName = speakerVoices.speaker2;
      } else {
        // Narrator or other text
        voiceName = speakerVoices.speaker1;
      }

      const audioBuffer = await synthesizeSpeech(segment.text, voiceName);
      audioBuffers.push(audioBuffer);

      // Add brief pause between speakers (0.5 seconds of silence)
      const silenceBuffer = Buffer.alloc(8000); // Approximate 0.5s silence for 16kHz
      audioBuffers.push(silenceBuffer);
    }

    // Combine all audio buffers
    return Buffer.concat(audioBuffers);
  } catch (error) {
    console.error('Error generating podcast audio:', error);
    throw error;
  }
}

function parseDialogue(dialogue: string): Array<{ speaker: string; text: string }> {
  const lines = dialogue.split('\n').filter(line => line.trim());
  const segments: Array<{ speaker: string; text: string }> = [];

  for (const line of lines) {
    // Match speaker patterns with more flexibility
    const speakerMatch = line.match(/^(Speaker [12]|Host|Guest):\s*(.*)$/);
    
    if (speakerMatch) {
      const [, speaker, text] = speakerMatch;
      const cleanedText = text.trim();
      
      if (cleanedText && cleanedText.length > 0) {
        segments.push({
          speaker: speaker.trim(),
          text: cleanedText
        });
      }
    } else if (line.trim() && !line.startsWith('**') && !line.startsWith('#')) {
      // Handle non-speaker lines as narrator only if they're substantial
      const trimmedLine = line.trim();
      if (trimmedLine.length > 10) {
        segments.push({
          speaker: 'Narrator',
          text: trimmedLine
        });
      }
    }
  }

  console.log(`📋 Parsed ${segments.length} dialogue segments`);
  return segments;
}

export function formatDialogueForAudio(dialogue: string): string {
  // Clean up markdown and formatting for better TTS
  return dialogue
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/#{1,6}\s?/g, '') // Remove headers
    .replace(/\[([^\]]+)\]/g, '$1') // Remove brackets
    .replace(/\(([^)]+)\)/g, '') // Remove parentheses
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .trim();
}