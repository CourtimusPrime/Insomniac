import type { ModelDefinition } from "./models.js";

const DEFAULT_BASE_URL = "http://localhost:11434";

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    size: number;
    digest: string;
    details: {
      parameter_size: string;
      quantization_level: string;
    };
  }>;
}

export class OllamaProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  /**
   * Fetch available models from the Ollama instance.
   * Queries GET {baseUrl}/api/tags and maps the response to ModelDefinition[].
   */
  async fetchModels(): Promise<ModelDefinition[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) {
      throw new Error(
        `Ollama /api/tags responded with ${res.status}: ${res.statusText}`,
      );
    }

    const data = (await res.json()) as OllamaTagsResponse;

    return data.models.map((m) => ({
      id: m.name,
      name: m.name,
      displayName: m.name,
      provider: "ollama",
      contextWindow: 0, // Ollama doesn't expose this via /api/tags
      costPerInputToken: 0,
      costPerOutputToken: 0,
    }));
  }

  /** Verify that the Ollama instance is reachable. */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
