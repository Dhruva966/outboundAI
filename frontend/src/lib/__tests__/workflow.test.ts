import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock agents before importing workflow
vi.mock('../agents/orchestrator', () => ({
  runOrchestrator: vi.fn().mockResolvedValue({
    language: 'hi',
    region: 'Maharashtra, India',
    targetPrice: 950,
    minimumPrice: 800,
    openingOffer: 1100,
    tone: 'friendly',
    keyPoints: ['Fast delivery', 'Bulk discount', 'Quality guarantee'],
    culturalNotes: 'Build rapport before price discussion.',
    estimatedCallDurationSeconds: 240,
  }),
}));

vi.mock('../agents/executor', () => ({
  runExecutor: vi.fn().mockResolvedValue({
    script: 'Namaste, main aapko call kar raha hoon...',
    audioUrl: 'https://example.com/audio.mp3',
    callSid: 'mock-call-sid',
    durationSeconds: 240,
  }),
}));

import { startNegotiationWorkflow, getWorkflow } from '../workflows/negotiation';

describe('negotiation workflow happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a workflow and eventually reaches complete status', async () => {
    const id = await startNegotiationWorkflow({
      customerName: 'Rajesh Kumar',
      region: 'Maharashtra, India',
      productType: 'Plastic components',
      desiredMargin: 20,
      phoneNumber: '+919876543210',
    });

    expect(id).toMatch(/^wf_/);

    // Poll until complete (mocks are instant)
    await new Promise((r) => setTimeout(r, 100));

    const state = getWorkflow(id);
    expect(state).toBeDefined();
    expect(state!.status).toBe('complete');
    expect(state!.strategy?.language).toBe('hi');
    expect(state!.result?.callSid).toBe('mock-call-sid');
  });
});
