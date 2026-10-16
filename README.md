# Thirdfy Skills

[![Validate Skills](https://github.com/thirdfy/thirdfy-skills/actions/workflows/validate-skills.yml/badge.svg)](https://github.com/thirdfy/thirdfy-skills/actions/workflows/validate-skills.yml)

Skills that teach an AI agent to use [Thirdfy](https://thirdfy.com): read market data, and trade, earn and move funds onchain with checks before any wallet moves.

Each skill is a folder with a `SKILL.md` file. They work in OpenClaw, Hermes, Claude Code and any runtime that installs skills from a folder or a repository URL.

## Start here

Install **`thirdfy`**. It covers connecting (MCP or CLI), the discover → check → preview → run loop, and the safety rules. Add the others when you need them.

| Skill | What it adds |
|-------|--------------|
| [`thirdfy`](thirdfy/SKILL.md) | **Start here.** Connect, find actions, check venues, preview and run writes safely |
| [`thirdfy-cli-execution`](thirdfy-cli-execution/SKILL.md) | The full `thirdfy-agent` CLI loop for shells, cron, Hermes and OpenClaw |
| [`thirdfy-market-data`](thirdfy-market-data/SKILL.md) | Trending tokens, prices, sentiment, funding, forecasts and yield. Read-only |
| [`thirdfy-hyperliquid-perps-read`](thirdfy-hyperliquid-perps-read/SKILL.md) | Hyperliquid markets, order book, candles, positions and orders. Read-only |
| [`thirdfy-private-actions`](thirdfy-private-actions/SKILL.md) | Private swaps and yield with Bermuda's shielded pool (Base Sepolia testnet) |
| [`thirdfy-buy-credits`](thirdfy-buy-credits/SKILL.md) | Check the agent's credits and top up with USDC or x402 |

EarnOrg's hosted Hyperliquid templates also use three strategy playbooks: [`earnclaw-hyperliquid-perps-strategy`](earnclaw-hyperliquid-perps-strategy/SKILL.md), [`earnclaw-hyperliquid-risk-guard`](earnclaw-hyperliquid-risk-guard/SKILL.md) and [`earnclaw-allora-forecast`](earnclaw-allora-forecast/SKILL.md).

## Install

**OpenClaw, Hermes and other runtimes that install by URL:** add this repository, then pick the skills.

```text
https://github.com/thirdfy/thirdfy-skills
```

**Claude Code:** copy a skill into your skills folder.

```bash
git clone https://github.com/thirdfy/thirdfy-skills
cp -r thirdfy-skills/thirdfy ~/.claude/skills/
```

**Any other agent:** point it at the skill file, or at the full agent guide: https://docs.thirdfy.com/agents.md

## Connect your agent to Thirdfy

Skills tell the agent *how* to use Thirdfy. The agent still needs a connection:

- **MCP:** add `https://mcp.thirdfy.com/mcp` to your host and sign in with Thirdfy. Works in Claude, ChatGPT, Cursor, Claude Code and Grok. [MCP guide](https://docs.thirdfy.com/documentation/mcp)
- **CLI:** `npm install -g @thirdfy/agent-cli`, then `thirdfy-agent login`. [CLI guide](https://docs.thirdfy.com/documentation/agent-cli)
- **Runtimes without a browser:** set `THIRDFY_AGENT_API_KEY` and `THIRDFY_AGENT_KEY` as secrets. [Hermes and OpenClaw guide](https://docs.thirdfy.com/documentation/agent-cli/hermes-openclaw)

Never put an agent key in a prompt, a skill file or a commit.

## How Thirdfy keeps agents safe

- Every action comes from one catalog, and each agent has its own allowlist and daily limit.
- Before a trade, the agent checks the venue and previews the write. Nothing moves until the user says yes.
- Thirdfy refuses anything that fails a check, and says why.

More: [How Thirdfy works](https://docs.thirdfy.com/documentation/platform/how-it-works) · [Delegation and protection](https://docs.thirdfy.com/documentation/delegation-and-protection)

## Guides

Step-by-step setups for Claude, ChatGPT, Grok, OpenClaw and Hermes: https://docs.thirdfy.com/documentation/guides

## Contributing

Improvements and new skills are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). To add a new venue, protocol or bridge to the catalog itself, see [Add an action provider](https://github.com/thirdfy/agentkit).

Check your changes:

```bash
node scripts/validate-skills.mjs --live
```

This checks every skill's frontmatter, the registry, and every action a skill names against the live [action catalog](https://api.thirdfy.com/api/v1/agent/actions/catalog).

## Support

- Questions: [Discord](https://discord.gg/thirdfy)
- Bugs in a skill: [open an issue](https://github.com/thirdfy/thirdfy-skills/issues)
- Security: report privately to the Thirdfy team before any public disclosure

## License

MIT. See [LICENSE](LICENSE).
