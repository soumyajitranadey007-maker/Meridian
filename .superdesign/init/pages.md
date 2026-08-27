# Page dependency trees

## `/` Landing
- `frontend/src/pages/Landing.tsx`
  - `frontend/src/components/Brand.tsx`
  - `frontend/public/meridian-hero.jpg`

## `/dashboard`
- `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/components/StatusPill.tsx`
  - `frontend/src/lib/mock.ts` (to be removed during production hardening)
  - `frontend/src/types.ts`

## `/contracts/:id`
- `frontend/src/pages/ContractDetail.tsx`
  - `frontend/src/components/StatusPill.tsx`
  - `frontend/src/lib/api.ts`
  - `frontend/src/lib/mock.ts` (to be removed)

## Shared authenticated routes
- `frontend/src/App.tsx`
  - `frontend/src/components/AppShell.tsx`
    - `frontend/src/components/Sidebar.tsx`
    - `frontend/src/components/Brand.tsx`
    - `frontend/src/hooks/useContractEvents.ts`
