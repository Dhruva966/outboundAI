import { runOrchestrator, type OrchestratorInput } from '../agents/orchestrator';
import { runExecutor, type ExecutorOutput } from '../agents/executor';
import { type Strategy } from '../schemas/strategy';

export type WorkflowStatus = 'pending' | 'planning' | 'executing' | 'complete' | 'failed';

export interface WorkflowState {
  id: string;
  status: WorkflowStatus;
  strategy?: Strategy;
  result?: ExecutorOutput;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowInput extends OrchestratorInput {
  phoneNumber: string;
}

// In-memory store — fine for demo. Swap for Vercel KV in prod.
const store = new Map<string, WorkflowState>();

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError!: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

function patch(id: string, update: Partial<WorkflowState>): void {
  const current = store.get(id);
  if (current) store.set(id, { ...current, ...update, updatedAt: Date.now() });
}

export function getWorkflow(id: string): WorkflowState | undefined {
  return store.get(id);
}

export async function startNegotiationWorkflow(input: WorkflowInput): Promise<string> {
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  store.set(id, {
    id,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fire-and-forget — API route returns immediately
  runWorkflow(id, input).catch((err) => {
    patch(id, { status: 'failed', error: (err as Error).message });
  });

  return id;
}

async function runWorkflow(id: string, input: WorkflowInput): Promise<void> {
  // Step 1: Plan
  patch(id, { status: 'planning' });

  const strategy = await withRetry(() =>
    runOrchestrator({
      customerName: input.customerName,
      region: input.region,
      productType: input.productType,
      desiredMargin: input.desiredMargin,
    })
  );

  console.log(JSON.stringify({ event: 'strategy_complete', workflowId: id, strategy }));
  patch(id, { strategy });

  // Step 2: Execute
  patch(id, { status: 'executing' });

  const result = await withRetry(() =>
    runExecutor({
      strategy,
      customerName: input.customerName,
      phoneNumber: input.phoneNumber,
    })
  );

  console.log(
    JSON.stringify({ event: 'execution_complete', workflowId: id, script: result.script })
  );
  patch(id, { status: 'complete', result });
}
