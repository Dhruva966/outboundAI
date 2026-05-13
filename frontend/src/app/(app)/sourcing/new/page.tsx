'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Sparkles, Save } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type Brief = {
  product: string
  quantity: number | null
  target_price: number | null
  ceiling_price: number | null
  supplier: string | null
  contact_name: string | null
  region: string
  relationship: string | null
  previous_order: string | null
  timeline: string | null
  concessions: string | null
  additional_notes: string | null
}

function BriefField({ label, value }: { label: string; value: string | number | null }) {
  if (value == null || value === 'unknown' || value === '') return null
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm text-foreground">{String(value)}</p>
    </div>
  )
}

export default function NewBriefPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleParse() {
    if (!rawText.trim() || rawText.length < 10) {
      toast.error('Describe your request first (min 10 characters)')
      return
    }
    setParsing(true)
    setStreamText('')
    setBrief(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast.error('Not authenticated'); setParsing(false); return }

    try {
      const res = await fetch(`${API_URL}/api/parse-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: rawText }),
      })

      if (!res.ok || !res.body) {
        toast.error('Failed to parse brief')
        setParsing(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const block of events) {
          const lines = block.split('\n')
          const eventLine = lines.find(l => l.startsWith('event:'))
          const dataLine = lines.find(l => l.startsWith('data:'))
          if (!eventLine || !dataLine) continue

          const event = eventLine.replace('event:', '').trim()
          const data = dataLine.replace('data:', '').trim()

          if (event === 'delta') {
            try { setStreamText(prev => prev + (JSON.parse(data).chunk ?? '')) } catch { /* ignore */ }
          } else if (event === 'brief') {
            try { setBrief(JSON.parse(data)) } catch { toast.error('Failed to parse brief') }
          } else if (event === 'error') {
            try { toast.error(JSON.parse(data).message ?? 'Parse error') } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      toast.error('Network error parsing brief')
      console.error(err)
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!brief) return
    setSaving(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast.error('Not authenticated'); setSaving(false); return }

    try {
      const res = await fetch(`${API_URL}/api/briefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...brief, raw_input: rawText }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Brief saved')
      router.push('/sourcing/briefs')
    } catch (err) {
      toast.error('Failed to save brief')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/sourcing/briefs" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base font-semibold">New Sourcing Brief</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Describe your deal — Claude will extract the details</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          className="w-full min-h-[140px] rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
          placeholder={'e.g. "Call Ramesh at Ravi Textiles about 1000 polo shirts, 100% cotton 180gsm. Target $4.20/unit, budget max $4.50. They\'re in Tirupur, India."'}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          disabled={parsing}
        />
        <button
          onClick={handleParse}
          disabled={parsing || rawText.length < 10}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {parsing ? 'Parsing…' : 'Parse Brief'}
        </button>
      </div>

      {/* Streaming JSON preview */}
      {streamText && !brief && (
        <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Extracting…
          </p>
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">{streamText}</pre>
        </div>
      )}

      {/* Parsed brief card */}
      {brief && (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-5 space-y-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Extracted Brief
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <BriefField label="Product" value={brief.product} />
            </div>
            <BriefField label="Quantity" value={brief.quantity != null ? `${brief.quantity} units` : null} />
            <BriefField label="Region" value={brief.region} />
            <BriefField label="Target Price" value={brief.target_price != null ? `$${brief.target_price}/unit` : null} />
            <BriefField label="Max Budget (hidden)" value={brief.ceiling_price != null ? `$${brief.ceiling_price}/unit` : null} />
            <BriefField label="Supplier" value={brief.supplier} />
            <BriefField label="Contact" value={brief.contact_name} />
            <BriefField label="Relationship" value={brief.relationship} />
            <BriefField label="Timeline" value={brief.timeline} />
            <div className="col-span-2">
              <BriefField label="Previous Order" value={brief.previous_order} />
            </div>
            <div className="col-span-2">
              <BriefField label="Concessions Available" value={brief.concessions} />
            </div>
            <div className="col-span-2">
              <BriefField label="Additional Notes" value={brief.additional_notes} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Brief'}
          </button>
        </div>
      )}
    </div>
  )
}
