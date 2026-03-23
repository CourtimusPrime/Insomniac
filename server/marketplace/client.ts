import type { MarketplaceFilters, MarketplaceItem } from './types.js';

/* ------------------------------------------------------------------ */
/*  Mock store index (will be replaced by GitHub-backed fetch)         */
/* ------------------------------------------------------------------ */

const MOCK_STORE_INDEX: MarketplaceItem[] = [
  {
    id: 'mkt-ci-cd-deploy',
    name: 'CI/CD Deploy Pipeline',
    description:
      'Automated deployment workflow with build verification, staging tests, and production rollout.',
    type: 'workflow',
    author: 'Insomniac',
    version: '1.0.0',
    trustTier: 'official',
    installCount: 842,
    lastUpdated: '2026-03-15',
    repoUrl: 'https://github.com/insomniac-dev/store',
    downloadUrl:
      'https://raw.githubusercontent.com/insomniac-dev/store/main/workflows/ci-cd-deploy.json',
  },
  {
    id: 'mkt-code-guardian',
    name: 'Code Guardian Agent',
    description:
      'Agent configuration for continuous code quality monitoring with security scanning.',
    type: 'agent-config',
    author: 'Insomniac',
    version: '1.2.0',
    trustTier: 'official',
    installCount: 567,
    lastUpdated: '2026-03-10',
    repoUrl: 'https://github.com/insomniac-dev/store',
    downloadUrl:
      'https://raw.githubusercontent.com/insomniac-dev/store/main/agents/code-guardian.json',
  },
  {
    id: 'mkt-pr-review',
    name: 'PR Review Workflow',
    description:
      'Automated pull request review pipeline with code analysis, test verification, and approval gates.',
    type: 'workflow',
    author: 'community-dev',
    version: '0.9.1',
    trustTier: 'verified',
    installCount: 312,
    lastUpdated: '2026-03-01',
    repoUrl: 'https://github.com/community-dev/pr-review-workflow',
    downloadUrl:
      'https://raw.githubusercontent.com/community-dev/pr-review-workflow/main/template.json',
  },
  {
    id: 'mkt-microservice-scaffold',
    name: 'Microservice Scaffold',
    description:
      'Template for bootstrapping a new microservice with API routes, database, and tests.',
    type: 'template',
    author: 'Insomniac',
    version: '1.0.0',
    trustTier: 'official',
    installCount: 1203,
    lastUpdated: '2026-02-28',
    repoUrl: 'https://github.com/insomniac-dev/store',
    downloadUrl:
      'https://raw.githubusercontent.com/insomniac-dev/store/main/templates/microservice-scaffold.json',
  },
  {
    id: 'mkt-slack-notifier',
    name: 'Slack Notifier MCP',
    description:
      'MCP adapter that sends pipeline status notifications to Slack channels.',
    type: 'mcp-adapter',
    author: 'community-dev',
    version: '0.5.0',
    trustTier: 'community',
    installCount: 89,
    lastUpdated: '2026-02-20',
    repoUrl: 'https://github.com/community-dev/slack-notifier-mcp',
    downloadUrl:
      'https://raw.githubusercontent.com/community-dev/slack-notifier-mcp/main/adapter.json',
  },
  {
    id: 'mkt-data-pipeline',
    name: 'Data Pipeline Workflow',
    description:
      'ETL-style data pipeline with extraction, transformation, validation, and loading stages.',
    type: 'workflow',
    author: 'data-team',
    version: '1.1.0',
    trustTier: 'verified',
    installCount: 456,
    lastUpdated: '2026-03-18',
    repoUrl: 'https://github.com/data-team/data-pipeline',
    downloadUrl:
      'https://raw.githubusercontent.com/data-team/data-pipeline/main/workflow.json',
  },
  {
    id: 'mkt-github-actions-bridge',
    name: 'GitHub Actions Bridge',
    description:
      'MCP adapter that bridges Insomniac pipelines with GitHub Actions workflows.',
    type: 'mcp-adapter',
    author: 'Insomniac',
    version: '1.0.0',
    trustTier: 'official',
    installCount: 678,
    lastUpdated: '2026-03-12',
    repoUrl: 'https://github.com/insomniac-dev/store',
    downloadUrl:
      'https://raw.githubusercontent.com/insomniac-dev/store/main/adapters/github-actions-bridge.json',
  },
  {
    id: 'mkt-llm-eval-agent',
    name: 'LLM Eval Agent',
    description:
      'Agent configuration for evaluating LLM outputs with automated scoring and regression detection.',
    type: 'agent-config',
    author: 'ml-ops',
    version: '0.8.0',
    trustTier: 'community',
    installCount: 134,
    lastUpdated: '2026-03-05',
    repoUrl: 'https://github.com/ml-ops/llm-eval-agent',
    downloadUrl:
      'https://raw.githubusercontent.com/ml-ops/llm-eval-agent/main/agent.json',
  },
];

/* ------------------------------------------------------------------ */
/*  MarketplaceClient                                                  */
/* ------------------------------------------------------------------ */

/** Default GitHub repo URL for the marketplace store index. */
const DEFAULT_STORE_URL =
  'https://raw.githubusercontent.com/insomniac-dev/store/main/index.json';

export class MarketplaceClient {
  private readonly storeUrl: string;

  constructor(url?: string) {
    this.storeUrl = url ?? DEFAULT_STORE_URL;
  }

  /** Returns the configured store index URL. */
  getStoreUrl(): string {
    return this.storeUrl;
  }

  /**
   * Fetch marketplace items, optionally filtered by type, trust tier, or search query.
   * Currently returns mock data; will fetch from this.storeUrl in production.
   */
  async fetchItems(filters?: MarketplaceFilters): Promise<MarketplaceItem[]> {
    // TODO: Replace with actual fetch from this.getStoreUrl()
    let items = [...MOCK_STORE_INDEX];

    if (filters?.type) {
      items = items.filter((item) => item.type === filters.type);
    }

    if (filters?.trustTier) {
      items = items.filter((item) => item.trustTier === filters.trustTier);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
      );
    }

    return items;
  }

  /**
   * Fetch a single marketplace item by ID.
   */
  async getItem(id: string): Promise<MarketplaceItem | null> {
    // TODO: Replace with actual fetch from this.storeUrl
    const item = MOCK_STORE_INDEX.find((i) => i.id === id);
    return item ?? null;
  }

  /**
   * Download a marketplace item's package (JSON payload).
   * Currently returns mock chain definition; will fetch from downloadUrl in production.
   */
  async downloadItem(id: string): Promise<Record<string, unknown> | null> {
    // TODO: Replace with actual fetch from item.downloadUrl
    const item = MOCK_STORE_INDEX.find((i) => i.id === id);
    if (!item) return null;

    // Return a mock chain definition / package payload
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      version: item.version,
      chainDefinition: {
        version: 1,
        nodes: [
          {
            id: 'n1',
            type: 'trigger',
            label: 'Trigger',
            model: null,
            systemPrompt: null,
            status: 'pending',
            abilities: [],
            position: { x: 40, y: 180 },
          },
          {
            id: 'n2',
            type: 'builder',
            label: 'Builder',
            model: null,
            systemPrompt: null,
            status: 'pending',
            abilities: [],
            position: { x: 320, y: 180 },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'n1',
            target: 'n2',
            condition: 'on-success',
          },
        ],
      },
    };
  }
}
