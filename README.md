# Meridian

Meridian is an AI-audited milestone escrow application for freelancers and clients. It keeps funds, deliverables, and payment milestones on Stellar Soroban; the FastAPI service indexes those events, asks Gemini for neutral work-review signals, and streams updates to the React workspace.

> AI is advisory only. Fund releases always need an authorized on-chain client or arbitrator action.

## Architecture

```text
Freighter + React/Vite (Vercel)
          │ REST / HTTP polling
          ▼
FastAPI ─────────────► Gemini review + dispute summaries
   │
   ├──► Neon Postgres (contracts, events, reviews, evidence)
   │
   └──► Soroban RPC ◄── Stellar testnet
                       ├── factory contract → registered escrow instances
                       ├── reputation contract
                       └── arbitration contract
```

## What is included

- `contracts/`: Rust/Soroban workspace with a factory, registered escrow instances, reputation, and arbitration contracts. Cross-contract caller context is explicit and checked through the factory registry.
- `backend/`: async FastAPI, SQLAlchemy/Alembic migrations, Gemini integration with retry/rate limiting, and a request-safe event indexer for scheduled polling.
- `frontend/`: Vite + React + Tailwind workspace with Framer Motion, a Vercel-friendly landing hero, responsive pages, expandable/collapsible navigation, a Freighter profile panel, wallet-scoped empty states, and Vercel-served audited WASM artifacts for the protocol administrator bootstrap flow.
- `.github/workflows/`: layer-specific CI plus an opt-in deployment workflow.

## Product routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page using the supplied Meridian artwork as its background |
| `/dashboard` | Wallet-scoped, confirmed portfolio overview |
| `/contracts` and `/contracts/new` | Contract list and creation flow |
| `/contracts/:id` | Milestone detail, deliverable submission, and AI-assisted review |
| `/disputes` | Evidence capture and a neutral brief |
| `/reputation` | Score and on-chain history |
| `/settings` | Wallet, network, and notification preferences |

## Local development

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. It deliberately refuses API calls until `VITE_API_URL` is configured—there is no mock-data mode. Set every variable in [`frontend/.env.example`](frontend/.env.example), including the deployed factory contract ID. These values are public configuration; never put Gemini, database, or wallet secret keys in them.

For first-time Testnet setup, a protocol administrator can connect Freighter in **Settings** and select **Deploy Meridian protocol with Freighter**. This uploads the audited WASM files served from `frontend/public/contracts`, deploys and initializes the reputation, arbitration, and factory contracts, and shows the confirmed factory address. Add that value as `VITE_FACTORY_CONTRACT_ADDRESS` in Vercel so all users create escrow instances through the same audited factory.

### Backend

Use Python 3.11 or later and a Neon pooled Postgres URL in development/production. `DATABASE_URL` is mandatory; the service intentionally has no SQLite fallback.

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt # Windows: .venv\Scripts\pip.exe install -r requirements.txt
cp .env.example .env
alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

Set `DATABASE_URL`, `GEMINI_API_KEY`, contract addresses, `SOROBAN_RPC_URL`, and `FRONTEND_ORIGINS`. Use Neon’s `-pooler` host in deployed environments to prevent connection bursts from exhausting direct connections. Gemini lives only in the FastAPI service and malformed/unavailable responses are rejected rather than converted into a fabricated review.

### Soroban contracts

Install stable Rust, the `wasm32v1-none` target, and the current Stellar CLI. Then:

```bash
cd contracts
cargo test --workspace
stellar contract build --workspace
```

For testnet deployment, set `DEPLOYER_IDENTITY` and `TOKEN_ADDRESS`, then run `./deploy.sh`. It uploads the audited escrow WASM, deploys reputation → arbitration → factory, configures their addresses, and writes `contracts/deployed_addresses.json`. The factory creates registered escrow instances for users, so the protocol can safely support more than one agreement. A real contract ID exists only after the associated Stellar transaction reaches `SUCCESS`.

## Testing

```bash
cd contracts && cargo test --workspace
cd backend && pytest
cd frontend && npm run test && npm run build
```

## Deployment

Vercel reads root [`vercel.json`](vercel.json) as a two-service deployment: Vite builds and serves the frontend while FastAPI serves only `/api/*` and `/health`. Both deploy, preview, and roll back together under the same domain. In the Vercel project’s **Build and Deployment** settings, select the **Services** framework before deploying.

Configure both the public browser values in [`frontend/.env.example`](frontend/.env.example) and the private backend values in [`backend/.env.example`](backend/.env.example) in that same Vercel project. Keep `VITE_API_URL=/` to use the shared origin across production, preview, and custom-domain deployments. Meridian refreshes data over normal HTTP requests; it does not use WebSockets on Vercel. Do not prefix database or Gemini values with `VITE_`. Run Alembic migrations against Neon before the first production deployment. The GitHub Actions deployment workflow requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets; contract deployment remains opt-in.

## Testnet addresses and demo

Contract addresses and a real transaction hash are intentionally blank until a funded deployer identity or Freighter wallet signs a testnet deployment. Meridian never invents a contract address.

- Live demo: _pending deployment_
- Demo video: _pending recording_
