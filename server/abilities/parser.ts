import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { validateAbility } from './schema.js';
import type {
  AbilityConfig,
  AbilityDocument,
  AbilityFrontmatter,
  AbilityInterface,
  InterfaceField,
  WorkflowStep,
} from './types.js';

// ── Parsing ──

/**
 * Parse an Ability YAML file (hybrid YAML frontmatter + markdown body) into
 * a validated AbilityDocument.
 */
export function parseAbilityYaml(raw: string): AbilityDocument {
  const trimmed = raw.trim();

  // 1. Split frontmatter from body
  if (!trimmed.startsWith('---')) {
    throw new Error('Invalid ability YAML: missing frontmatter delimiter');
  }
  const closingIdx = trimmed.indexOf('---', 3);
  if (closingIdx === -1) {
    throw new Error('Invalid ability YAML: unclosed frontmatter');
  }
  const frontmatterRaw = trimmed.slice(3, closingIdx).trim();
  const body = trimmed.slice(closingIdx + 3).trim();

  // 2. Parse frontmatter
  const frontmatter = parseYaml(frontmatterRaw) as AbilityFrontmatter;

  // 3. Split body into sections by `## ` headings
  const sections = splitSections(body);

  // 4. Parse each section
  const trigger = sections['Trigger'] ?? '';
  const iface = parseInterfaceSection(sections['Interface'] ?? '');
  const config = parseConfigSection(sections['Config'] ?? '');
  const instructions = parseInstructionsSection(
    sections['Instructions'] ?? '',
    config.runtime.executor,
  );
  const examples = sections['Examples'] ?? '';
  const dependencies = parseDependenciesSection(sections['Dependencies'] ?? '');

  const doc: AbilityDocument = {
    frontmatter,
    trigger,
    interface: iface,
    config,
    instructions,
    examples,
    dependencies,
  };

  // 5. Validate
  const result = validateAbility(doc);
  if (!result.valid) {
    throw new Error(`Invalid ability document: ${result.errors?.join('; ')}`);
  }

  return doc;
}

// ── Serializing ──

/**
 * Reconstruct the hybrid YAML+markdown format from an AbilityDocument.
 */
export function serializeAbilityYaml(doc: AbilityDocument): string {
  const parts: string[] = [];

  // Frontmatter
  parts.push('---');
  parts.push(stringifyYaml(doc.frontmatter, { lineWidth: 0 }).trim());
  parts.push('---');
  parts.push('');

  // Trigger
  parts.push('## Trigger');
  parts.push('');
  parts.push(doc.trigger);
  parts.push('');

  // Interface
  parts.push('## Interface');
  parts.push('');
  parts.push('### Input');
  parts.push(serializeFieldTable(doc.interface.input));
  parts.push('');
  parts.push('### Output');
  parts.push(serializeFieldTable(doc.interface.output));
  parts.push('');

  // Config
  parts.push('## Config');
  parts.push('');
  parts.push(serializeConfig(doc.config));
  parts.push('');

  // Instructions
  parts.push('## Instructions');
  parts.push('');
  if (Array.isArray(doc.instructions)) {
    parts.push(stringifyYaml(doc.instructions, { lineWidth: 0 }).trim());
  } else {
    parts.push(doc.instructions);
  }
  parts.push('');

  // Examples
  parts.push('## Examples');
  parts.push('');
  parts.push(doc.examples);
  parts.push('');

  // Dependencies
  parts.push('## Dependencies');
  parts.push('');
  if (doc.dependencies.length === 0) {
    parts.push('# none');
  } else {
    for (const dep of doc.dependencies) {
      parts.push(`- ${dep}`);
    }
  }
  parts.push('');

  return parts.join('\n');
}

// ── Internal helpers ──

