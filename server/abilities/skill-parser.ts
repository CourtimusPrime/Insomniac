export interface ParsedSkill {
  name: string;
  description: string;
  type: 'skill';
  config: {
    trigger: string;
    content: string;
  };
}

/**
 * Parse a Claude SKILL.md file into an Ability-compatible structure.
 * Expects YAML frontmatter delimited by `---` with name, description, trigger fields.
 */
export function parseSkillMd(raw: string): ParsedSkill {
  const trimmed = raw.trim();

  if (!trimmed.startsWith('---')) {
    throw new Error('Invalid SKILL.md: missing frontmatter delimiter');
  }

  const closingIndex = trimmed.indexOf('---', 3);
  if (closingIndex === -1) {
    throw new Error('Invalid SKILL.md: unclosed frontmatter');
  }

  const frontmatter = trimmed.slice(3, closingIndex).trim();
  const body = trimmed.slice(closingIndex + 3).trim();

  const fields: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key && value) {
      fields[key] = value;
    }
  }

  const name = fields.name;
  if (!name) {
    throw new Error("Invalid SKILL.md: missing 'name' in frontmatter");
  }
  if (name.length > 200) {
    throw new Error('Invalid SKILL.md: name must be 200 characters or fewer');
  }

  return {
    name,
    description: fields.description ?? '',
    type: 'skill',
    config: {
      trigger: fields.trigger ?? '',
      content: body,
    },
  };
}
