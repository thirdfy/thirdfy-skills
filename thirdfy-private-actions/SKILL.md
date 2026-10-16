---
name: thirdfy-private-actions
description: Keep an agent's funds private with Thirdfy and Bermuda, a compliant shielded pool. Shield USDC, swap and earn from the shielded balance, and withdraw. Base Sepolia testnet only. Use only when the user asks for privacy.
version: 1.0.0
homepage: https://docs.thirdfy.com/documentation/platform/private-agents
tags: [thirdfy, privacy, bermuda, testnet]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["mcp","cli","agent_wallet"],"executionModel":"hybrid","integrationMode":"api_connector","custodyMode":"managed","primaryRail":"agent_wallet","contract":{"catalogEndpoint":"/api/v1/agent/actions/catalog","discoveryEndpoint":"/api/v1/agent/actions","actionRefsMode":"static","actionRefs":["get_bermuda_setup_status","get_bermuda_balance","bermuda_deposit","bermuda_transfer","bermuda_withdraw","bermuda_stealth_swap","bermuda_stealth_earn","bermuda_stealth_exit","bermuda_sweep_burners","swap","deposit_earn_position","withdraw_earn_position"],"snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"elevated"},"compatibility":{"apiVersion":"v1","supportedChains":[84532],"executionModel":"hybrid"}}}
---

# Thirdfy private actions (testnet)

Private actions keep the agent's money in Bermuda's shielded pool, so its swaps and deposits are not linked to its public wallet. They run on **Base Sepolia (chain `84532`)** with test USDC. Use them only when your user asks for privacy.

Connect first with the `thirdfy` skill. Steps that move funds need **Trade** access.

## Required Environment

- MCP: a Thirdfy connection with **Trade** access, or an agent key header.
- CLI: a signed-in `thirdfy-agent` (`login --trade`), or `THIRDFY_AGENT_API_KEY` and `THIRDFY_AGENT_KEY` in the runtime, with `--run-mode agent_wallet`.

## Core Endpoints

| Action | What it does |
|--------|--------------|
| `get_bermuda_setup_status` | Is the pool ready? Look for `writeReady: true`. Read-only |
| `get_bermuda_balance` | The shielded balance (USDC, WETH, vault shares) |
| `bermuda_deposit` | Shield USDC from the agent's public wallet |
| `bermuda_stealth_swap` | Private swap from the shielded balance |
| `bermuda_stealth_earn` | Private vault deposit |
| `bermuda_stealth_exit` | Private vault exit (`amount`, or `all: true`) |
| `bermuda_transfer` | Move shielded USDC between the agent's own private accounts |
| `bermuda_withdraw` | Unshield USDC to a public address (the agent's wallet by default) |
| `bermuda_sweep_burners` | Return leftovers from past private swaps |

`swap`, `deposit_earn_position` and `withdraw_earn_position` also accept `private: true` when the agent is allowed that action. Thirdfy refuses a private action it can't run privately. It never falls back to public.

## From zero

1. Check readiness and the balance:

```bash
thirdfy-agent run --action get_bermuda_setup_status --provider bermuda --params '{"chainId":84532}' --json
thirdfy-agent run --action get_bermuda_balance --provider bermuda --params '{"chainId":84532}' --json
```

2. Your user sends Base Sepolia test USDC from https://faucet.circle.com to the agent's execution wallet.

3. With your user's yes, shield it:

```bash
thirdfy-agent run --action bermuda_deposit --provider bermuda --run-mode agent_wallet \
  --params '{"chainId":84532,"amountUsdc":1}' --confirm-writes --json
```

4. With your user's yes, swap privately:

```bash
thirdfy-agent run --action bermuda_stealth_swap --chain-id 84532 --run-mode agent_wallet \
  --params '{"chainId":84532,"tokenIn":"USDC","tokenOut":"WETH","amount":"1"}' \
  --estimated-amount-usd 1 --confirm-writes --json
```

Over MCP, call the same actions with `walletExecute`, for example `walletExecute { action: "bermuda_stealth_swap", chainId: 84532, estimatedAmountUsd: 1, params: { chainId: 84532, tokenIn: "USDC", tokenOut: "WETH", amount: "1" } }`.

## Operational Guidance

- Preview each write first (`thirdfy-agent preview` with the same flags, or `previewOrder`), and get your user's yes before it runs.
- Give each write an idempotency key (`--idempotency-key`), so a retry never shields or swaps twice.
- A private write takes about 30 seconds, because the pool builds a proof. The response carries the final result. Read `get_bermuda_balance` to confirm.
- Testnet limits: 5 USD per private write, up to 3% slippage on swaps, USDC and WETH only, one MetaMorpho USDC vault.
- Share the `privacyNotes` tips with your user: round amounts, time between steps, withdraw to a fresh address.
- Shielding hides the money between moves. The trades and pool deposits and withdrawals are still visible onchain.

## Common errors

| Error | Meaning |
|-------|---------|
| `BERMUDA_COMPLIANCE_UNAVAILABLE` | Bermuda's compliance service is down. Reads work; retry writes later |
| `BERMUDA_INSUFFICIENT_UTXO` | Not enough shielded balance. Shield more first |
| `PRIVATE_NOT_SUPPORTED` | That action has no private version |
| `CHAIN_NOT_SUPPORTED` | Use `chainId: 84532` |
