import { NextRequest, NextResponse } from 'next/server';
import { startNegotiationWorkflow } from '@/lib/workflows/negotiation';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, region, productType, desiredMargin, phoneNumber } = body as Record<
    string,
    string
  >;

  if (!customerName || !region || !productType || !desiredMargin || !phoneNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const workflowId = await startNegotiationWorkflow({
    customerName,
    region,
    productType,
    desiredMargin: Number(desiredMargin),
    phoneNumber,
  });

  return NextResponse.json({ workflowId, status: 'initiated' });
}
