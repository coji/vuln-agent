export interface VulnAgentTool {
  name: string
  // Using any for tool because each tool has different parameter and result types
  // The AI SDK's Tool type is complex and varies by implementation
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types vary by implementation
  tool: any
}

export interface ToolContext {
  sessionId: string
  logger: (message: string) => void
}
