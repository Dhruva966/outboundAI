'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingDown, DollarSign, MessageSquare } from 'lucide-react'

type Transcript = { id: number; role: string; content: string }

type NegotiationState = {
  stage: 'intro' | 'price_discovery' | 'negotiation' | 'closing' | 'complete'
  pricesMentioned: { price: number; role: string; snippet: string }[]
  latestOffer: { price: number; role: string; snippet: string } | null
  keyTermsCovered: { label: string; found: boolean }[]
}

function extractNegotiationState(transcripts: Transcript[]): NegotiationState {
  const pricesMentioned = transcripts.flatMap(t =>
    [...t.content.matchAll(/\$?([\d]+(?:\.\d{1,4})?)\s*(?:per\s*unit|\/unit|each)?/gi)]
      .map(m => ({ price: parseFloat(m[1]), role: t.role, snippet: t.content.slice(0, 80) }))
      .filter(m => m.price > 0.5 && m.price < 1000)
  )

  const latestOffer = [...pricesMentioned].filter(m => m.role === 'user').at(-1) ?? null

  const allText = transcripts.map(t => t.content.toLowerCase()).join(' ')
  const keyTermsCovered = [
    { label: 'Price discussed', found: pricesMentioned.length > 0 },
    { label: 'Quantity mentioned', found: /\d+\s*(units?|pcs?|pieces?|shirts?|polo)/i.test(allText) },
    { label: 'Lead time', found: /lead\s*time|delivery|ship|ready/i.test(allText) },
    { label: 'MOQ confirmed', found: /minimum|moq|order\s*qty/i.test(allText) },
  ]

  const count = transcripts.length
  let stage: NegotiationState['stage'] = 'intro'
  if (count > 12 || /thank|goodbye|deal|agreed|confirm/i.test(allText)) stage = 'closing'
  else if (pricesMentioned.length > 0) stage = 'negotiation'
  else if (count > 4 || /price|cost|rate|quote/i.test(allText)) stage = 'price_discovery'

  return { stage, pricesMentioned, latestOffer, keyTermsCovered }
}

const stageLabels: Record<NegotiationState['stage'], { label: string; color: string }> = {
  intro:           { label: 'Intro',           color: 'text-blue-400' },
  price_discovery: { label: 'Price Discovery', color: 'text-amber-400' },
  negotiation:     { label: 'Negotiating',     color: 'text-orange-400' },
  closing:         { label: 'Closing',         color: 'text-emerald-400' },
  complete:        { label: 'Complete',        color: 'text-emerald-400' },
}

type Props = {
  transcripts: Transcript[]
  userContext: string | null
}

export function NegotiationPanel({ transcripts, userContext }: Props) {
  const [playbookOpen, setPlaybookOpen] = useState(false)
  const state = extractNegotiationState(transcripts)
  const stageInfo = stageLabels[state.stage]

  return (
    <div className="space-y-3">
      {/* Deal State Card */}
      <div className="rounded-xl border border-border/60 bg-card px-5 py-4 space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Deal State
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Stage</p>
            <p className={`text-sm font-medium ${stageInfo.color}`}>{stageInfo.label}</p>
          </div>
          {state.latestOffer && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1">
                <DollarSign className="w-2.5 h-2.5" />
                Their Offer
              </p>
              <p className="text-sm font-medium">${state.latestOffer.price}/unit</p>
            </div>
          )}
        </div>

        {/* Price timeline */}
        {state.pricesMentioned.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1">
              <TrendingDown className="w-2.5 h-2.5" />
              Prices Mentioned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {state.pricesMentioned.slice(-6).map((p, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    p.role === 'user'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  ${p.price}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key terms */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" />
            Key Terms
          </p>
          <div className="grid grid-cols-2 gap-1">
            {state.keyTermsCovered.map(({ label, found }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <span className={found ? 'text-emerald-400' : 'text-muted-foreground/30'}>
                  {found ? '✓' : '○'}
                </span>
                <span className={found ? 'text-foreground/70' : 'text-muted-foreground/40'}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible playbook */}
      {userContext && (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <button
            onClick={() => setPlaybookOpen(!playbookOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/10 transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Call Playbook
            </p>
            {playbookOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
            }
          </button>
          {playbookOpen && (
            <div className="px-5 pb-5 border-t border-border/40">
              <pre className="text-xs text-muted-foreground/70 font-mono whitespace-pre-wrap leading-relaxed pt-3 max-h-80 overflow-y-auto">
                {userContext}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
