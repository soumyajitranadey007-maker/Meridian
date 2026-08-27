# Routes

Router: `frontend/src/App.tsx`, using React Router inside `AppShell` for authenticated routes.

| Path | Entry | Layout |
| --- | --- | --- |
| `/` | `src/pages/Landing.tsx` | Public |
| `/dashboard` | `src/pages/Dashboard.tsx` | AppShell |
| `/contracts` | `src/pages/Contracts.tsx` | AppShell |
| `/contracts/new` | `src/pages/CreateContract.tsx` | AppShell |
| `/contracts/:id` | `src/pages/ContractDetail.tsx` | AppShell |
| `/disputes` | `src/pages/Disputes.tsx` | AppShell |
| `/reputation` | `src/pages/Reputation.tsx` | AppShell |
| `/settings` | `src/pages/Settings.tsx` | AppShell |

`App.tsx` maps unknown routes to `/` and separates the public landing page from authenticated workspace composition.
