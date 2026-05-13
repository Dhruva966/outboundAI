'use client';

import { useState, useEffect, useRef } from 'react';
import { REGION_LANGUAGE_MAP, type SupportedRegion } from '@/lib/schemas/strategy';
import type { WorkflowState } from '@/lib/workflows/negotiation';

const REGIONS = Object.keys(REGION_LANGUAGE_MAP).filter((r) => r !== 'Default') as SupportedRegion[];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Queued...',
  planning: 'Building negotiation strategy...',
  executing: 'Generating script & placing call...',
  complete: 'Done',
  failed: 'Failed',
};

export default function NegotiatePage() {
  const [form, setForm] = useState({
    customerName: '',
    region: REGIONS[0],
    productType: '',
    desiredMargin: '20',
    phoneNumber: '',
  });
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!workflowId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/negotiate/${workflowId}`);
        const data: WorkflowState = await res.json();
        setState(data);
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(pollRef.current!);
        }
      } catch {
        // swallow poll errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [workflowId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setState(null);

    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setWorkflowId(data.workflowId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const isDone = state?.status === 'complete' || state?.status === 'failed';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Negotiator Agent</h1>
          <p className="text-sm text-gray-400 mt-1">
            AI plans a regional strategy then calls the supplier on your behalf.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Customer Name">
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Rajesh Kumar"
              className={inputCls}
            />
          </Field>

          <Field label="Region">
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value as SupportedRegion })}
              className={inputCls}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Product Type">
            <input
              required
              value={form.productType}
              onChange={(e) => setForm({ ...form, productType: e.target.value })}
              placeholder="Injection-molded plastic components"
              className={inputCls}
            />
          </Field>

          <Field label="Desired Margin (%)">
            <input
              required
              type="number"
              min={1}
              max={99}
              value={form.desiredMargin}
              onChange={(e) => setForm({ ...form, desiredMargin: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Phone Number">
            <input
              required
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+919876543210"
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={loading || (!!workflowId && !isDone)}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
          >
            {loading ? 'Starting...' : 'Start Negotiation Call'}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {state && (
          <div className="space-y-4">
            <StatusBar status={state.status} />

            {state.strategy && (
              <Section title="Strategy">
                <dl className="space-y-1.5 text-sm">
                  <Row label="Language" value={state.strategy.language} />
                  <Row label="Tone" value={state.strategy.tone} />
                  <Row label="Opening Offer" value={`$${state.strategy.openingOffer}`} />
                  <Row label="Target Price" value={`$${state.strategy.targetPrice}`} />
                  <Row label="Min Price" value={`$${state.strategy.minimumPrice}`} />
                  <Row
                    label="Est. Duration"
                    value={`${state.strategy.estimatedCallDurationSeconds}s`}
                  />
                  <div className="pt-1">
                    <span className="text-gray-400">Cultural Notes</span>
                    <p className="mt-1 text-gray-200">{state.strategy.culturalNotes}</p>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-400">Key Points</span>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      {state.strategy.keyPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </dl>
              </Section>
            )}

            {state.result && (
              <Section title="Generated Script">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {state.result.script}
                </pre>
                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span>Call SID: {state.result.callSid}</span>
                  <span>Duration: {state.result.durationSeconds}s</span>
                </div>
              </Section>
            )}

            {state.status === 'failed' && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {state.error ?? 'Workflow failed'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-100">{value}</span>
    </div>
  );
}

function StatusBar({ status }: { status: string }) {
  const isActive = status !== 'complete' && status !== 'failed';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
      {isActive && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
        </span>
      )}
      {status === 'complete' && (
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
      )}
      {status === 'failed' && (
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
      )}
      <span className="text-sm text-gray-300">{STATUS_LABELS[status] ?? status}</span>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
