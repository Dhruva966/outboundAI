'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Pre-call planner: Claude Opus 4.7 reads the sourcing brief and compiles
 * a complete call playbook. Runs once before the call starts (~3-8s).
 * The playbook becomes the executor's (GPT-4o Realtime) system prompt.
 *
 * ceiling_price is used to inform strategy but NEVER appears in output.
 */
async function generateCallPlaybook(brief) {
  const regionNote = brief.region === 'india'
    ? `Region-specific note: Supplier is in India. Include practical cultural communication signals for Indian business context (e.g. interpreting "level best", "checking with sir", vague timelines). Do not stereotype — focus on practical communication risk management.`
    : `Region: ${brief.region}. Include any relevant communication or procurement notes.`;

  const prompt = `You are compiling a call playbook for a voice agent about to call an overseas supplier by phone.
The agent's name is Sarah. She works for a small American business called Apex Brands.
She will speak live with the supplier. Keep everything spoken — this is a phone call, not an email.

DEAL PARAMETERS (confidential — inform strategy, never quote ceiling price in output):
Product: ${brief.product}
Target price: $${brief.target_price}/unit
Ceiling (walk-away): $${brief.ceiling_price}/unit [NEVER include this number anywhere in the playbook]
Supplier: ${brief.supplier}
Region: ${brief.region}

${regionNote}

Write a ~500 word call playbook with these sections, using plain text section headers (all caps, no markdown):

ROLE
Who Sarah is and who she's calling (1-2 sentences).

OPENING
The exact words Sarah should say on her first turn. Verbatim. Natural, warm, referencing the relationship.

CONVERSATION FLOW
Step-by-step: rapport (turns 1-2), introduce quantity (turn 3), price probe (turn 4+), negotiation, close.

OBJECTION PLAYBOOK
5 likely objections specific to this product and region. For each: objection → Sarah's exact counter response.

CULTURAL SIGNALS
4-6 practical signals specific to this region. What phrase means what, how to respond.

STALL PHRASES
3 phrases Sarah can say verbatim to buy thinking time.

CLOSING
How to confirm the outcome, say goodbye, and call mark_complete. If no deal, how to exit gracefully and call mark_complete.

HARD RULES
5 non-negotiable rules. Include: never reveal a maximum price or budget ceiling. Never accept a price above target without probing. Keep responses to 1-3 sentences (phone call). Others as appropriate.

Output plain text only. No markdown. No bullet dashes. No numbered lists. Just section headers and paragraphs.
The first line must be: "You are Sarah, a sourcing agent for Apex Brands."`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    const playbook = msg.content.find(b => b.type === 'text')?.text?.trim() || '';
    logger.info({ supplier: brief.supplier, chars: playbook.length }, 'call playbook generated');
    return playbook;
  } catch (err) {
    logger.error({ err: err.message }, 'generateCallPlaybook failed — using fallback');
    return `You are Sarah, a sourcing agent for Apex Brands. You are calling ${brief.supplier} to negotiate pricing for ${brief.product}. Your target is $${brief.target_price} per unit. Be professional, concise, and friendly. Build rapport before discussing price. When the call is complete, call mark_complete with a summary of the outcome.`;
  }
}

module.exports = { generateCallPlaybook };
