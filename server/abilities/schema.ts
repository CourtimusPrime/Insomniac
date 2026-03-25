import Ajv from 'ajv';

const interfaceFieldSchema = {
  type: 'object',
  required: ['field', 'type'],
  properties: {
    field: { type: 'string' },
    type: { type: 'string' },
    required: { type: 'boolean' },
    description: { type: 'string' },
  },
  additionalProperties: false,
} as const;

const workflowStepSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
    use: { type: 'string' },
    type: { type: 'string', enum: ['gate'] },
    label: { type: 'string' },
    input: { type: 'object' },
    output: { type: 'string' },
    condition: { type: 'string' },
    message: { type: 'string' },
    on_error: { type: 'string', enum: ['stop', 'continue'] },
    on_reject: {
      type: 'object',
      properties: { goto: { type: 'string' } },
      required: ['goto'],
    },
  },
  additionalProperties: false,
} as const;

const runtimeConfigSchema = {
  type: 'object',
  required: ['executor'],
  properties: {
    executor: {
      type: 'string',
      enum: ['skill', 'command', 'mcp', 'workflow'],
    },
    // inline
    model: { type: 'string' },
    max_tokens: { type: 'number' },
    temperature: { type: 'number' },
    // shell
    entrypoint: { type: 'string' },
    working_directory: { type: 'string' },
    parse_output: { type: 'string', enum: ['json', 'text', 'lines'] },
    env: { type: 'object', additionalProperties: { type: 'string' } },
    // mcp
    transport: { type: 'string', enum: ['stdio', 'sse'] },
    url: { type: 'string' },
    command: { type: 'string' },
    args: { type: 'array', items: { type: 'string' } },
    auth: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['oauth', 'token', 'none'] },
        scopes: { type: 'array', items: { type: 'string' } },
        token_env: { type: 'string' },
      },
      required: ['type'],
    },
  },
  additionalProperties: false,
} as const;

export const abilityDocumentSchema = {
  type: 'object',
  required: [
    'frontmatter',
    'trigger',
    'interface',
    'config',
    'instructions',
    'examples',
    'dependencies',
  ],
  properties: {
    frontmatter: {
      type: 'object',
      required: [
        'id',
        'name',
        'version',
        'description',
        'tags',
        'author',
        'enabled',
      ],
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        version: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        author: { type: 'string' },
        enabled: { type: 'boolean' },
        icon: { type: 'string' },
      },
      additionalProperties: false,
    },
    trigger: { type: 'string' },
    interface: {
      type: 'object',
      required: ['input', 'output'],
      properties: {
        input: { type: 'array', items: interfaceFieldSchema },
        output: { type: 'array', items: interfaceFieldSchema },
      },
      additionalProperties: false,
    },
    config: {
      type: 'object',
      required: ['runtime'],
      properties: {
        runtime: runtimeConfigSchema,
        tools: { type: 'array', items: { type: 'string' } },
        memory: { type: 'string', enum: ['session', 'persistent', 'none'] },
        max_retries: { type: 'number' },
        timeout_seconds: { type: 'number' },
        on_error: { type: 'string', enum: ['stop', 'continue'] },
      },
      additionalProperties: true,
    },
    instructions: {
      oneOf: [{ type: 'string' }, { type: 'array', items: workflowStepSchema }],
    },
    examples: { type: 'string' },
    dependencies: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(abilityDocumentSchema);

export function validateAbility(doc: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const valid = validate(doc);
  if (valid) return { valid: true };

  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || '/'}: ${e.message}`,
  );
  return { valid: false, errors };
}
