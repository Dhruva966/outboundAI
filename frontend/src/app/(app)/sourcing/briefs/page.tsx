import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, FileText } from 'lucide-react'

export default async function BriefsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: briefs } = await supabase
    .from('call_briefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Sourcing Briefs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Saved negotiation playbooks</p>
        </div>
        <Link
          href="/sourcing/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Brief
        </Link>
      </div>

      {/* Table */}
      {briefs && briefs.length > 0 ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Product</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Supplier</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Target</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Region</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Created</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((brief, i) => (
                <tr
                  key={brief.id}
                  className={`border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/sourcing/briefs/${brief.id}`} className="hover:text-primary transition-colors line-clamp-1">
                      {brief.product}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{brief.supplier || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {brief.target_price ? `$${brief.target_price}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      {brief.region}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(brief.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No briefs yet</p>
          <Link
            href="/sourcing/new"
            className="text-xs text-primary hover:underline"
          >
            Create your first brief →
          </Link>
        </div>
      )}
    </div>
  )
}
