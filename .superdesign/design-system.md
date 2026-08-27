# Meridian design system

## Product and audience

Meridian is a milestone escrow workspace for freelance teams on Stellar. It helps clients fund work safely, freelancers demonstrate progress, and arbitrators resolve disputes with AI-prepared evidence summaries. The primary UI target is the authenticated dashboard; supporting flows include contract creation, a milestone timeline, deliverable review, dispute evidence, and reputation history.

The product must feel calm, fair, transparent, and operationally dependable. Avoid speculative crypto clichés, neon gradients, playful mascots, and dense trading-terminal patterns. Make status and money legible at a glance.

## Visual direction

- **Style source:** calm deep-teal fintech. Use it as a single visual direction, adapted for a collaboration and escrow product rather than banking.
- **Font:** Inter only, weights 400–800; tabular numerals for all amounts, scores, dates, and event sequences.
- **Canvas:** `#0F3D3E` deep teal with `#0A2A2B` darkest panels and `#134847` elevated cards.
- **Text:** warm cream `#EEF5F0`; primary at full opacity, body around 70%, muted metadata around 55–60%.
- **Primary accent:** mint `#4FD1C5`, used for decisive positive actions, verification, active live states, and approved/released values.
- **Risk status:** amber `#F4C978` for review or funding pending; coral `#EE806D` for disputes/errors; soft lilac `#B9A9FF` only for AI-assisted analysis badges. Use semantic color with text or icon labels—not color alone.
- **Surfaces:** frosted deep-teal glass, rounded 20–24px cards, subtle cream inset hairline (`rgba(238,245,240,.08)`) and expansive ambient shadows. No hard white outlines.
- **Layout:** responsive max-width 1440px shell, 24px desktop/16px mobile gutters, 12-column content grid on desktop. Dashboard has compact left rail, conversational top bar, headline/actions, metrics, active-contract table, and an event activity column.
- **Mobile:** desktop navigation collapses to a compact top bar; side rail becomes a sheet. Stacked cards and 44px touch targets are required at 375px.

## Core components

- **Brand:** a small mint Meridian compass/meridian-line mark next to the `MERIDIAN` wordmark. Use the mark consistently; it should signal precise, neutral coordination.
- **Buttons:** mint rounded-full primary button with a gentle mint glow; translucent cream-ring secondary button; destructive actions use coral text/ring without a large solid coral field.
- **Cards:** top labels use 11–12px uppercase tracking; monetary values use large tabular numerals. Include concise comparison or progress information rather than decorative charts.
- **Status chips:** `Funded` mint, `Awaiting review` amber, `AI review ready` lilac, `Disputed` coral, `Released` mint. Each chip includes a dot or leading icon and text.
- **Timeline:** a vertical milestone progression with numbered nodes and clear handoff timestamps. Use compact connecting lines, never an ambiguous multi-colored chart.
- **AI review panel:** show a clearly marked “Meridian AI review” header, a 0–100 completeness score ring or bar, a neutral summary, risk flags, and an explicit manual-approval fallback. AI must never imply it can decide payments.
- **Activity feed:** lifecycle events stream as individual rows with actor, action, related milestone, and time; live connection is a small accessible “Live” status, not an attention-grabbing animation.

## Motion for Framer Motion

- Use 160–240ms ease-out transitions, opacity + 8px vertical offset for entrances, and small 1.01 scale / surface tint on hover.
- Stagger dashboard cards by 40–60ms on first load; respect `prefers-reduced-motion`.
- Animate milestone status changes with a short color fade and connecting-line progress, not bouncing or looping effects.
- Use an unobtrusive pulse only on the live event indicator; never on balances, AI scores, or high-stakes actions.

## Dashboard composition

1. Sticky frosted header with wordmark, network badge (`Stellar Testnet`), live connection indicator, notifications, and Freighter wallet avatar.
2. Left navigation: Overview, Contracts, Disputes, Reputation; a compact “Create contract” CTA.
3. Welcome header: “Good morning, Aisha” with one-line portfolio health, plus `Create contract` and `Connect wallet` actions.
4. Three metric cards: total held in escrow, active milestones, and approval rate. Explain AI review as assistive, never final.
5. Main active-contracts card/table with client/freelancer counterparties, funded amount, milestone progress, AI review state, and next action.
6. Right “Live activity” rail showing on-chain lifecycle events and a small “Stellar testnet” provenance note.
7. Lower panel for a selected contract’s milestone timeline and AI review snapshot.

## Fidelity rule

Use only these fonts, colors, spacing, and component rules. Preserve high contrast, clear hierarchy, accessible labels, and an original Meridian identity. Do not add neon, arbitrary gradients, or visual styles outside this design system.
