---
name: thirdfy-cli-execution
description: Run Thirdfy actions with the thirdfy-agent CLI from a shell, script, cron job, Hermes or OpenClaw. Use when the agent can run shell commands and needs to discover actions, check a venue, preview and run a write, and poll its status.
version: 2.0.1
homepage: https://docs.thirdfy.com/documentation/agent-cli
tags: [thirdfy, cli, execution, hermes, openclaw]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY","THIRDFY_AGENT_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["cli","agent_wallet"],"executionModel":"hybrid","integrationMode":"cli","custodyMode":"managed","primaryRail":"agent_wallet","contract":{"catalogEndpoint":"/api/v1/agent/actions/catalog","discoveryEndpoint":"/api/v1/agent/actions","executeIntentEndpoint":"/api/v1/agent/execute-intent","statusEndpoint":"/api/v1/agent/execute-intent/status","actionRefsMode":"dynamic_discovery","actionRefs":["get_openmarket_btc_funding","place_hyperliquid_perps_order"],"snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"elevated"},"compatibility":{"apiVersion":"v1","supportedChains":[8453,42161,101,84532],"executionModel":"hybrid"}}}
---

# Thirdfy CLI execution

`thirdfy-agent` runs Thirdfy actions from a shell. Every command takes `--json` and prints a stable envelope: read `success`, `code` and `data`. This skill matches **CLI 0.5.1**.

## Required Environment

On a machine with a browser, sign in once:

```bash
npm install -g @thirdfy/agent-cli@0.5.1
thirdfy-agent login --trade --json     # drop --trade for read-only
thirdfy-agent whoami --json
```

In a runtime with no browser (Hermes, OpenClaw, cron, CI), set two secrets before it starts:

```bash
THIRDFY_AGENT_API_KEY=agent-...    # the agent API key
THIRDFY_AGENT_KEY=0x...            # the agent's 0x address (whoami: agent.agentKey)
THIRDFY_RUN_MODE=agent_wallet      # act from the agent's own execution wallet
```

If `THIRDFY_AGENT_KEY` is missing, runs fail with `MISSING_USER_DID`. Keep both values in the runtime's secret store, never in prompts or skill files.

Check at startup, and stop if it fails:

```bash
thirdfy-agent --version --json
thirdfy-agent doctor certify execution --json
```

Certify changes nothing. It checks the CLI and the venue writes your agent may call. Actions outside the agent's allowlist are listed under `skippedVenueActions`, not counted as failures. It needs CLI 0.5.1 or later.

## Core Endpoints

The CLI wraps these API routes:

- `GET /api/v1/agent/actions/catalog`: the full catalog, no auth
- `GET /api/v1/agent/actions`: the actions this agent may call
- `POST /api/v1/agent/execute-intent` and `GET /api/v1/agent/execute-intent/status`

## The loop

### 1. Discover

```bash
thirdfy-agent actions --provider hyperliquid --json
```

Plan only with actions this returns. Each one lists its params schema.

### 2. Read

Reads never move funds.

```bash
thirdfy-agent run --action get_openmarket_btc_funding --provider openmarket --json
```

The result is at `data.data.result`. In a `typed` block, use a value only when `parseIssues` is empty.

### 3. Before a write: check the venue

```bash
thirdfy-agent venue readiness hyperliquid --json
```

Continue only when `ready` is `true` and `blockingReasons` is empty. `thirdfy-agent venue fund hyperliquid --json` returns a funding plan and moves nothing.

### 4. Preview

```bash
thirdfy-agent preview --action place_hyperliquid_perps_order --provider hyperliquid \
  --params '{"coin":"ETH","isBuy":true,"size":0.01,"limitPx":2000,"orderType":"limit"}' --json
```

`wouldSign` says whether Thirdfy would sign it. Nothing is sent. Show your user the action and params, and wait for a clear yes.

### 5. Run

```bash
thirdfy-agent run --action place_hyperliquid_perps_order --provider hyperliquid \
  --params '{"coin":"ETH","isBuy":true,"size":0.01,"limitPx":2000,"orderType":"limit"}' \
  --idempotency-key "cycle-2026-10-16T14:00Z-eth" --confirm-writes --json
```

- Pass `--confirm-writes` on every write.
- Give each decision its own stable `--idempotency-key`, so a retried cycle never places the same order twice.
- Swaps take `amountInHuman` with `tokenInDecimals` (6 for USDC). Pass the USD size as `--estimated-amount-usd`, not inside `--params`.

### 6. Poll status

A run on one wallet returns its final state. A fan-out run returns an `intentId`. Poll it until it settles:

```bash
thirdfy-agent intent-status --intent-id "<intentId>" --json
```

## Operational Guidance

- Use `--run-mode agent_wallet` for the agent's own wallet. Use `hybrid` or `thirdfy` only after delegation is ready (`thirdfy-agent delegation status --json`).
- Solana (chain `101`) runs only with `agent_wallet`. Other modes fail with `SVM_REQUIRES_AGENT_WALLET`.
- Pass `--chain-id` for chain-specific actions. Most actions default to Base.
- If preflight or readiness returns a blocked reason, don't run. Report the `code` to your user.
- Keep each command's JSON in the run log as evidence.

## Common errors

| Error | Fix |
|-------|-----|
| `MISSING_USER_DID` | Set `THIRDFY_AGENT_KEY` to the agent's `0x` address |
| `401` | `THIRDFY_AGENT_API_KEY` is not set in the runtime |
| `DAILY_FREE_LIMIT_EXCEEDED` | Out of credits. See `thirdfy-buy-credits` |
| `POLICY_BLOCKED` / `DELEGATION_MISSING` | The agent's policy or delegation refuses it. Tell your user |

Full reference: https://docs.thirdfy.com/documentation/agent-cli/reference
