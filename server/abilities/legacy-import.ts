import type { AbilityDocument } from './types.js';

export type LegacyFormat = 'skill-md' | 'bash' | 'mcp-json' | 'ability-yaml';

/**
 * Auto-detect the format of a raw text input.
 */
export function detectFormat(raw: string): LegacyFormat {
  const trimmed = raw.trim();

  // Ability YAML: starts with --- and has known section headers
  if (
    trimmed.startsWith('---') &&
    trimmed.includes('## Trigger') &&
    trimmed.includes('## Config')
  ) {
    return 'ability-yaml';
  }

  // SKILL.md: starts with --- (YAML frontmatter) but no Ability sections
  if (trimmed.startsWith('---')) {
    return 'skill-md';
  }

  // Bash script
  if (
    trimmed.startsWith('#!/bin/bash') ||
    trimmed.startsWith('#!/bin/sh') ||
    trimmed.startsWith('#!/usr/bin/env bash') ||
    /^(apt-get|npm|pip|brew)\s+(install|i)\b/m.test(trimmed)
  ) {
    return 'bash';
  }

  // MCP JSON: has mcpServers key
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && 'mcpServers' in parsed) {
      return 'mcp-json';
    }
  } catch {
    // Not JSON
  }

  // Default fallback
  return 'skill-md';
}

/**
 * Convert a legacy format into an AbilityDocument.
 */
export function convertLegacy(
  raw: string,
  format: LegacyFormat,
): AbilityDocument {
  switch (format) {
    case 'skill-md':
      return convertSkillMd(raw);
    case 'bash':
      return convertBash(raw);
    case 'mcp-json':
      return convertMcpJson(raw);
    case 'ability-yaml':
      throw new Error('ability-yaml should be parsed directly, not converted');
  }
}

function convertSkillMd(raw: string): AbilityDocument {
  const trimmed = raw.trim();

  if (!trimmed.startsWith('---')) {
    throw new Error('Invalid SKILL.md: missing frontmatter delimiter');
  }

  const closingIdx = trimmed.indexOf('---', 3);
  if (closingIdx === -1) {
    throw new Error('Invalid SKILL.md: unclosed frontmatter');
  }

  const frontmatterRaw = trimmed.slice(3, closingIdx).trim();
  const body = trimmed.slice(closingIdx + 3).trim();

  // Simple key: value parsing
  const fields: Record<string, string> = {};
  for (const line of frontmatterRaw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) fields[key] = value;
  }

  const name = fields.name ?? 'Imported Skill';
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    frontmatter: {
      id,
      name,
      version: '1.0.0',
      description: fields.description ?? '',
      tags: ['imported', 'skill'],
      author: fields.author ?? '',
      enabled: true,
    },
    trigger: fields.trigger ?? '',
    interface: { input: [], output: [] },
    config: {
      runtime: { executor: 'skill' },
    },
    instructions: body,
    examples: '',
    dependencies: [],
  };
}

function convertBash(raw: string): AbilityDocument {
  // Extract a name from the first non-shebang comment, or use "Imported Script"
  const firstComment = raw.match(/^#(?!!\/)\s*(.+)$/m);
  const name = firstComment ? firstComment[1].trim() : 'Imported Script';
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    frontmatter: {
      id,
      name,
      version: '1.0.0',
      description: `Imported bash script: ${name}`,
      tags: ['imported', 'command'],
      author: '',
      enabled: true,
    },
    trigger: `- Explicitly invoked via [${id}]`,
    interface: { input: [], output: [] },
    config: {
      runtime: {
        executor: 'command',
        entrypoint: raw,
      },
      timeout_seconds: 60,
    },
    instructions: 'Execute the script and return its output.',
    examples: '',
    dependencies: [],
  };
}

function convertMcpJson(raw: string): AbilityDocument {
  const parsed = JSON.parse(raw);
  const servers = parsed.mcpServers ?? {};
  const firstKey = Object.keys(servers)[0];

  if (!firstKey) {
    throw new Error('No MCP servers found in JSON');
  }

  const server = servers[firstKey];
  const id = firstKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    frontmatter: {
      id,
      name: firstKey,
      version: '1.0.0',
      description: `MCP server: ${firstKey}`,
      tags: ['imported', 'mcp'],
      author: '',
      enabled: true,
    },
    trigger: `- Any task requiring the ${firstKey} integration`,
    interface: { input: [], output: [] },
    config: {
      runtime: {
        executor: 'mcp',
        transport: server.transport ?? 'stdio',
        ...(server.url ? { url: server.url } : {}),
        ...(server.command ? { command: server.command } : {}),
        ...(server.args ? { args: server.args } : {}),
      },
      ...(server.tools ? { tools: server.tools } : {}),
    },
    instructions: 'Pass-through — select the correct tool based on intent.',
    examples: '',
    dependencies: [],
  };
}
