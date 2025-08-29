import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechKey = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;

if (!speechKey || !speechRegion) {
  console.error('❌ AZURE SPEECH: Missing credentials');
} else {
  console.log('✅ AZURE SPEECH: Credentials configured');
}

export async function generateSimpleAudio(text: string, voiceName: string = 'en-US-JennyNeural'): Promise<Buffer> {
  if (!speechKey || !speechRegion) {
    throw new Error('Azure Speech credentials not configured');
  }

  // Clean text for TTS - remove markdown and special characters
  const cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')           // Remove italic
    .replace(/#{1,6}\s*/g, '')               // Remove headers
    .replace(/\[([^\]]*)\]/g, '$1')          // Remove brackets
    .replace(/\([^)]*\)/g, '')               // Remove parentheses
    .replace(/[^\w\s.,!?;:\-'"]/g, '')       // Keep only safe characters
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .trim();

  if (!cleanText) {
    throw new Error('No valid text to synthesize');
  }

  console.log(`🎤 Generating audio for: ${cleanText.substring(0, 50)}...`);

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
  speechConfig.speechSynthesisVoiceName = voiceName;

  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    synthesizer.speakTextAsync(
      cleanText,
      (result) => {
        synthesizer.close();
        
        if (result.errorDetails) {
          console.error('❌ Azure TTS Error:', result.errorDetails);
          reject(new Error(`TTS failed: ${result.errorDetails}`));
          return;
        }

        if (result.audioData) {
          const audioBuffer = Buffer.from(result.audioData);
          console.log(`✅ Generated ${audioBuffer.length} bytes of audio`);
          resolve(audioBuffer);
        } else {
          reject(new Error('No audio data received'));
        }
      },
      (error) => {
        synthesizer.close();
        console.error('❌ Azure TTS Error:', error);
        reject(error);
      }
    );
  });
}

export async function generateDialogueAudio(dialogue: string): Promise<Buffer> {
  // Parse dialogue into speaker segments - handle multiple formats
  const lines = dialogue.split('\n').filter(line => line.trim());
  const audioBuffers: Buffer[] = [];

  console.log(`📝 Parsing dialogue with ${lines.length} lines`);
  console.log(`📝 First few lines:`, lines.slice(0, 8).map(l => `"${l}"`));

  for (const line of lines) {
    // Check for HOST/GUEST format first
    if (line.match(/^HOST:/i) || line.match(/^GUEST:/i)) {
      let speakerNum, text;
      
      if (line.match(/^HOST:/i)) {
        speakerNum = '1';
        text = line.replace(/^HOST:\s*/i, '').trim();
      } else {
        speakerNum = '2';
        text = line.replace(/^GUEST:\s*/i, '').trim();
      }
      
      // Clean up the text - remove markdown and extra punctuation
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      
      if (text.length > 0) {
        const voice = speakerNum === '1' ? 'en-US-DavisNeural' : 'en-US-JennyNeural';
        console.log(`🎙️ Processing Speaker ${speakerNum}: "${text.substring(0, 50)}..."`);
        
        try {
          const audioBuffer = await generateSimpleAudio(text, voice);
          audioBuffers.push(audioBuffer);
          
          // Add small pause between speakers
          const silenceBuffer = Buffer.alloc(1500); // Small pause
          audioBuffers.push(silenceBuffer);
        } catch (error) {
          console.error(`❌ Failed to generate audio for Speaker ${speakerNum}:`, error);
          // Continue with other speakers instead of failing completely
        }
      }
      continue;
    }

    // Try other patterns for Speaker 1/2 format
    const patterns = [
      /^\*?\*?Speaker\s+([12])(?:\s*\([^)]*\))?\s*:\*?\*?\s*(.+)$/i,  // **Speaker 1:** text
      /^Speaker\s+([12]):\s*(.+)$/i,                                   // Speaker 1: text  
      /^\*\*Speaker\s+([12])(?:\s*\([^)]*\))?\*\*:\s*(.+)$/i,        // **Speaker 1**: text
      /^([12]):\s*(.+)$/,                                              // 1: text
    ];
    
    let speakerMatch = null;
    for (const pattern of patterns) {
      speakerMatch = line.match(pattern);
      if (speakerMatch) break;
    }
    
    if (speakerMatch) {
      const speakerNum = speakerMatch[1];
      let text = speakerMatch[2] ? speakerMatch[2].trim() : speakerMatch[1].trim();
      
      // Clean up the text - remove markdown and extra punctuation
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      
      if (text.length > 0) {
        const voice = speakerNum === '1' ? 'en-US-DavisNeural' : 'en-US-JennyNeural';
        console.log(`🎙️ Processing Speaker ${speakerNum}: "${text.substring(0, 50)}..."`);
        
        try {
          const audioBuffer = await generateSimpleAudio(text, voice);
          audioBuffers.push(audioBuffer);
          
          // Add small pause between speakers
          const silenceBuffer = Buffer.alloc(1500); // Small pause
          audioBuffers.push(silenceBuffer);
        } catch (error) {
          console.error(`❌ Failed to generate audio for Speaker ${speakerNum}:`, error);
          // Continue with other speakers instead of failing completely
        }
      }
    }
  }

  if (audioBuffers.length === 0) {
    console.error('❌ No speaker segments found in dialogue');
    console.error('📝 Sample lines for debugging:', lines.slice(0, 10));
    throw new Error(`No valid speaker segments found. Please check dialogue format.`);
  }

  const combinedBuffer = Buffer.concat(audioBuffers);
  console.log(`🎵 Combined audio: ${combinedBuffer.length} bytes from ${Math.floor(audioBuffers.length/2)} speaker segments`);
  
  return combinedBuffer;
}