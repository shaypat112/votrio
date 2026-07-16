FROM CLAUDE
# Votrio landing page — integration notes

## What changed, and why

The old page had a strong bone structure (terminal demo, laptop mockup,
theme toggle) but read as a generic "AI product" template: a single
gradient blob, a scan-line list with no visual payoff, and copy that
described the *company* ("AI security workflows") more than the *problem*
it solves for the visitor. Nothing in the first viewport told a founder or
security engineer, in five seconds, what Votrio actually finds and fixes.

This redesign is built around one idea carried through the whole page: a
**repository knowledge graph** — the same visual language Votrio's product
actually uses — appears in the hero as a live scan/find/fix animation, then
reappears in simpler forms as an attack-path chain and a risk-score gauge
in the product section. That's the "signature element": everything else
(nav, cards, footer) is deliberately quiet so that graph does the work.

Sections, in order, matching the brief:
Hero → Problem → Solution (6-step flow, a real sequence so it's numbered) →
Product showcase (terminal + risk gauge + attack path) → Features (8 cards) →
Trust/security → Founder/mission → Final CTA + waitlist form → Footer.

## File placement

Drop these into your existing Next.js app:

```
components/landing/               → app/components/landing/  (or wherever your components live)
page.tsx                          → app/page.tsx  (replace your current one)
```

The components import from `@/components/landing/...` — adjust that alias
if your project's landing components live somewhere other than
`components/landing` at the project root (check your `tsconfig.json`
`paths`).

## Assumptions this code makes about your existing project

- **Tailwind theme tokens** `background`, `foreground`, `card`,
  `border`, `muted-foreground`, and `primary` already exist (your original
  file used them, e.g. `bg-background`, `border-border`, `text-primary`),
  so no `tailwind.config` or `globals.css` changes are required.
- **Accent colors** (amber/red/emerald/blue for risk severity) use
  Tailwind's default palette directly (`amber-400`, `red-500`, etc.) rather
  than new theme tokens, so they'll render correctly regardless of your
  custom color setup.
- `useTheme` from `@/app/components/theme-provider` is unchanged from your
  original file.
- `framer-motion` and `lucide-react` are already dependencies (they were in
  your original file).

## Things you should personalize before shipping

- **`components/landing/Founder.tsx`** — `FOUNDER_NAME`, `FOUNDER_TITLE`,
  and `FOUNDER_INITIALS` are placeholders at the top of the file. The
  mission copy is written generically enough to work, but swap in your
  real story where you can — specifics beat a generic narrative.
- **`components/landing/FinalCTA.tsx`** — the waitlist form only sets
  local React state right now (`// TODO` marks the spot). Wire
  `handleSubmit` up to your actual backend, Resend/Loops list, or
  whatever you're using to collect emails.
- **`components/landing/Trust.tsx`** — copy is written to be true for any
  early-stage security product (read-only access, encryption, roadmap
  items) without claiming certifications you don't have yet. Update once
  you have real compliance milestones (SOC 2, etc.) to point to.
- **RiskGauge score** — currently hardcoded to `82` as a representative
  example in `ProductShowcase.tsx`. Feel free to change or make it prop-driven
  once you have a real scoring model to show.

## Optional upgrade: typography

The current setup uses your existing default sans font with tight tracking
to carry the display headlines, plus `font-mono` for labels, eyebrows, and
terminal/graph text — a deliberate pairing that reads as "technical
product" without requiring new font files. If you want to go further, a
distinct display face (e.g. Space Grotesk) via `next/font` in your root
`layout.tsx`, kept to headlines only, would sharpen the effect further —
but the page looks intentional without it.

