# Shared layouts

## `frontend/src/components/AppShell.tsx`

Authenticated layout: sticky top bar, a desktop collapsible sidebar, mobile drawer, live socket indicator, account control, and `<Outlet />` page content.

```tsx
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const connected = useContractEvents(useCallback(() => undefined, []));
  return <div className="grain min-h-screen bg-teal text-cream">
    <header>{/* Stellar network, live state, notification and account controls */}</header>
    <div className="mx-auto flex max-w-[1536px] gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="min-w-0 flex-1"><Outlet /></main>
    </div>
    <AnimatePresence>{mobileOpen && <motion.div>{/* mobile drawer */}</motion.div>}</AnimatePresence>
  </div>;
}
```

## `frontend/src/components/Sidebar.tsx`

Motion-driven expanding/collapsing workspace navigation. Props: `collapsed: boolean`, `onToggle: () => void`.
