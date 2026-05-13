import { z } from 'zod';

export const StrategySchema = z.object({
  language: z.string().describe('BCP-47 language code e.g. "hi", "ta", "id"'),
  region: z.string(),
  targetPrice: z.number().describe('Acceptable deal price'),
  minimumPrice: z.number().describe('Walk-away price — never go below this'),
  openingOffer: z.number().describe('First offer to present on the call'),
  tone: z.enum(['assertive', 'friendly', 'deferential']),
  keyPoints: z.array(z.string()).describe('3-5 negotiation points to hit during the call'),
  culturalNotes: z.string().describe('Region-specific cultural guidance for this negotiation'),
  estimatedCallDurationSeconds: z.number(),
});

export type Strategy = z.infer<typeof StrategySchema>;

export const REGION_LANGUAGE_MAP = {
  'Maharashtra, India': 'hi',
  'Tamil Nadu, India': 'ta',
  'Karnataka, India': 'kn',
  'West Bengal, India': 'bn',
  'Jakarta, Indonesia': 'id',
  'Kuala Lumpur, Malaysia': 'ms',
  'Metro Manila, Philippines': 'fil',
  'Bangkok, Thailand': 'th',
  'Dubai, UAE': 'ar',
  Default: 'en',
} as const;

export type SupportedRegion = keyof typeof REGION_LANGUAGE_MAP;
