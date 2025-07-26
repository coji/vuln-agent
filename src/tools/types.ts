export interface VulnAgentTool {
  name: string
  tool: any  // Temporary fix for type compatibility
}

export interface ToolContext {
  sessionId: string
  logger: (message: string) => void
}