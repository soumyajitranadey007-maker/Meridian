# Shared components

## `frontend/src/components/Brand.tsx`

Compact Meridian compass mark and wordmark used in public and authenticated navigation.

```tsx
export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" aria-label="Meridian home" className="flex items-center gap-2.5 text-cream">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-ink shadow-mint"><Compass size={20} strokeWidth={2.5} /></span>
    {!compact && <span className="text-[15px] font-extrabold tracking-[.16em]">MERIDIAN</span>}
  </Link>;
}
```

## `frontend/src/components/StatusPill.tsx`

Semantic contract/milestone state chip with icon and accessible text.

```tsx
export function StatusPill({ status }: { status: MilestoneStatus }) {
  const Icon = status === "AI review ready" ? Sparkles : status === "Disputed" ? AlertTriangle : status === "Released" || status === "Approved" ? Check : CircleDot;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone[status]}`}><Icon size={12} />{status}</span>;
}
```

## `frontend/src/components/icons.tsx`

Local lightweight SVG icon factory used through the `lucide-react` Vite alias so the visual language remains consistent without third-party icon bundle resolution.
