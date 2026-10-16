#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const requiredSections = [
  '## Required Environment',
  '## Core Endpoints',
  '## Operational Guidance',
];
const liveCatalogUrl = 'https://api.thirdfy.com/api/v1/agent/actions/catalog';

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function findSkillFiles(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const skillPath = path.join(root, entry.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) out.push(skillPath);
  }
  return out;
}

function parseInlineArray(raw) {
  const text = String(raw || '').trim();
  if (!text.startsWith('[') || !text.endsWith(']')) return [];
  const inner = text.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(content, filePath) {
  if (!content.startsWith('---\n')) {
    throw new Error(`${filePath}: missing YAML frontmatter start`);
  }
  const end = content.indexOf('\n---\n', 4);
  if (end < 0) {
    throw new Error(`${filePath}: missing YAML frontmatter end`);
  }
  const raw = content.slice(4, end);
  const map = new Map();
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }
  return { frontmatter: map, body: content.slice(end + 5) };
}

function parseSkillFrontmatter(frontmatter, filePath) {
  const metadataRaw = String(frontmatter.get('metadata') || '').trim();
  let metadata;
  try {
    metadata = JSON.parse(metadataRaw);
  } catch (error) {
    throw new Error(`${filePath}: metadata must be valid JSON`);
  }

  return {
    name: String(frontmatter.get('name') || '').trim(),
    description: String(frontmatter.get('description') || '').trim(),
    version: String(frontmatter.get('version') || '').replace(/['"]/g, '').trim(),
    homepage: String(frontmatter.get('homepage') || '').replace(/['"]/g, '').trim(),
    tags: parseInlineArray(frontmatter.get('tags')),
    metadata,
  };
}

function parseRegistryYaml(content, filePath) {
  const lines = content.split('\n');
  const registry = { version: null, generatedAt: null, pin: null, installUrl: null, skills: [], deployKeyAliases: {} };
  let current = null;
  let currentListKey = null;
  let inDeployKeyAliases = false;
  let currentDeployKey = null;
  let inDeploySkillsList = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^version:\s*/.test(line)) {
      registry.version = Number(String(line.split(':')[1] || '').trim());
      continue;
    }
    if (/^generatedAt:\s*/.test(line)) {
      registry.generatedAt = String(line.split(':').slice(1).join(':') || '').trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    if (/^pin:\s*/.test(line)) {
      registry.pin = String(line.split(':').slice(1).join(':') || '').trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    if (/^installUrl:\s*/.test(line)) {
      registry.installUrl = String(line.split(':').slice(1).join(':') || '').trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    if (/^deployKeyAliases:\s*$/.test(line)) {
      inDeployKeyAliases = true;
      currentDeployKey = null;
      inDeploySkillsList = false;
      continue;
    }
    if (inDeployKeyAliases) {
      if (/^skills:\s*$/.test(line)) {
        inDeployKeyAliases = false;
        continue;
      }
      const deployKeyHeader = line.match(/^  ([a-z0-9_]+):\s*$/);
      if (deployKeyHeader) {
        currentDeployKey = deployKeyHeader[1];
        registry.deployKeyAliases[currentDeployKey] = { skills: [] };
        inDeploySkillsList = false;
        continue;
      }
      if (line.match(/^    skills:\s*$/)) {
        inDeploySkillsList = true;
        continue;
      }
      const deploySkillItem = line.match(/^      -\s*(.+)\s*$/);
      if (deploySkillItem && currentDeployKey && inDeploySkillsList) {
        registry.deployKeyAliases[currentDeployKey].skills.push(deploySkillItem[1].trim());
      }
      continue;
    }
    if (/^skills:\s*$/.test(line)) {
      continue;
    }
    const skillStart = line.match(/^  - id:\s*(.+)\s*$/);
    if (skillStart) {
      current = { id: skillStart[1].trim(), rails: [], requiredEnv: [] };
      registry.skills.push(current);
      currentListKey = null;
      continue;
    }
    if (!current) continue;

    const listHeader = line.match(/^    ([A-Za-z0-9_]+):\s*$/);
    if (listHeader) {
      currentListKey = listHeader[1];
      current[currentListKey] = [];
      continue;
    }

    const deployKeysHeader = line.match(/^    deployKeys:\s*$/);
    if (deployKeysHeader) {
      currentListKey = 'deployKeys';
      current.deployKeys = [];
      continue;
    }

    const listItem = line.match(/^      -\s*(.+)\s*$/);
    if (listItem && currentListKey) {
      current[currentListKey].push(listItem[1].trim());
      continue;
    }

    const scalar = line.match(/^    ([A-Za-z0-9_]+):\s*(.+)\s*$/);
    if (scalar) {
      currentListKey = null;
      current[scalar[1]] = scalar[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  if (!registry.version || !Array.isArray(registry.skills)) {
    throw new Error(`${filePath}: registry.yaml is missing version or skills`);
  }

  return registry;
}

function loadDeployKeyContract() {
  const contractPath = path.join(repoRoot, 'schemas', 'deploy-key-contract.json');
  if (!fs.existsSync(contractPath)) {
    return { path: contractPath, contract: null };
  }
  const contract = JSON.parse(readText(contractPath));
  return { path: contractPath, contract };
}

function validateDeployKeyAliases(registry, registryById, errors) {
  const { contract } = loadDeployKeyContract();
  if (!contract?.deployKeys || typeof contract.deployKeys !== 'object') {
    errors.push('schemas/deploy-key-contract.json is missing deployKeys');
    return;
  }
  const aliases = registry.deployKeyAliases || {};
  for (const [deployKey, contractEntry] of Object.entries(contract.deployKeys)) {
    const aliasEntry = aliases[deployKey];
    if (!aliasEntry) {
      errors.push(`registry.yaml: deployKeyAliases missing key "${deployKey}" required by deploy-key-contract.json`);
      continue;
    }
    if (!sameList(aliasEntry.skills, contractEntry.skills)) {
      errors.push(
        `registry.yaml: deployKeyAliases.${deployKey}.skills does not match schemas/deploy-key-contract.json`
      );
    }
    for (const skillId of contractEntry.skills || []) {
      if (!registryById.has(skillId)) {
        errors.push(`registry.yaml: deployKeyAliases.${deployKey} references unknown skill id "${skillId}"`);
      }
    }
  }
  for (const deployKey of Object.keys(aliases)) {
    if (!contract.deployKeys[deployKey]) {
      errors.push(`registry.yaml: deployKeyAliases.${deployKey} is not declared in schemas/deploy-key-contract.json`);
    }
  }
  for (const skill of registry.skills) {
    const deployKeys = Array.isArray(skill.deployKeys) ? skill.deployKeys : [];
    for (const deployKey of deployKeys) {
      const aliasSkills = aliases[deployKey]?.skills || [];
      if (!aliasSkills.includes(String(skill.id))) {
        errors.push(
          `registry.yaml: skill "${skill.id}" lists deployKey "${deployKey}" but is missing from deployKeyAliases.${deployKey}.skills`
        );
      }
    }
  }
}

// The action catalog is public. `--live` checks every actionRef against it;
// THIRDFY_ACTION_CATALOG=<file> checks against a saved copy instead.
async function loadSnapshot() {
  const filePath = process.env.THIRDFY_ACTION_CATALOG;
  if (filePath) {
    const resolved = path.resolve(process.cwd(), filePath);
    return { path: resolved, snapshot: JSON.parse(readText(resolved)), warning: null };
  }
  if (process.argv.includes('--live')) {
    const response = await fetch(liveCatalogUrl);
    if (!response.ok) throw new Error(`Could not fetch ${liveCatalogUrl}: HTTP ${response.status}`);
    return { path: liveCatalogUrl, snapshot: await response.json(), warning: null };
  }
  return {
    path: liveCatalogUrl,
    snapshot: null,
    warning: 'Action catalog not loaded; run with --live to check actionRefs against it.',
  };
}

function validateDeployKeyActions(snapshot, errors) {
  const { contract } = loadDeployKeyContract();
  for (const [deployKey, entry] of Object.entries(contract?.deployKeys || {})) {
    for (const actionRef of entry.actionRefs || []) {
      if (!findSnapshotAction(snapshot, actionRef)) {
        errors.push(`schemas/deploy-key-contract.json: ${deployKey} action "${actionRef}" was not found in the catalog`);
      }
    }
  }
}

function normalizeList(values) {
  return Array.from(new Set((values || []).map((value) => String(value).trim()).filter(Boolean))).sort();
}

function sameList(a, b) {
  const left = normalizeList(a);
  const right = normalizeList(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function findSnapshotAction(snapshot, actionRef) {
  if (!snapshot?.actions || !Array.isArray(snapshot.actions)) return null;
  const ref = String(actionRef || '').trim();
  const canonical = snapshot.actions.find((entry) => String(entry.action || '').trim() === ref);
  if (canonical) return { entry: canonical, matchedByAlias: false };
  const aliasMatch = snapshot.actions.find(
    (entry) => Array.isArray(entry.aliases) && entry.aliases.map((item) => String(item)).includes(ref)
  );
  if (aliasMatch) return { entry: aliasMatch, matchedByAlias: true };
  return null;
}

function validate(filePath, registryById, snapshotState) {
  const content = readText(filePath);
  const { frontmatter, body } = parseFrontmatter(content, filePath);
  const missingKeys = ['name', 'description', 'version', 'tags', 'metadata'].filter((key) => !frontmatter.has(key));
  const errors = [];
  const warnings = [];
  if (missingKeys.length > 0) {
    errors.push(`${filePath}: missing required frontmatter keys: ${missingKeys.join(', ')}`);
    return { errors, warnings };
  }

  let parsed;
  try {
    parsed = parseSkillFrontmatter(frontmatter, filePath);
  } catch (error) {
    errors.push(String(error.message || error));
    return { errors, warnings };
  }

  if (parsed.name.length < 2) {
    errors.push(`${filePath}: name must be at least 2 characters`);
  }
  if (parsed.description.length < 8) {
    errors.push(`${filePath}: description must be at least 8 characters`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(parsed.version)) {
    errors.push(`${filePath}: invalid semver version "${parsed.version}"`);
  }
  if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
    errors.push(`${filePath}: tags must be a non-empty inline array`);
  }

  const openclaw = parsed.metadata?.openclaw;
  if (!openclaw || typeof openclaw !== 'object') {
    errors.push(`${filePath}: metadata.openclaw is required`);
  } else {
    const env = Array.isArray(openclaw?.requires?.env) ? openclaw.requires.env : [];
    if (!env.length) errors.push(`${filePath}: metadata.openclaw.requires.env must be a non-empty array`);
    if (!openclaw.primaryEnv || !env.includes(openclaw.primaryEnv)) {
      errors.push(`${filePath}: metadata.openclaw.primaryEnv must be included in requires.env`);
    }
    if (!Array.isArray(openclaw.rails) || openclaw.rails.length === 0) {
      errors.push(`${filePath}: metadata.openclaw.rails must be a non-empty array`);
    }
    if (!openclaw.executionModel) {
      errors.push(`${filePath}: metadata.openclaw.executionModel is required`);
    }
    if (!openclaw.integrationMode) {
      errors.push(`${filePath}: metadata.openclaw.integrationMode is required`);
    }
    if (!openclaw.custodyMode) {
      errors.push(`${filePath}: metadata.openclaw.custodyMode is required`);
    }
    if (!openclaw.compatibility || typeof openclaw.compatibility !== 'object') {
      errors.push(`${filePath}: metadata.openclaw.compatibility is required`);
    } else {
      if (!openclaw.compatibility.apiVersion) {
        errors.push(`${filePath}: metadata.openclaw.compatibility.apiVersion is required`);
      }
      if (!Array.isArray(openclaw.compatibility.supportedChains) || openclaw.compatibility.supportedChains.length === 0) {
        errors.push(`${filePath}: metadata.openclaw.compatibility.supportedChains must be a non-empty array`);
      }
      if (!openclaw.compatibility.executionModel) {
        errors.push(`${filePath}: metadata.openclaw.compatibility.executionModel is required`);
      } else if (String(openclaw.compatibility.executionModel) !== String(openclaw.executionModel)) {
        errors.push(`${filePath}: compatibility.executionModel must match metadata.openclaw.executionModel`);
      }
    }
    if (!openclaw.contract || typeof openclaw.contract !== 'object') {
      errors.push(`${filePath}: metadata.openclaw.contract is required`);
    } else {
      if (!openclaw.contract.actionRefsMode) {
        errors.push(`${filePath}: metadata.openclaw.contract.actionRefsMode is required`);
      }
      if (!openclaw.contract.snapshotSource) {
        errors.push(`${filePath}: metadata.openclaw.contract.snapshotSource is required`);
      }
      if (
        openclaw.contract.actionRefsMode === 'dynamic_discovery' &&
        !openclaw.contract.discoveryEndpoint
      ) {
        errors.push(`${filePath}: dynamic_discovery skills must declare contract.discoveryEndpoint`);
      }
      if (
        openclaw.contract.actionRefsMode === 'static' &&
        (!Array.isArray(openclaw.contract.actionRefs) || openclaw.contract.actionRefs.length === 0)
      ) {
        errors.push(`${filePath}: static contract skills must declare contract.actionRefs`);
      }
    }
    if (!openclaw.contributor || typeof openclaw.contributor !== 'object') {
      errors.push(`${filePath}: metadata.openclaw.contributor is required`);
    } else {
      if (typeof openclaw.contributor.allowsExternalContributions !== 'boolean') {
        errors.push(`${filePath}: metadata.openclaw.contributor.allowsExternalContributions must be boolean`);
      }
      if (!openclaw.contributor.reviewTier) {
        errors.push(`${filePath}: metadata.openclaw.contributor.reviewTier is required`);
      }
    }
  }

  for (const section of requiredSections) {
    if (!body.includes(section)) {
      errors.push(`${filePath}: missing required section "${section}"`);
    }
  }

  const executionModel = String(parsed.metadata?.openclaw?.executionModel || '').trim();
  const contractMode = String(parsed.metadata?.openclaw?.contract?.actionRefsMode || '').trim();
  const writeCapable =
    ['model_a', 'model_b', 'hosted'].includes(executionModel) ||
    Boolean(parsed.metadata?.openclaw?.contract?.executeIntentEndpoint) ||
    Boolean(parsed.metadata?.openclaw?.contract?.buildTxEndpoint);
  if (writeCapable && contractMode !== 'not_applicable') {
    const lowerBody = String(body || '').toLowerCase();
    if (!lowerBody.includes('idempotency')) {
      errors.push(`${filePath}: write-capable skills must document idempotency guidance`);
    }
    const hasPollingGuidance =
      lowerBody.includes('execute-intent/status') ||
      lowerBody.includes('poll') ||
      lowerBody.includes('wait for receipt') ||
      lowerBody.includes('tx.wait');
    if (!hasPollingGuidance) {
      errors.push(`${filePath}: write-capable skills must document polling/confirmation guidance`);
    }
  }

  const registryEntry = registryById.get(parsed.name);
  if (!registryEntry) {
    errors.push(`${filePath}: registry.yaml is missing an entry for skill id "${parsed.name}"`);
  } else {
    const relativePath = path.relative(repoRoot, filePath);
    if (String(registryEntry.version || '') !== parsed.version) {
      errors.push(`${filePath}: version mismatch with registry.yaml (${registryEntry.version} != ${parsed.version})`);
    }
    if (String(registryEntry.sourcePath || '') !== relativePath) {
      errors.push(`${filePath}: sourcePath mismatch with registry.yaml (${registryEntry.sourcePath} != ${relativePath})`);
    }
    if (!sameList(registryEntry.requiredEnv, parsed.metadata?.openclaw?.requires?.env || [])) {
      errors.push(`${filePath}: requiredEnv does not match registry.yaml`);
    }
    if (!sameList(registryEntry.rails, parsed.metadata?.openclaw?.rails || [])) {
      errors.push(`${filePath}: rails do not match registry.yaml`);
    }
    if (String(registryEntry.executionModel || '') !== String(parsed.metadata?.openclaw?.executionModel || '')) {
      errors.push(`${filePath}: executionModel does not match registry.yaml`);
    }
    if (String(registryEntry.integrationMode || '') !== String(parsed.metadata?.openclaw?.integrationMode || '')) {
      errors.push(`${filePath}: integrationMode does not match registry.yaml`);
    }
    if (String(registryEntry.custodyMode || '') !== String(parsed.metadata?.openclaw?.custodyMode || '')) {
      errors.push(`${filePath}: custodyMode does not match registry.yaml`);
    }
  }

  if (snapshotState.warning) {
    warnings.push(snapshotState.warning);
  }

  const snapshot = snapshotState.snapshot;
  const contract = parsed.metadata?.openclaw?.contract || {};
  if (snapshot) {
    const actionRefs = Array.isArray(contract.actionRefs) ? contract.actionRefs : [];
    for (const actionRef of actionRefs) {
      const found = findSnapshotAction(snapshot, actionRef);
      if (!found) {
        errors.push(`${filePath}: actionRef "${actionRef}" was not found in the Thirdfy action catalog`);
        continue;
      }
      const entry = found.entry;
      if (entry.enabled === false) {
        errors.push(`${filePath}: actionRef "${actionRef}" is disabled in the catalog`);
      }
      if (contract.buildTxEndpoint && entry.supportsBuildTx !== true) {
        errors.push(`${filePath}: actionRef "${actionRef}" does not advertise supportsBuildTx=true in the snapshot`);
      }
    }
  }

  return { errors, warnings };
}

async function main() {
  const registryPath = path.join(repoRoot, 'registry.yaml');
  const registry = parseRegistryYaml(readText(registryPath), registryPath);
  const registryById = new Map(registry.skills.map((skill) => [String(skill.id), skill]));
  const snapshotState = await loadSnapshot();
  const skillFiles = findSkillFiles(repoRoot);
  if (skillFiles.length === 0) {
    console.log('No SKILL.md files found.');
    return;
  }
  const errors = [];
  const warnings = new Set();
  for (const file of skillFiles) {
    const result = validate(file, registryById, snapshotState);
    if (result.errors.length === 0) {
      console.log(`OK ${path.relative(repoRoot, file)}`);
    }
    for (const warning of result.warnings) warnings.add(warning);
    errors.push(...result.errors);
  }

  if (warnings.size > 0) {
    console.warn('\nSkill validation warnings:');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  const registrySkillIds = new Set(registry.skills.map((skill) => String(skill.id)));
  for (const file of skillFiles) {
    const content = readText(file);
    const { frontmatter } = parseFrontmatter(content, file);
    const parsed = parseSkillFrontmatter(frontmatter, file);
    registrySkillIds.delete(parsed.name);
  }
  for (const danglingId of registrySkillIds) {
    errors.push(`registry.yaml: skill entry "${danglingId}" does not have a corresponding SKILL.md`);
  }

  validateDeployKeyAliases(registry, registryById, errors);

  if (!snapshotState.snapshot) {
    console.log(`\nCatalog check: skipped (run with --live)`);
  } else {
    validateDeployKeyActions(snapshotState.snapshot, errors);
    console.log(`\nCatalog check: using ${snapshotState.path}`);
  }

  if (errors.length > 0) {
    console.error('\nSkill validation failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log(`\nValidated ${skillFiles.length} skills successfully.`);
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
