import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { templates } from "../db/schema/index.js";
import { workspaces } from "../db/schema/index.js";

/* ------------------------------------------------------------------ */
/*  Chain definition helper types (matches src/api/projects.ts)       */
/* ------------------------------------------------------------------ */

interface ChainNode {
  id: string;
  type: string;
  label: string;
  model?: string | null;
  systemPrompt?: string | null;
  status?: string;
  abilities?: { id: string; name: string }[];
  position: { x: number; y: number };
}

interface ChainEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface ChainDefinition {
  version: number;
  nodes: ChainNode[];
  edges: ChainEdge[];
}

/* ------------------------------------------------------------------ */
/*  Helper: build a linear chain from a list of node types            */
/* ------------------------------------------------------------------ */

const NODE_LABELS: Record<string, string> = {
  trigger: "Trigger",
  prototyper: "Prototyper",
  builder: "Builder",
  tester: "Tester",
  reviewer: "Reviewer",
  auditor: "Auditor",
};

function buildChain(
  steps: string[],
): ChainDefinition {
  const X_START = 40;
  const X_GAP = 280;
  const Y = 180;

  const nodes: ChainNode[] = steps.map((type, i) => ({
    id: `n${i + 1}`,
    type,
    label: NODE_LABELS[type] ?? type,
    model: null,
    systemPrompt: null,
    status: "pending",
    abilities: [],
    position: { x: X_START + i * X_GAP, y: Y },
  }));

  const edges: ChainEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e${i + 1}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      condition: "on-success",
    });
  }

  return { version: 1, nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  6 built-in template definitions                                   */
/* ------------------------------------------------------------------ */

interface BuiltInTemplate {
  name: string;
  description: string;
  category: "workflow" | "agent-config" | "template" | "mcp-adapter";
  chainDefinition: ChainDefinition;
  author: string;
  version: string;
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Full Stack Build",
    description:
      "End-to-end build pipeline: trigger kicks off a builder, then tests are run, and finally a code review.",
    category: "workflow",
    chainDefinition: buildChain(["trigger", "builder", "tester", "reviewer"]),
    author: "Insomniac",
    version: "1.0.0",
  },
  {
    name: "Security Audit",
    description:
      "Quick security scan: trigger feeds code directly to an auditor for vulnerability analysis.",
    category: "workflow",
    chainDefinition: buildChain(["trigger", "auditor"]),
    author: "Insomniac",
    version: "1.0.0",
  },
  {
    name: "Code Review",
    description:
      "Standalone code review pipeline: trigger sends code to a reviewer for quality checks.",
    category: "workflow",
    chainDefinition: buildChain(["trigger", "reviewer"]),
    author: "Insomniac",
    version: "1.0.0",
  },
  {
    name: "Rapid Prototype",
    description:
      "Fast prototyping: trigger starts a prototyper that hands off to a builder for implementation.",
    category: "workflow",
    chainDefinition: buildChain(["trigger", "prototyper", "builder"]),
    author: "Insomniac",
    version: "1.0.0",
  },
  {
    name: "Test Suite",
    description:
      "Focused testing pipeline: trigger sends code directly to a tester for comprehensive test execution.",
    category: "workflow",
    chainDefinition: buildChain(["trigger", "tester"]),
    author: "Insomniac",
    version: "1.0.0",
  },
  {
    name: "Full Pipeline",
    description:
      "Complete pipeline with every stage: prototype, build, test, review, and audit.",
    category: "workflow",
    chainDefinition: buildChain([
      "trigger",
      "prototyper",
      "builder",
      "tester",
      "reviewer",
      "auditor",
    ]),
    author: "Insomniac",
    version: "1.0.0",
  },
];

/* ------------------------------------------------------------------ */
/*  Seed function — inserts built-in templates on first run           */
/* ------------------------------------------------------------------ */

const DEFAULT_WORKSPACE_NAME = "Default";

async function getOrCreateDefaultWorkspace(): Promise<string> {
  const existing = db
    .select()
    .from(workspaces)
    .where(eq(workspaces.name, DEFAULT_WORKSPACE_NAME))
    .get();

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  db.insert(workspaces).values({ id, name: DEFAULT_WORKSPACE_NAME }).run();
  return id;
}

export async function seedBuiltInTemplates(): Promise<void> {
  const existing = db.select().from(templates).all();
  if (existing.length > 0) return;

  const workspaceId = await getOrCreateDefaultWorkspace();

  for (const tpl of BUILT_IN_TEMPLATES) {
    db.insert(templates)
      .values({
        workspaceId,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        chainDefinition: tpl.chainDefinition,
        author: tpl.author,
        version: tpl.version,
        isBuiltIn: true,
      })
      .run();
  }
}
