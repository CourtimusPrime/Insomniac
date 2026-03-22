// download-icons.ts
// Usage:
//   bun download-icons.ts                          # install all default icons
//   bun download-icons.ts cloudflare neon duckdb   # install specific icons only
//
// Source: devicon (node_modules/devicon/icons/)
// Copies original (full-color) and plain (mono) variants to public/icons/

import { cpSync, rmSync, existsSync, readdirSync } from 'fs'

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

// Our slug → devicon folder name (where they differ)
export const SLUG_MAP: Record<string, string> = {
  nodejs: 'nodejs',
  nextjs: 'nextjs',
  cpp: 'cplusplus',
  csharp: 'csharp',
  tailwind: 'tailwindcss',
  materialui: 'materialui',
  rails: 'rails',
  reactnative: 'react',
  sveltekit: 'svelte',
  aws: 'amazonwebservices',
  azure: 'azure',
  googlecloud: 'googlecloud',
  vscode: 'vscode',
  intellij: 'intellijidea',
  chrome: 'chrome',
  sublime: 'sublimetext',
  cockroachdb: 'cockroachdb',
  firestore: 'firebase',
  archlinux: 'archlinux',
  raspberrypi: 'raspberrypi',
  rollup: 'rollup',
  gitlabcicd: 'gitlab',
  windows: 'windows11',
  cypress: 'cypressio',
  framer: 'framermotion',
  slack: 'slack',
  travisci: 'travis',
}

const SRC_DIR = './node_modules/devicon/icons'
const OUT_DIR = './public/icons'

// CLI args override the default list
const args = Bun.argv.slice(2)
const slugs = args.length > 0 ? args : [...new Set(ICONS)]

// Build an index of available devicon folders for loose matching
const available = new Set(readdirSync(SRC_DIR))

function findDevicon(slug: string): string | null {
  // 1. Exact match via slug map
  const mapped = SLUG_MAP[slug]
  if (mapped && available.has(mapped)) return mapped

  // 2. Direct match
  if (available.has(slug)) return slug

  // 3. Try common suffixes/prefixes
  for (const variant of [`${slug}js`, `${slug}dotjs`, `apache${slug}`]) {
    if (available.has(variant)) return variant
  }

  return null
}

let ok = 0, fail = 0

for (const slug of slugs) {
  const devSlug = findDevicon(slug)

  if (!devSlug) {
    console.log(`\x1b[31m✗ ${slug}\x1b[0m (not in devicon)`)
    fail++
    continue
  }

  const srcDir = `${SRC_DIR}/${devSlug}`
  const destDir = `${OUT_DIR}/${slug}`
  const files = readdirSync(srcDir).filter(f => f.endsWith('.svg'))

  // Clean existing folder for a fresh install
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true })
  }

  // Copy SVGs, renaming to consistent names:
  //   {name}-original.svg         → original.svg
  //   {name}-original-wordmark.svg → original-wordmark.svg
  //   {name}-plain.svg            → plain.svg
  //   {name}-plain-wordmark.svg   → plain-wordmark.svg
  let copied = 0
  for (const file of files) {
    // Strip the icon name prefix: "react-original.svg" → "original.svg"
    const renamed = file.replace(`${devSlug}-`, '')
    cpSync(`${srcDir}/${file}`, `${destDir}/${renamed}`)
    console.log(`  \x1b[32m✓\x1b[0m ${slug}/${renamed}`)
    copied++
  }

  if (copied > 0) ok++
}

console.log(`\nDone: ${ok} installed, ${fail} not found`)
