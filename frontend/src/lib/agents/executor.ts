import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import twilio from 'twilio';
import { type Strategy } from '../schemas/strategy';
import { getTTSService } from '../services/tts';

const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

export interface ExecutorInput {
  strategy: Strategy;
  customerName: string;
  phoneNumber: string;
}

export interface ExecutorOutput {
  script: string;
  audioUrl: string;
  callSid: string;
  durationSeconds: number;
}

export async function runExecutor(input: ExecutorInput): Promise<ExecutorOutput> {
  const modelId = process.env.EXECUTOR_MODEL ?? 'openai/gpt-4.1-mini';
  const { strategy, customerName, phoneNumber } = input;

  const { text: script } = await generateText({
    model: gateway(modelId),
    prompt: `Write a natural spoken phone call script in language "${strategy.language}" (BCP-47).

This is a B2B procurement negotiation call.

Context:
- Customer name: ${customerName}
- Region: ${strategy.region}
- Tone: ${strategy.tone}
- Cultural notes: ${strategy.culturalNotes}
- Opening offer: ${strategy.openingOffer}
- Target price: ${strategy.targetPrice}
- Minimum price (never reveal): ${strategy.minimumPrice}
- Key points: ${strategy.keyPoints.join('; ')}

Script structure — follow this order exactly:
1. GREETING: Culturally appropriate opening for ${strategy.region}
2. VALUE PROP: Why this deal benefits the customer
3. OFFER: Present the opening offer of ${strategy.openingOffer} with confidence
4. HANDLE OBJECTION: When they push back on price, counter with value; maximum concession is down to ${strategy.targetPrice}
5. CLOSE: Clear next step — verbal commitment or follow-up meeting

Write only the caller's spoken lines. Natural speech, no stage directions, no bullet points.
Language: ${strategy.language}`,
  });

  const ttsService = getTTSService();
  const { audioUrl, durationSeconds } = await ttsService.synthesize({
    text: script,
    languageCode: strategy.language,
  });

  // Skip real Twilio call in development unless explicitly forced
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_TWILIO !== 'true') {
    console.log(JSON.stringify({ event: 'twilio_skipped_dev_mode', phoneNumber, audioUrl }));
    return { script, audioUrl, callSid: 'mock-call-sid', durationSeconds };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  const call = await client.calls.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER!,
    twiml: `<Response><Play>${audioUrl}</Play></Response>`,
  });

  return { script, audioUrl, callSid: call.sid, durationSeconds };
}
