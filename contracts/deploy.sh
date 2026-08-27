#!/usr/bin/env bash
set -euo pipefail

# Requires `stellar` CLI, a configured/funded testnet deployer, and a token
# contract address. The factory is the only deployed address clients need in
# order to create audited escrow instances through Freighter.
: "${DEPLOYER_IDENTITY:?Set DEPLOYER_IDENTITY to a configured stellar identity}"
: "${TOKEN_ADDRESS:?Set TOKEN_ADDRESS to the Stellar token contract address}"
NETWORK="${NETWORK:-testnet}"
ARBITRATOR_IDENTITY="${ARBITRATOR_IDENTITY:-$DEPLOYER_IDENTITY}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$ROOT/dist"

stellar contract build --out-dir "$OUT_DIR"

ESCROW_WASM_HASH=$(stellar contract upload --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --wasm "$OUT_DIR/meridian_escrow.wasm")
REPUTATION=$(stellar contract deploy --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --wasm "$OUT_DIR/meridian_reputation.wasm")
ARBITRATION=$(stellar contract deploy --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --wasm "$OUT_DIR/meridian_arbitration.wasm")
FACTORY=$(stellar contract deploy --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --wasm "$OUT_DIR/meridian_factory.wasm")

# Initialize after all IDs exist, avoiding circular deployment dependencies.
stellar contract invoke --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --id "$REPUTATION" -- initialize --admin "$DEPLOYER_IDENTITY" --factory "$FACTORY" --arbitration "$ARBITRATION"
stellar contract invoke --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --id "$ARBITRATION" -- initialize --admin "$DEPLOYER_IDENTITY" --arbitrator "$ARBITRATOR_IDENTITY" --reputation "$REPUTATION" --factory "$FACTORY"
stellar contract invoke --network "$NETWORK" --source-account "$DEPLOYER_IDENTITY" --id "$FACTORY" -- initialize --admin "$DEPLOYER_IDENTITY" --escrow-wasm-hash "$ESCROW_WASM_HASH" --token "$TOKEN_ADDRESS" --reputation "$REPUTATION" --arbitration "$ARBITRATION"

printf '{\n  "network": "%s",\n  "factory": "%s",\n  "reputation": "%s",\n  "arbitration": "%s",\n  "escrow_wasm_hash": "%s"\n}\n' "$NETWORK" "$FACTORY" "$REPUTATION" "$ARBITRATION" "$ESCROW_WASM_HASH" > "$ROOT/deployed_addresses.json"
cat "$ROOT/deployed_addresses.json"
