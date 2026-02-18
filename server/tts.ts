import axios from "axios";
import { log } from "./index";

interface TTSRequest {
  text: string;
  voiceId?: string;
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

interface TTSResponse {
  audioBase64: string;
  wordTimings: WordTiming[];
  duration: number;
}

interface MurfWordDuration {
  word: string;
  startMs: number;
  endMs: number;
}

interface MurfGenerateResponse {
  audioFile: string;
  encodedAudio?: string;
  audioLengthInSeconds: number;
  wordDurations: MurfWordDuration[];
}

const MURF_GENERATE_URL = "https://api.murf.ai/v1/speech/generate";
const DEFAULT_VOICE = "en-US-natalie";

export async function generateTTS(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = process.env.MURF_API_KEY;
  
  if (!apiKey) {
    throw new Error("MURF_API_KEY is not configured");
  }

  const { text, voiceId = DEFAULT_VOICE } = request;
  
  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for TTS generation");
  }

  const requestData = {
    voiceId: voiceId,
    text: text,
    format: "MP3",
    sampleRate: 24000,
    channelType: "MONO",
    encodeAsBase64: true,
    wordDurationsAsOriginalText: true,
  };

  try {
    log(`Generating TTS with Murf API for ${text.length} characters...`);
    
    const response = await axios({
      method: "post",
      url: MURF_GENERATE_URL,
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      data: requestData,
      timeout: 120000,
    });

    const murfResponse = response.data as MurfGenerateResponse;
    
    let audioBase64: string;
    
    if (murfResponse.encodedAudio) {
      audioBase64 = murfResponse.encodedAudio;
    } else if (murfResponse.audioFile.startsWith('data:')) {
      const base64Match = murfResponse.audioFile.match(/base64,(.+)/);
      audioBase64 = base64Match ? base64Match[1] : murfResponse.audioFile;
    } else if (murfResponse.audioFile.startsWith('http')) {
      const audioResponse = await axios({
        method: "get",
        url: murfResponse.audioFile,
        responseType: "arraybuffer",
        timeout: 60000,
      });
      audioBase64 = Buffer.from(audioResponse.data).toString("base64");
    } else {
      audioBase64 = murfResponse.audioFile;
    }
    
    const wordTimings: WordTiming[] = (murfResponse.wordDurations || []).map((wd) => ({
      word: wd.word,
      startTime: wd.startMs / 1000,
      endTime: wd.endMs / 1000,
    }));
    
    log(`TTS generated successfully: ${murfResponse.audioLengthInSeconds}s, ${wordTimings.length} words with timings`);

    return {
      audioBase64,
      wordTimings,
      duration: murfResponse.audioLengthInSeconds,
    };
  } catch (error: any) {
    if (error.response) {
      const errorMessage = typeof error.response.data === 'string' 
        ? error.response.data 
        : JSON.stringify(error.response.data);
      log(`Murf API error: ${error.response.status} - ${errorMessage}`);
      throw new Error(`Murf API error: ${errorMessage}`);
    }
    log(`TTS generation error: ${error.message}`);
    throw error;
  }
}
