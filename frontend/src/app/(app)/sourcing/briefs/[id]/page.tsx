'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, PhoneCall, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type Brief = {
  id: string
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
  created_at: string
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className="text-sm">{String(value)}</p>
    </div>
  )
}

export default function BriefDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [launching, setLaunching] = useState(false)
  const [plannerStatus, setPlannerStatus] = useState<'idle' | 'planning' | 'ready'>('idle')

  useEffect(() => {
    async function fetchBrief() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Not authenticated'); return }

      try {
        const res = await fetch(`${API_URL}/api/briefs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { toast.error('Brief not found'); router.push('/sourcing/briefs'); return }
        setBrief(await res.json())
      } catch {
        toast.error('Failed to load brief')
      } finally {
        setLoading(false)
      }
    }
    fetchBrief()
  }, [id, router])

  async function handleStartCall() {
    if (!phone.trim()) { toast.error('Enter a phone number'); return }
    if (!brief) return

    setLaunching(true)
    setPlannerStatus('planning')

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast.error('Not authenticated'); setLaunching(false); setPlannerStatus('idle'); return }

    try {
      const res = await fetch(`${API_URL}/api/briefs/${id}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone_number: phone.trim() }),
      })
      if (!res.ok) {
        const err = await res.text()
        toast.error(`Failed to start call: ${err}`)
        setLaunching(false)
        setPlannerStatus('idle')
        return
      }
      const task = await res.json()
      setPlannerStatus('ready')
      await new Promise(r => setTimeout(r, 600))
      router.push(`/tasks/${task.id}`)
    } catch (err) {
      toast.error('Network error')
      console.error(err)
      setLaunching(false)
      setPlannerStatus('idle')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!brief) return null

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/sourcing/briefs" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base font-semibold line-clamp-1">{brief.product}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(brief.created_at).toLocaleDateString()} · {brief.region}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Brief details */}
        <div className="rounded-xl border border-border/60 bg-card px-6 py-5 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Brief Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Product" value={brief.product} /></div>
            <Field label="Quantity" value={brief.quantity != null ? `${brief.quantity} units` : null} />
            <Field label="Region" value={brief.region} />
            <Field label="Target Price" value={brief.target_price != null ? `$${brief.target_price}/unit` : null} />
            <Field label="Relationship" value={brief.relationship} />
            <Field label="Supplier" value={brief.supplier} />
            <Field label="Contact" value={brief.contact_name} />
            <Field label="Timeline" value={brief.timeline} />
            {brief.previous_order && (
              <div className="col-span-2"><Field label="Previous Order" value={brief.previous_order} /></div>
            )}
            {brief.concessions && (
              <div className="col-span-2"><Field label="Concessions Available" value={brief.concessions} /></div>
            )}
            {brief.additional_notes && (
              <div className="col-span-2"><Field label="Additional Notes" value={brief.additional_notes} /></div>
            )}
          </div>
        </div>

        {/* Right: Strategy panel */}
        <div className="rounded-xl border border-border/60 bg-card px-6 py-5 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Call Strategy
          </p>
          {plannerStatus === 'idle' && (
            <p className="text-sm text-muted-foreground/40 italic">
              Strategy compiles when you start the call.
            </p>
          )}
          {plannerStatus === 'planning' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Claude is compiling your negotiation strategy…</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {['Analyzing deal parameters', 'Building objection playbook', 'Cultural calibration', 'Finalizing playbook'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <span className="inline-block w-1 h-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
          {plannerStatus === 'ready' && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Strategy ready — connecting call…
            </div>
          )}
        </div>
      </div>

      {/* Call launcher */}
      <div className="rounded-xl border border-border/60 bg-card px-6 py-5 space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Launch Call
        </p>
        <div className="flex gap-3">
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={launching}
            className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 disabled:opacity-50"
          />
          <button
            onClick={handleStartCall}
            disabled={launching || !phone.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {launching
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <PhoneCall className="w-3.5 h-3.5" />
            }
            {launching ? (plannerStatus === 'ready' ? 'Connecting…' : 'Planning…') : 'Start Call'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/40">
          Claude will compile a negotiation strategy (~5s) before the call connects.
        </p>
      </div>
    </div>
  )
}
