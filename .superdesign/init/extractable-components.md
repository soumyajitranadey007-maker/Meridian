# Extractable components

## AppShell
- Source: `frontend/src/components/AppShell.tsx`
- Category: layout
- Description: authenticated workspace frame with top bar and responsive mobile drawer.
- Extractable props: `connected`, `walletAddress`, `profileOpen`.
- Hardcoded: Meridian mark, deep-teal visual system, interaction timings.

## Sidebar
- Source: `frontend/src/components/Sidebar.tsx`
- Category: layout
- Description: workspace navigation that animates between full and compact states.
- Extractable props: `collapsed`, `activeItem`, `badgeCount`.
- Hardcoded: navigation labels, icon style, color system.

## StatusPill
- Source: `frontend/src/components/StatusPill.tsx`
- Category: basic
- Description: semantic workflow status tag.
- Extractable props: `status`.
- Hardcoded: status colors and icons.
