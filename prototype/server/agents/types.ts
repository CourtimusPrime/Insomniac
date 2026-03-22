export type AgentStatus = "idle" | "working" | "error" | "disconnected";

export type AgentMessage = {
  id: string;
  type: "tool_call" | "tool_result" | "message";
  payload: unknown;
};

export type AgentConfig = {
  name: string;
  model: string;
  provider: string;
  systemPrompt: string;
  transport: "mcp" | "stdio" | "auto";
};

export interface AgentAdapter {
  sendMessage(prompt: string): Promise<void>;
  /** Returns the next message. For single-response agents, returns the final result. */
  getResponse(): Promise<AgentMessage>;
  /** Returns an async iterable of all messages until completion. Prefer this over getResponse() for streaming agents. */
  getResponses?(): AsyncIterable<AgentMessage>;
  abort(): Promise<void>;
  status: AgentStatus;
}
