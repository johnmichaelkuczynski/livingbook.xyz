import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface PodcastAudioResponse {
  audioBuffer: Buffer;
  error?: string;
}

export async function generatePodcastAudio(
  scriptText: string,
  voice: string = "en-US-JennyNeural"
): Promise<PodcastAudioResponse> {
  try {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;

    console.log(`🔑 AZURE CREDENTIALS CHECK:`);
    console.log(`- AZURE_SPEECH_KEY: ${speechKey ? 'EXISTS' : 'MISSING'}`);
    console.log(`- AZURE_SPEECH_REGION: ${speechRegion || 'MISSING'}`);
    console.log(`- AZURE_SPEECH_ENDPOINT: ${speechEndpoint || 'MISSING'}`);

    if (!speechKey || !speechRegion) {
      throw new Error(`Azure Speech credentials not configured. Key: ${speechKey ? 'OK' : 'MISSING'}, Region: ${speechRegion || 'MISSING'}`);
    }

    console.log(`🎤 AZURE SPEECH - Generating audio for script length: ${scriptText.length} characters`);
    console.log(`🎤 AZURE SPEECH - Using voice: ${voice}`);

    // Configure speech service
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    speechConfig.speechSynthesisVoiceName = voice;

    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        scriptText,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log(`✅ AZURE SPEECH - Audio generation completed successfully`);
            const audioBuffer = Buffer.from(result.audioData);
            synthesizer.close();
            resolve({ audioBuffer });
          } else {
            console.error(`❌ AZURE SPEECH - Audio synthesis failed: ${result.errorDetails}`);
            synthesizer.close();
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          console.error(`❌ AZURE SPEECH - Audio synthesis error: ${error}`);
          synthesizer.close();
          reject(new Error(`Speech synthesis error: ${error}`));
        }
      );
    });

  } catch (error) {
    console.error("Azure Speech error:", error);
    return {
      audioBuffer: Buffer.alloc(0),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export function truncateAudioForUnregistered(audioBuffer: Buffer, maxDurationSeconds: number = 30): Buffer {
  // For MP3 at 32kbps, roughly 4KB per second
  const bytesPerSecond = 4000;
  const maxBytes = maxDurationSeconds * bytesPerSecond;
  
  if (audioBuffer.length <= maxBytes) {
    return audioBuffer;
  }
  
  return audioBuffer.slice(0, maxBytes);
}