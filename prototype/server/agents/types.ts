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
  getResponse(): Promise<AgentMessage>;
  abort(): Promise<void>;
  status: AgentStatus;
}
