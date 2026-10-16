---
name: thirdfy-buy-credits
description: Check a Thirdfy agent's credits and top them up with USDC on Base, from the agent's wallet or with an x402 payment. Use when an action fails with DAILY_FREE_LIMIT_EXCEEDED, or the user asks about the agent's balance.
version: 2.0.0
homepage: https://docs.thirdfy.com/documentation/console/credits-and-balance
tags: [thirdfy, credits, x402, payments]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["credits","x402"],"executionModel":"utility","integrationMode":"monetization","custodyMode":"managed","primaryRail":"credits","contract":{"catalogEndpoint":"/api/v1/agent/actions/catalog","actionRefsMode":"static","actionRefs":["buy_agent_credits"],"snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"elevated"},"compatibility":{"apiVersion":"v1","supportedChains":[8453],"executionModel":"utility"}}}
---

# Thirdfy credits

Thirdfy charges credits for the actions it runs, and checks the balance before each one. Each account also gets a small number of free requests a day, used only when the paid balance can't cover an action.

## Required Environment

- MCP: any Thirdfy connection.
- CLI or HTTP: `THIRDFY_AGENT_API_KEY`. Over HTTP, send it in the `x-agent-api-key` header.

## Core Endpoints

| Task | MCP | CLI | HTTP |
|------|-----|-----|------|
| Balance | `getCreditsBalance` | `thirdfy-agent credits balance --json` | `GET /api/v1/agent/credits/balance` |
| Who would pay for an action | `quoteActionPricing` | `thirdfy-agent pricing quote --json` | |
| Buy from the agent's wallet | | `thirdfy-agent credits buy --usd <amount> --json` | |
| Buy with x402 | | | `POST /api/v1/agent/credits/buy-with-x402` |

## Top up

Always ask your user to approve the amount first. Never quote prices. Send your user to https://thirdfy.com/credits for them.

1. **Your user tops up.** The simplest way: https://thirdfy.com/credits, paying with USDC on Base.
2. **From the agent's wallet.** `thirdfy-agent credits buy --usd <amount> --json` pays with USDC from the agent's Base execution wallet.
3. **With x402.** If you hold your own x402-capable wallet, call `POST https://api.thirdfy.com/api/v1/agent/credits/buy-with-x402` with the agent key in `x-agent-api-key`. The first call answers `402` with the payment details. Sign the payment and repeat the call with the `PAYMENT-SIGNATURE` header. Success returns `200` with the settlement transaction in `PAYMENT-RESPONSE`.

Live top-up options (preset and custom amounts): `GET https://api.thirdfy.com/api/v1/credits/x402-metadata`.

## Operational Guidance

- Check the balance before a long run, not only after a failure.
- `DAILY_FREE_LIMIT_EXCEEDED` means the free requests are used up and the paid balance is empty. Stop and tell your user.
- Never retry a payment that already settled. Read the balance first.
- Never put the agent key or a payment signature in logs or chat.

Full x402 guide: https://docs.thirdfy.com/documentation/api/x402-outside-agents
