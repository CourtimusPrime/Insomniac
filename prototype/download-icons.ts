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

// --- Fallback: Simple Icons CDN slug map ---
const SI_SLUG_MAP: Record<string, string> = {
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

// --- Fallback: gilbarbara/logos slug map ---
const GB_SLUG_MAP: Record<string, string> = {
  azure: 'microsoft-azure',
  vscode: 'visual-studio-code',
  aws: 'aws',
  dynamodb: 'aws-dynamodb',
  stability: 'stability-ai',
  windows: 'microsoft-windows',
  fly: 'fly',
  bunny: 'bunny-net',
  neon: 'neon-icon',
}

async function fetchFromSimpleIcons(slug: string, destDir: string): Promise<boolean> {
  const siSlug = SI_SLUG_MAP[slug] ?? slug
  const base = 'https://cdn.simpleicons.org'

  const res = await fetch(`${base}/${siSlug}`)
  if (!res.ok) return false

  // Simple Icons supports color variants
  const variants: [string, string | null][] = [
    ['original.svg', null],
    ['light.svg', '000000'],
    ['dark.svg', 'ffffff'],
  ]

  for (const [filename, color] of variants) {
    const url = color ? `${base}/${siSlug}/${color}` : `${base}/${siSlug}`
    const r = await fetch(url)
    if (!r.ok) continue
    const svg = await r.text()
    await Bun.write(`${destDir}/${filename}`, svg)
    console.log(`  \x1b[32m✓\x1b[0m ${destDir.split('/').pop()}/${filename} \x1b[2m(simpleicons)\x1b[0m`)
  }
  return true
}

async function fetchFromGilbarbara(slug: string, destDir: string): Promise<boolean> {
  const gbSlug = GB_SLUG_MAP[slug] ?? slug
  const base = 'https://cdn.jsdelivr.net/gh/gilbarbara/logos@main/logos'

  const res = await fetch(`${base}/${gbSlug}.svg`)
  if (!res.ok) return false

  const svg = await res.text()
  await Bun.write(`${destDir}/original.svg`, svg)
  console.log(`  \x1b[32m✓\x1b[0m ${slug}/original.svg \x1b[2m(gilbarbara)\x1b[0m`)
  return true
}

let ok = 0, fail = 0

for (const slug of slugs) {
  const destDir = `${OUT_DIR}/${slug}`

  // Clean existing folder for a fresh install
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true })
  }

  // 1. Try devicon (local, full-color originals + plain variants)
  const devSlug = findDevicon(slug)
  if (devSlug) {
    const srcDir = `${SRC_DIR}/${devSlug}`
    const files = readdirSync(srcDir).filter(f => f.endsWith('.svg'))

    for (const file of files) {
      const renamed = file.replace(`${devSlug}-`, '')
      cpSync(`${srcDir}/${file}`, `${destDir}/${renamed}`)
      console.log(`  \x1b[32m✓\x1b[0m ${slug}/${renamed}`)
    }
    ok++
    continue
  }

  // 2. Fallback: Simple Icons CDN (monochrome with color variants)
  if (await fetchFromSimpleIcons(slug, destDir)) {
    ok++
    continue
  }

  // 3. Fallback: gilbarbara/logos (single full-color SVG)
  if (await fetchFromGilbarbara(slug, destDir)) {
    ok++
    continue
  }

  console.log(`\x1b[31m✗ ${slug}\x1b[0m (not found in any source)`)
  fail++
}

console.log(`\nDone: ${ok} installed, ${fail} not found`)
