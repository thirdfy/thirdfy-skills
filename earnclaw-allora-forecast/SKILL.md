---
name: earnclaw-allora-forecast
description: Allora network forecast overlay for Hyperliquid perps agents via Thirdfy read actions
version: 1.1.0
homepage: https://docs.thirdfy.com/documentation/creators/earnorg-case-study
tags: [earnorg, allora, hyperliquid, signal, context]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["agent_runtime"],"executionModel":"context_only","integrationMode":"api_connector","custodyMode":"managed","primaryRail":"context","contract":{"actionRefsMode":"not_applicable","snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"standard"},"compatibility":{"apiVersion":"v1","supportedChains":[42161,8453],"executionModel":"context_only"},"deployKeys":["allora_forecast"],"frameworkContract":["hermes","openclaw"]}}
---

# EarnOrg Allora Forecast

Used by EarnOrg Hyperliquid templates (the folder keeps its original `earnclaw-` name). Advisory signal skill for Hyperliquid Allora Alpha templates. Allora output never authorizes execution alone.

## Required Environment

Runs inside an EarnOrg-hosted Hermes or OpenClaw runtime, which provides `THIRDFY_AGENT_API_KEY` and `THIRDFY_AGENT_KEY` as secrets. Never put the key in prompts or files.

## Core Endpoints

### Catalog / discovery

```bash
thirdfy-agent actions --provider hyperliquid --json
thirdfy-agent actions --provider hyperliquid --json
```

### Read actions

- `get_allora_price_inference`
- `get_allora_market_forecast`

## Purpose

Allora network forecasts (`signalEvidence/v1`) via Thirdfy `get_allora_price_inference` and `get_allora_market_forecast`.

## Required checks

- Read `signalEvidence.rows` for predictedValue, confidenceInterval, sourceMethod, and `forecastAlignment` versus referenceMid.
- Horizons are 5m and 8h only. Do not invent 1h, 4h, or 24h labels.
- Forecast divergence from venue mids requires stronger Hyperliquid depth and funding confirmation before adds.
- Compare `forecastAlignment` to venue mids before increasing size or leverage.
- Allora output never authorizes execution without setup, portfolioGate, and Thirdfy preflight.

## Operational Guidance

- Treat Allora as advisory overlay on `marketEvidence/v2`, not a standalone execution trigger.
- When `signalEvidence.fetchStatus=failed`, degrade confidence and do not add risk from forecast alone.
