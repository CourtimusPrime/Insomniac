// download-icons.ts
export const ICONS = [
  // AI
  'openai', 'claude', 'openrouter', 'gemini', 'mistral', 'huggingface',
  'perplexity', 'ollama', 'anthropic', 'cohere', 'stability',

  // Languages
  'typescript', 'javascript', 'python', 'rust', 'go', 'java',
  'kotlin', 'swift', 'csharp', 'cpp', 'ruby', 'php', 'elixir',
  'haskell', 'scala', 'dart', 'zig', 'lua', 'perl', 'r',

  // Runtimes & package managers
  'nodejs', 'deno', 'bun', 'npm', 'pnpm', 'yarn',

  // Frontend frameworks
  'react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte', 'sveltekit',
  'solidjs', 'astro', 'remix', 'gatsby', 'qwik',

  // CSS / UI
  'tailwind', 'bootstrap', 'materialui', 'antdesign', 'chakraui',
  'shadcn', 'radixui', 'styledcomponents', 'sass', 'postcss',

  // Backend frameworks
  'express', 'fastify', 'nestjs', 'hono', 'django', 'flask',
  'fastapi', 'rails', 'laravel', 'spring', 'gin',

  // Databases
  'postgresql', 'mysql', 'sqlite', 'mongodb', 'redis',
  'supabase', 'planetscale', 'neon', 'turso', 'cockroachdb',
  'cassandra', 'elasticsearch', 'dynamodb', 'firestore',

  // ORMs / query
  'prisma', 'drizzle', 'typeorm', 'sequelize', 'mongoose',

  // APIs
  'graphql', 'trpc', 'grpc', 'openapi',

  // Cloud providers
  'aws', 'azure', 'googlecloud', 'cloudflare', 'digitalocean',
  'linode', 'vultr', 'hetzner', 'ovh',

  // Hosting / deployment
  'vercel', 'netlify', 'railway', 'render', 'heroku', 'fly',
  'coolify', 'caprover',

  // DevOps / infra
  'docker', 'kubernetes', 'terraform', 'ansible', 'vagrant',
  'helm', 'pulumi', 'nomad', 'consul',

  // CI/CD
  'githubactions', 'circleci', 'jenkins', 'travisci', 'drone',
  'argocd', 'gitlabcicd',

  // VCS / collaboration
  'github', 'gitlab', 'bitbucket', 'gitea',

  // Editors & tools
  'vscode', 'neovim', 'jetbrains', 'webstorm', 'intellij',
  'cursor', 'zed', 'vim', 'emacs', 'sublime',

  // OS / platform
  'linux', 'ubuntu', 'debian', 'fedora', 'archlinux',
  'windows', 'apple', 'android', 'raspberrypi',

  // Browsers
  'chrome', 'firefox', 'safari', 'brave', 'arc',

  // Monitoring / observability
  'datadog', 'grafana', 'prometheus', 'sentry', 'newrelic',
  'opentelemetry', 'splunk', 'pagerduty',

  // Auth / security
  'auth0', 'clerk', 'okta', 'keycloak', 'supabase',

  // Payments
  'stripe', 'paypal', 'braintree', 'square',

  // Messaging / comms
  'twilio', 'sendgrid', 'resend', 'mailgun', 'postmark',

  // Design
  'figma', 'sketch', 'adobe', 'canva', 'invision',
  'framer', 'zeplin', 'storybook',

  // Collab / productivity
  'slack', 'discord', 'notion', 'confluence', 'jira',
  'linear', 'asana', 'trello', 'github', 'telegram',
  'obsidian', 'airtable', 'clickup',

  // Testing
  'jest', 'vitest', 'playwright', 'cypress', 'storybook',

  // Build tools
  'vite', 'webpack', 'rollup', 'esbuild', 'turbo', 'nx',

  // Mobile
  'reactnative', 'flutter', 'expo', 'capacitor',

  // Misc dev services
  'opencode', 'vercel', 'cloudinary', 'imgix', 'bunny',
  'algolia', 'meilisearch', 'typesense',
] as const

// Simple Icons CDN uses different slugs for some icons
const SLUG_MAP: Record<string, string> = {
  mistral: 'mistralai',
  gemini: 'googlegemini',
  java: 'openjdk',
  csharp: 'dotnet',
  vue: 'vuedotjs',
  nodejs: 'nodedotjs',
  nextjs: 'nextdotjs',
  cpp: 'cplusplus',
  tailwind: 'tailwindcss',
  materialui: 'mui',
  shadcn: 'shadcnui',
  solidjs: 'solid',
  sveltekit: 'svelte',
  rails: 'rubyonrails',
  cassandra: 'apachecassandra',
  firestore: 'firebase',
  openapi: 'openapiinitiative',
  googlecloud: 'googlecloud',
  gitlabcicd: 'gitlab',
  argocd: 'argo',
  intellij: 'intellijidea',
  chrome: 'googlechrome',
  sublime: 'sublimetext',
  emacs: 'gnuemacs',
  zed: 'zedindustries',
  reactnative: 'react',
  cockroachdb: 'cockroachlabs',
  rollup: 'rollupdotjs',
  raspberrypi: 'raspberrypi',
}

// Variant → hex color for Simple Icons CDN
const VARIANTS: Record<string, string | null> = {
  default: null,       // brand color
  light: '000000',     // black (for light backgrounds)
  dark: 'ffffff',      // white (for dark backgrounds)
}

const OUT_DIR = './public/icons'
const BASE = 'https://cdn.simpleicons.org'

// Deduplicate
const unique = [...new Set(ICONS)]
let ok = 0, fail = 0

for (const slug of unique) {
  const siSlug = SLUG_MAP[slug] ?? slug

  for (const [variant, color] of Object.entries(VARIANTS)) {
    const url = color ? `${BASE}/${siSlug}/${color}` : `${BASE}/${siSlug}`
    const res = await fetch(url)

    if (!res.ok) {
      if (variant === 'default') {
        console.log(`\x1b[31m✗ ${slug}\x1b[0m (not found as "${siSlug}")`)
        fail++
      }
      break // if default fails, skip other variants
    }

    const svg = await res.text()
    await Bun.write(`${OUT_DIR}/${slug}/${variant}.svg`, svg)

    if (variant === 'default') {
      ok++
    }
  }
}

console.log(`\nDone: ${ok} downloaded, ${fail} not found`)
if (fail > 0) {
  console.log('Run: bun validate-icons.ts to see which slugs need mapping')
}
