import { describe, it, expect, beforeEach } from 'vitest';
import { MockTTSService, ExternalTTSService } from '../services/tts';

describe('MockTTSService', () => {
  it('returns a non-empty audioUrl and positive durationSeconds', async () => {
    const svc = new MockTTSService();
    const result = await svc.synthesize({
      text: 'Hello, this is a negotiation script with many words to test duration calculation.',
      languageCode: 'en',
    });

    expect(result.audioUrl).toBeTruthy();
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('estimates duration proportional to word count', async () => {
    const svc = new MockTTSService();
    const short = await svc.synthesize({ text: 'Hello world', languageCode: 'en' });
    const long = await svc.synthesize({
      text: 'Hello world this is a much longer script that has many more words and should result in a longer estimated call duration',
      languageCode: 'en',
    });

    expect(long.durationSeconds).toBeGreaterThan(short.durationSeconds);
  });
});

describe('ExternalTTSService', () => {
  it('throws if TTS_SERVICE_URL is not set', () => {
    delete process.env.TTS_SERVICE_URL;
    expect(() => new ExternalTTSService()).toThrow('TTS_SERVICE_URL');
  });
});
