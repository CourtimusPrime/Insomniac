export interface ModelDefinition {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

/**
 * Static model definitions for each built-in provider.
 * Ollama models are fetched dynamically — see the "ollama" entry note.
 * OpenRouter accepts arbitrary model strings — listed as empty here.
 */
export const PROVIDER_MODELS: Record<string, ModelDefinition[]> = {
  anthropic: [
    {
      id: "claude-sonnet-4",
      name: "claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      provider: "anthropic",
      contextWindow: 200_000,
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000015,
    },
    {
      id: "claude-haiku-4-5",
      name: "claude-haiku-4-5",
      displayName: "Claude Haiku 4.5",
      provider: "anthropic",
      contextWindow: 200_000,
      costPerInputToken: 0.0000008,
      costPerOutputToken: 0.000004,
    },
  ],
  openai: [
    {
      id: "gpt-4o",
      name: "gpt-4o",
      displayName: "GPT-4o",
      provider: "openai",
      contextWindow: 128_000,
      costPerInputToken: 0.0000025,
      costPerOutputToken: 0.00001,
    },
    {
      id: "o3",
      name: "o3",
      displayName: "o3",
      provider: "openai",
      contextWindow: 200_000,
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00004,
    },
  ],
  google: [
    {
      id: "gemini-2.0-flash",
      name: "gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      provider: "google",
      contextWindow: 1_000_000,
      costPerInputToken: 0.0000001,
      costPerOutputToken: 0.0000004,
    },
    {
      id: "gemini-2.5-pro",
      name: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      provider: "google",
      contextWindow: 1_000_000,
      costPerInputToken: 0.00000125,
      costPerOutputToken: 0.00001,
    },
  ],
  openrouter: [],
  ollama: [],
};

/**
 * Get static model definitions for a provider.
 *
 * - For most providers, returns the built-in model list.
 * - For "ollama", returns an empty array — models must be fetched
 *   dynamically via the Ollama API (/api/tags).
 * - For "openrouter", returns an empty array — users supply
 *   arbitrary model strings.
 * - For "custom", returns an empty array.
 */
export function getModelsForProvider(providerName: string): ModelDefinition[] {
  return PROVIDER_MODELS[providerName] ?? [];
}
