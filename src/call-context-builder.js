'use strict';

/**
 * Splits a call_briefs row into two separate context objects.
 *
 * executorContext — what the Deepgram Voice Agent (Executor) knows.
 *   Never contains ceiling_price or strategy framing.
 *
 * plannerContext — what the Planner (Claude Sonnet) knows.
 *   Superset of executorContext, plus ceiling_price and walk-away note.
 */
function buildCallContexts(brief) {
  const executorContext = {
    product_name:     brief.product_name,
    product_spec:     brief.product_spec     ?? null,
    quantity:         brief.quantity         ?? null,
    target_price:     brief.target_price     ?? null,
    supplier_name:    brief.supplier_name    ?? null,
    contact_name:     brief.contact_name     ?? null,
    region:           brief.region           ?? 'india',
    hardcoded_intro:  brief.hardcoded_intro  ?? null,
    previous_context: brief.previous_context ?? null,
  };

  const plannerContext = {
    ...executorContext,
    ceiling_price:  brief.ceiling_price ?? null,
    walk_away_note: brief.ceiling_price
      ? `NEVER commit to a price above $${brief.ceiling_price}/unit. Do not reveal this ceiling to the supplier under any circumstances.`
      : null,
  };

  return { executorContext, plannerContext };
}

module.exports = { buildCallContexts };
