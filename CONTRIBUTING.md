# Contributing

Thanks for helping improve Thirdfy Skills.

## What belongs here

- Fixes and improvements to existing skills
- New skills that wrap actions already in the [Thirdfy action catalog](https://api.thirdfy.com/api/v1/agent/actions/catalog)

To add a new venue, protocol or bridge to the catalog itself, open a pull request on [thirdfy/agentkit](https://github.com/thirdfy/agentkit) instead.

## Skill layout

Each skill is a top-level folder whose name matches the skill's `name`:

```text
your-skill/
├── SKILL.md
└── references/   (optional)
```

`SKILL.md` starts with frontmatter (`name`, `description`, `version`, `homepage`, `tags`, and `metadata` as one line of JSON) and has these sections:

- `## Required Environment`: how the agent connects (MCP, CLI or key)
- `## Core Endpoints`: the tools, commands or routes the skill uses
- `## Operational Guidance`: the rules the agent must follow

Copy an existing skill as a starting point. `thirdfy-market-data` is a good read-only example; `thirdfy-private-actions` shows a skill that moves funds.

## Quality bar

- **Write for the agent.** Short sentences, one instruction each. Say *when* to use the skill in `description`.
- **Real examples only.** Every command and params example must run against production today.
- **Name only real actions.** List every action the skill calls in `metadata.openclaw.contract.actionRefs`. The validator checks them against the live catalog.
- **Writes need the safety steps:** check the venue, preview, get the user's yes, use an idempotency key, and poll status for fan-out runs.
- **No secrets.** Never commit keys, private keys or tokens, not even as examples. Use placeholders like `agent-...`.
- **No prices.** Don't state credit prices. Link https://thirdfy.com/credits instead.

## Before you open a pull request

- [ ] `node scripts/validate-skills.mjs --live` passes
- [ ] `registry.yaml` has an entry for the skill, matching its frontmatter (version, env, rails, execution model, custody mode)
- [ ] Examples were run against production
- [ ] Write-capable skills cover the safety steps above
- [ ] If you change a skill EarnOrg uses (see `deployKeyAliases` in `registry.yaml`), the folder name stays the same

## Security

Report vulnerabilities privately to the Thirdfy team before opening a public issue.
