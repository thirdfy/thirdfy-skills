---
name: earnclaw-hyperliquid-risk-guard
description: Hyperliquid perps risk guard and decision journal playbook for portfolio gates and reduce-only discipline
version: 1.1.0
homepage: https://docs.thirdfy.com/documentation/creators/earnorg-case-study
tags: [earnorg, hyperliquid, perps, risk, context]
metadata: {"openclaw":{"requires":{"env":["THIRDFY_AGENT_API_KEY"]},"primaryEnv":"THIRDFY_AGENT_API_KEY","rails":["agent_runtime"],"executionModel":"context_only","integrationMode":"api_connector","custodyMode":"managed","primaryRail":"context","contract":{"actionRefsMode":"not_applicable","snapshotSource":"https://api.thirdfy.com/api/v1/agent/actions/catalog"},"contributor":{"allowsExternalContributions":true,"reviewTier":"standard"},"compatibility":{"apiVersion":"v1","supportedChains":[42161],"executionModel":"context_only"},"deployKeys":["perps_execution_guard"],"frameworkContract":["hermes","openclaw"]}}
---

# EarnOrg Hyperliquid Risk Guard

Used by EarnOrg Hyperliquid templates (the folder keeps its original `earnclaw-` name). Context-only risk and journaling skill for Hyperliquid perps agents.

## Required Environment

Runs inside an EarnOrg-hosted Hermes or OpenClaw runtime, which provides `THIRDFY_AGENT_API_KEY` and `THIRDFY_AGENT_KEY` as secrets. Never put the key in prompts or files.

## Core Endpoints

Context-only skill. Writes flow through `thirdfy-cli-execution` after Thirdfy preflight passes.

```bash
thirdfy-agent actions --provider hyperliquid --json
```

## Purpose

Interpret Hyperliquid risk policy from context `risk` and `marketEvidence.riskSummary`. Maintain auditable decision hygiene using `decisionMemory` and `reflection`.

## Required checks

- Respect `addBlocked`, `addBlockedReason`, sizing hints, and free-margin policy.
- Read `plannedRiskExit`, `plannedRiskExitCoin`, `sessionHighEquityUsd`, and `baselineEquityUsd`.
- Do not recommend new LONG/SHORT adds on `plannedRiskExitCoin` when a deterministic de-risk plan is active.
- Do not recommend new adds when portfolio gate or risk manager would reject them.
- When new adds are blocked, prefer LLM-authored reduce-only orders to free headroom or take profit.
- Reference recent skips and trades from `decisionMemory.entries` when forming the next thesis.
- Record thesis, invalidation, evidence score, and portfolio gate outcome in the decision JSON.

## Operational Guidance

- Writes map to `place_hyperliquid_perps_order` and `cancel_hyperliquid_perps_order` through `thirdfy-cli-execution` only after preflight passes.
- Never bypass Thirdfy preflight or portfolio gate from skill prose alone.
