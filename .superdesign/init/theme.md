# Meridian theme

## Token summary

- Canvas: `#0f3d3e` teal; deepest surface: `#0a2a2b`; raised surface: `#134847`.
- Text: `#eef5f0` cream; primary action: `#4fd1c5` mint.
- Semantic: `#f4c978` review/attention, `#ee806d` dispute/error, `#b9a9ff` AI analysis.
- Font: Inter, 400–800, tabular figures for monetary values.
- Cards: `rounded-2xl`; inset cream hairline plus deep ambient `soft-card` shadow.
- Responsive breakpoints: Tailwind `sm`, `md`, `lg`, `xl`, `2xl`; 44px minimum controls.
- Motion: Framer Motion 160–240ms ease-out, 8–16px lift, low-key live pulse, reduced-motion support.

## Source

`frontend/src/styles.css` defines the root color system, `ringline`, `soft-card`, the image-backed landing hero, `dot-pulse`, and reduced-motion override. `frontend/tailwind.config.ts` maps the same colors and card shadows into Tailwind utilities.
