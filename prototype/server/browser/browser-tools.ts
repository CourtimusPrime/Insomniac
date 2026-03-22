import type { BrowserEngine } from "./types.js";

// ---------------------------------------------------------------------------
// MCP-compatible tool definition types
// ---------------------------------------------------------------------------

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, { type: string; description: string }>;
  required: string[];
}

export interface BrowserToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface BrowserToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP-compatible schemas)
// ---------------------------------------------------------------------------

export const browserToolDefinitions: BrowserToolDefinition[] = [
  {
    name: "navigate",
    description: "Navigate the browser to a URL.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to." },
      },
      required: ["url"],
    },
  },
  {
    name: "click",
    description: "Click an element matching the given CSS selector.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the element to click." },
      },
      required: ["selector"],
    },
  },
  {
    name: "fill",
    description: "Fill an input element with a value.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input element." },
        value: { type: "string", description: "The value to fill into the input." },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "screenshot",
    description: "Capture a screenshot of the current browser viewport as a base64 PNG.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "assertText",
    description: "Assert that an element's text content matches the expected string.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the element." },
        expected: { type: "string", description: "Expected text content." },
      },
      required: ["selector", "expected"],
    },
  },
  {
    name: "assertElement",
    description: "Assert that an element matching the selector exists on the page.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to check." },
      },
      required: ["selector"],
    },
  },
  {
    name: "getConsoleErrors",
    description: "Retrieve any JavaScript console errors captured on the page.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "evaluateScript",
    description: "Execute arbitrary JavaScript in the browser page context and return the result.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to evaluate." },
      },
      required: ["code"],
    },
  },
  {
    name: "waitForSelector",
    description: "Wait for an element matching the selector to appear on the page.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to wait for." },
        timeout: { type: "string", description: "Maximum wait time in milliseconds (default 5000)." },
      },
      required: ["selector"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executors — each delegates to BrowserEngine
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;

const toolHandlers: Record<
  string,
  (engine: BrowserEngine, args: ToolArgs) => Promise<BrowserToolResult>
> = {
  async navigate(engine, args) {
    await engine.navigate(args.url as string);
    return { success: true, data: { url: args.url } };
  },

  async click(engine, args) {
    await engine.click(args.selector as string);
    return { success: true, data: { selector: args.selector } };
  },

  async fill(engine, args) {
    await engine.fill(args.selector as string, args.value as string);
    return { success: true, data: { selector: args.selector } };
  },

  async screenshot(engine) {
    const base64 = await engine.screenshot();
    return { success: true, data: { base64 } };
  },

  async assertText(engine, args) {
    const actual = await engine.getText(args.selector as string);
    const expected = args.expected as string;
    if (actual.includes(expected)) {
      return { success: true, data: { actual, expected } };
    }
    return {
      success: false,
      error: `Text mismatch: expected "${expected}" but got "${actual}"`,
      data: { actual, expected },
    };
  },

  async assertElement(engine, args) {
    const selector = args.selector as string;
    const exists = await engine.evaluate(
      `document.querySelector(${JSON.stringify(selector)}) !== null`,
    );
    if (exists) {
      return { success: true, data: { selector } };
    }
    return {
      success: false,
      error: `Element not found: ${selector}`,
      data: { selector },
    };
  },

  async getConsoleErrors(engine) {
    // Read errors collected by the injected console.error override.
    // If the collector hasn't been injected yet, returns an empty array.
    const errors = await engine.evaluate(
      `(typeof __insomniac_console_errors !== 'undefined') ? __insomniac_console_errors : []`,
    );
    return { success: true, data: { errors } };
  },

  async evaluateScript(engine, args) {
    const result = await engine.evaluate(args.code as string);
    return { success: true, data: { result } };
  },

  async waitForSelector(engine, args) {
    const selector = args.selector as string;
    const timeout = Number(args.timeout ?? 5000);
    const poll = `
      new Promise((resolve, reject) => {
        const sel = ${JSON.stringify(selector)};
        const deadline = Date.now() + ${timeout};
        (function check() {
          if (document.querySelector(sel)) return resolve(true);
          if (Date.now() > deadline) return reject(new Error('Timeout waiting for ' + sel));
          setTimeout(check, 100);
        })();
      })
    `;
    try {
      await engine.evaluate(poll);
      return { success: true, data: { selector } };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        data: { selector, timeout },
      };
    }
  },
};

/**
 * Execute a browser tool by name using the given BrowserEngine.
 */
export async function executeBrowserTool(
  engine: BrowserEngine,
  toolName: string,
  args: ToolArgs,
): Promise<BrowserToolResult> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown browser tool: ${toolName}` };
  }
  try {
    return await handler(engine, args);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// 'browser-test' Ability record
// ---------------------------------------------------------------------------

/**
 * Ability record for the browser-test ability.
 * Can be inserted into the abilities table via the API or directly.
 */
export const browserTestAbility = {
  name: "browser-test",
  type: "plugin" as const,
  config: {
    description: "Browser automation tools for testing and inspection.",
    tools: browserToolDefinitions.map((t) => t.name),
    toolDefinitions: browserToolDefinitions,
  },
  version: "1.0.0",
} satisfies {
  name: string;
  type: "skill" | "plugin" | "mcp";
  config: Record<string, unknown>;
  version: string;
};
