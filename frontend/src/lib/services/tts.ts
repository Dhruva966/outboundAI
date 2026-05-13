/**
 * Pluggable TTS adapter.
 *
 * TTS_PROVIDER=mock   → MockTTSService (no real audio, local dev)
 * TTS_PROVIDER=external (default) → ExternalTTSService (your collaborator's ElevenLabs endpoint)
 *
 * Collaborator endpoint contract — POST to TTS_SERVICE_URL:
 *   Request body: { text, languageCode, voiceId?, stability?, speed? }
 *   Response:     { audioUrl: string, durationSeconds: number }
 *   Auth header:  TTS_SERVICE_API_KEY: <shared secret>
 */

export interface TTSSynthesizeParams {
  text: string;
  languageCode: string;
  voiceId?: string;
  stability?: number;
  speed?: number;
}

export interface TTSSynthesizeResult {
  audioUrl: string;
  durationSeconds: number;
}

export interface TTSService {
  synthesize(params: TTSSynthesizeParams): Promise<TTSSynthesizeResult>;
}

export class MockTTSService implements TTSService {
  async synthesize(params: TTSSynthesizeParams): Promise<TTSSynthesizeResult> {
    const wordCount = params.text.split(/\s+/).length;
    const durationSeconds = Math.ceil((wordCount / 150) * 60);
    return {
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      durationSeconds,
    };
  }
}

export class ExternalTTSService implements TTSService {
  private readonly serviceUrl: string;
  private readonly apiKey: string;

  constructor() {
    if (!process.env.TTS_SERVICE_URL) {
      throw new Error('TTS_SERVICE_URL env var is required for ExternalTTSService');
    }
    this.serviceUrl = process.env.TTS_SERVICE_URL;
    this.apiKey = process.env.TTS_SERVICE_API_KEY ?? '';
  }

  async synthesize(params: TTSSynthesizeParams): Promise<TTSSynthesizeResult> {
    const response = await fetch(this.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTS_SERVICE_API_KEY': this.apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`TTS service responded ${response.status}: ${await response.text()}`);
    }

    return response.json() as Promise<TTSSynthesizeResult>;
  }
}

export function getTTSService(): TTSService {
  const provider = process.env.TTS_PROVIDER ?? 'external';
  return provider === 'mock' ? new MockTTSService() : new ExternalTTSService();
}
