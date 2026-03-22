// validate-icons.ts
import { ICONS } from './download-icons'

// Must stay in sync with download-icons.ts SLUG_MAP
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

const BASE = 'https://cdn.simpleicons.org'
const unique = [...new Set(ICONS)]

const results = await Promise.all(
  unique.map(async (slug) => {
    const siSlug = SLUG_MAP[slug] ?? slug
    const res = await fetch(`${BASE}/${siSlug}`)
    return { slug, siSlug, ok: res.ok }
  })
)

const valid = results.filter(r => r.ok)
const missing = results.filter(r => !r.ok)

console.log(`\x1b[32m✓ ${valid.length} valid\x1b[0m`)

if (missing.length) {
  console.warn(`\x1b[31m✗ ${missing.length} not found:\x1b[0m`)
  for (const { slug, siSlug } of missing) {
    const mapped = slug !== siSlug ? ` (tried "${siSlug}")` : ''
    console.warn(`  - ${slug}${mapped}`)
  }
}
