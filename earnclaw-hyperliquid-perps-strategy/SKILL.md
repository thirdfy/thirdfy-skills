---
name: earnclaw-hyperliquid-perps-strategy
description: Hyperliquid perps strategy playbook for market evidence review, candidate ranking, and skip discipline
version: 1.1.0
homepage: https://docs.thirdfy.com/documentation/creators/earnorg-case-study
tags: [earnorg, hyperliquid, perps, strategy, context]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["agent_runtime"],"executionModel":"context_only","integrationMode":"api_connector","custodyMode":"managed","primaryRail":"context","contract":{"actionRefsMode":"not_applicable","snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"standard"},"compatibility":{"apiVersion":"v1","supportedChains":[42161],"executionModel":"context_only"},"deployKeys":["perps_market_scan"],"frameworkContract":["hermes","openclaw"]}}
---

# EarnOrg Hyperliquid Perps Strategy

Used by EarnOrg Hyperliquid templates (the folder keeps its original `earnclaw-` name). Context-only strategy skill for Hermes Hyperliquid perps agents. Pair with `thirdfy-hyperliquid-perps-read` for evidence reads and `thirdfy-cli-execution` for writes.

## Required Environment

Runs inside an EarnOrg-hosted Hermes or OpenClaw runtime, which provides `THIRDFY_AGENT_API_KEY` and `THIRDFY_AGENT_KEY` as secrets. Never put the key in prompts or files.

## Core Endpoints

Context-only skill. No direct HTTP writes. Evidence arrives through the Hermes adapter as `marketEvidence/v2` and optional Thirdfy CLI reads via `thirdfy-hyperliquid-perps-read`.

```bash
thirdfy-agent actions --provider hyperliquid --json
```

## Purpose

Use adapter-provided `marketEvidence` (`marketEvidence/v2`) as the primary Hyperliquid perps evidence contract.

## Required checks

- Confirm `marketEvidence.schemaVersion` is `marketEvidence/v2`.
- Inspect tier1 and promoted candidates with depth, candles, funding, and `evidenceQuality` before ranking.
- Treat `riskSummary`, `positionsSummary`, and `openOrdersSummary` as account exposure evidence.
- Compare venue-native Hyperliquid data before trusting optional signal skills.
- Derive technical features from candidate `candles` summaries when present.
- Never place orders from this skill. Execution remains adapter plus Thirdfy preflight.

## Skip discipline

- Emit exact reason codes when skipping: `NO_EDGE`, `SETUP_BLOCKED`, `POLICY_BLOCKED`, or adapter-provided blockers.
- Do not treat small balances as automatic holds. Inspect quote quality, depth, funding, and preflight evidence first.

## Operational Guidance

- Read `hyperliquid-perps-llm-context.json` and `marketEvidence` before authoring `hyperliquid-decision/v1`.
- Copy `preflight_ok` and `onboarding_ready` from context into the decision JSON when recommending execute.
