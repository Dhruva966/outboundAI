import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { StrategySchema, REGION_LANGUAGE_MAP, type Strategy } from '../schemas/strategy';

const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

export interface OrchestratorInput {
  customerName: string;
  region: string;
  productType: string;
  desiredMargin: number;
}

export async function runOrchestrator(input: OrchestratorInput): Promise<Strategy> {
  const modelId = process.env.ORCHESTRATOR_MODEL ?? 'anthropic/claude-opus-4-6';
  const languageCode =
    REGION_LANGUAGE_MAP[input.region as keyof typeof REGION_LANGUAGE_MAP] ?? 'en';

  const { object } = await generateObject({
    model: gateway(modelId),
    schema: StrategySchema,
    prompt: `You are a master negotiation strategist for international B2B procurement calls.

Build a complete negotiation strategy for this outbound call:

Customer Name: ${input.customerName}
Region: ${input.region}
Product Type: ${input.productType}
Desired Margin: ${input.desiredMargin}%
Required Language: ${languageCode} (BCP-47)

Rules:
- language must be exactly "${languageCode}"
- openingOffer must be 15-25% above minimumPrice (room to negotiate)
- targetPrice sits between openingOffer and minimumPrice
- keyPoints: 3-5 concrete negotiation angles (quality, delivery speed, volume discount, exclusivity, warranty)
- culturalNotes: specific etiquette for ${input.region} — greetings, directness norms, relationship vs. transaction culture
- tone: pick based on regional norms (assertive for Dubai, friendly for SE Asia, deferential for Japan/India)
- estimatedCallDurationSeconds: realistic for a B2B negotiation in this region (typically 180-420s)`,
  });

  return object;
}
