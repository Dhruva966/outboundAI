import { NextRequest, NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/workflows/negotiation';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;
  const state = getWorkflow(workflowId);

  if (!state) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  return NextResponse.json(state);
}