/** Split body by `## ` headings into { heading: content } map */
function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const regex = /^## (.+)$/gm;
  const headings: { name: string; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    headings.push({
      name: match[1].trim(),
      start: match.index + match[0].length,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const end =
      i + 1 < headings.length
        ? body.lastIndexOf('## ', headings[i + 1].start)
        : body.length;
    sections[headings[i].name] = body.slice(headings[i].start, end).trim();
  }

  return sections;
}

/** Parse Interface section with ### Input / ### Output sub-sections containing markdown tables */
function parseInterfaceSection(raw: string): AbilityInterface {
  const subSections = splitSubSections(raw);
  return {
    input: parseFieldTable(subSections['Input'] ?? ''),
    output: parseFieldTable(subSections['Output'] ?? ''),
  };
}

/** Split by `### ` sub-headings */
function splitSubSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const regex = /^### (.+)$/gm;
  const headings: { name: string; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    headings.push({
      name: match[1].trim(),
      start: match.index + match[0].length,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const end =
      i + 1 < headings.length
        ? raw.lastIndexOf('### ', headings[i + 1].start)
        : raw.length;
    sections[headings[i].name] = raw.slice(headings[i].start, end).trim();
  }

  return sections;
}

/** Parse a markdown table into InterfaceField[] */
function parseFieldTable(raw: string): InterfaceField[] {
  const lines = raw.split('\n').filter((l) => l.trim().startsWith('|'));
  // Skip header + separator lines (first two pipe-rows)
  const dataLines = lines.slice(2);

  return dataLines.map((line) => {
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const field: InterfaceField = {
      field: cells[0] ?? '',
      type: cells[1] ?? 'string',
    };

    // Handle "required" column — may contain "yes", "no", or be absent
    if (cells.length >= 3) {
      const req = cells[2].toLowerCase();
      if (req === 'yes' || req === 'true') field.required = true;
      else if (req === 'no' || req === 'false') field.required = false;
    }

    // Description column
    if (cells.length >= 4) {
      field.description = cells[3];
    }

    return field;
  });
}

/** Parse Config section as YAML, extract runtime and top-level config keys */
function parseConfigSection(raw: string): AbilityConfig {
  if (!raw.trim()) {
    return { runtime: { executor: 'skill' } };
  }

  const parsed = parseYaml(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    return { runtime: { executor: 'skill' } };
  }

  const runtime = (parsed.runtime as AbilityConfig['runtime']) ?? {
    executor: 'skill',
  };

  const config: AbilityConfig = { runtime };

  // Copy known top-level config keys
  for (const key of Object.keys(parsed)) {
    if (key === 'runtime') continue;
    (config as Record<string, unknown>)[key] = parsed[key];
  }

  return config;
}

/** Parse Instructions as prose (string) or workflow steps (YAML array) */
function parseInstructionsSection(
  raw: string,
  executor: string,
): string | WorkflowStep[] {
  if (executor === 'workflow') {
    // Workflow instructions are a YAML array of steps
    try {
      const parsed = parseYaml(raw);
      if (Array.isArray(parsed)) {
        return parsed as WorkflowStep[];
      }
    } catch {
      // Fall through to string
    }
  }
  return raw;
}

/** Parse Dependencies section — lines starting with `- ` */
function parseDependenciesSection(raw: string): string[] {
  return raw
    .split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .map((l) => l.trim().slice(2).trim());
}

/** Serialize InterfaceField[] into a markdown table */
function serializeFieldTable(fields: InterfaceField[]): string {
  if (fields.length === 0) {
    return '| Field | Type | Description |\n|-------|------|-------------|';
  }

  const hasRequired = fields.some((f) => f.required !== undefined);

  const header = hasRequired
    ? '| Field | Type | Required | Description |'
    : '| Field | Type | Description |';
  const sep = hasRequired
    ? '|-------|------|----------|-------------|'
    : '|-------|------|-------------|';

  const rows = fields.map((f) => {
    if (hasRequired) {
      const req =
        f.required === true ? 'yes' : f.required === false ? 'no' : '';
      return `| ${f.field} | ${f.type} | ${req} | ${f.description ?? ''} |`;
    }
    return `| ${f.field} | ${f.type} | ${f.description ?? ''} |`;
  });

  return [header, sep, ...rows].join('\n');
}

/** Serialize AbilityConfig back to YAML-in-markdown */
function serializeConfig(config: AbilityConfig): string {
  // Build a flat object with runtime nested
  const obj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (key === 'runtime') continue;
    obj[key] = value;
  }

  // Runtime goes last
  obj.runtime = config.runtime;

  return stringifyYaml(obj, { lineWidth: 0 }).trim();
}
