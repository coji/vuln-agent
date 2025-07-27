import { tool } from 'ai'
import { z } from 'zod'
import type { LLMProvider, ScanStrategy, VulnAgentTool } from '../types.js'

// In-memory strategy store (will be replaced with proper storage later)
const strategyStore = new Map<string, ScanStrategy>()

export const createUpdateStrategyTool = (llm: LLMProvider): VulnAgentTool => {
  return {
    name: 'updateStrategy',
    tool: tool({
      description: 'Update scan strategy based on findings and progress',
      parameters: z.object({
        sessionId: z.string().describe('Current scan session ID'),
        currentState: z
          .object({
            completedSteps: z
              .number()
              .describe('Number of completed scan steps'),
            remainingSteps: z.number().describe('Estimated remaining steps'),
            findings: z.array(
              z.object({
                type: z.string().describe('Vulnerability type'),
                severity: z.string().describe('Severity level'),
                target: z.string().describe('Affected URL or endpoint'),
              }),
            ),
            testedEndpoints: z
              .array(z.string())
              .describe('List of already tested endpoints'),
            discoveredEndpoints: z
              .array(z.string())
              .describe('List of discovered but not yet tested endpoints'),
            blockedPayloads: z
              .array(z.string())
              .optional()
              .describe('Payloads that were blocked/filtered'),
            technologies: z
              .array(z.string())
              .optional()
              .describe('Detected technologies/frameworks'),
          })
          .describe('Current scan state'),
        currentStrategy: z
          .object({
            focusAreas: z
              .array(z.string())
              .describe('Areas to focus testing on'),
            skipPatterns: z.array(z.string()).describe('URL patterns to skip'),
            maxDepth: z.number().describe('Maximum crawl depth'),
            testIntensity: z
              .enum(['light', 'normal', 'thorough'])
              .describe('Testing intensity level'),
          })
          .optional()
          .describe('Current strategy if exists'),
      }),
      execute: async (params) => {
        try {
          // Get current strategy or default
          const currentStrategy = params.currentStrategy ||
            strategyStore.get(params.sessionId) || {
              focusAreas: [],
              skipPatterns: [],
              maxDepth: 3,
              testIntensity: 'normal' as const,
            }

          // Calculate progress
          const totalSteps =
            params.currentState.completedSteps +
            params.currentState.remainingSteps
          const progressPercentage =
            (params.currentState.completedSteps / totalSteps) * 100
          const criticalFindings = params.currentState.findings.filter(
            (f) => f.severity === 'critical' || f.severity === 'high',
          ).length

          // Use LLM to determine strategy adjustments
          const prompt = `Analyze the current security scan progress and recommend strategy adjustments:

Progress: ${progressPercentage.toFixed(1)}% (${params.currentState.completedSteps}/${totalSteps} steps)
Findings: ${params.currentState.findings.length} total, ${criticalFindings} critical/high

Current findings by type:
${Object.entries(
  params.currentState.findings.reduce(
    (acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  ),
)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

Tested endpoints: ${params.currentState.testedEndpoints.length}
Discovered but untested: ${params.currentState.discoveredEndpoints.length}
${params.currentState.blockedPayloads ? `Blocked payloads: ${params.currentState.blockedPayloads.length}` : ''}
${params.currentState.technologies ? `Detected technologies: ${params.currentState.technologies.join(', ')}` : ''}

Current strategy:
- Focus areas: ${currentStrategy.focusAreas.join(', ') || 'None'}
- Skip patterns: ${currentStrategy.skipPatterns.join(', ') || 'None'}
- Max depth: ${currentStrategy.maxDepth}
- Test intensity: ${currentStrategy.testIntensity}

Based on the findings and progress, recommend:
1. Which areas to focus on (vulnerability types, endpoints patterns)
2. What to skip to save time
3. Whether to adjust test intensity
4. Whether to change max crawling depth
5. Any specific techniques based on detected technologies or WAF`

          const result = await llm.generateObject({
            prompt,
            schema: z.object({
              recommendations: z.object({
                focusAreas: z.array(z.string()),
                skipPatterns: z.array(z.string()),
                maxDepth: z.number(),
                testIntensity: z.enum(['light', 'normal', 'thorough']),
                reasoning: z.string(),
              }),
              tactics: z.array(
                z.object({
                  technique: z.string(),
                  description: z.string(),
                  priority: z.enum(['high', 'medium', 'low']),
                }),
              ),
              adjustments: z.array(z.string()),
            }),
          })

          // Update strategy
          const newStrategy: ScanStrategy = {
            focusAreas: result.object.recommendations.focusAreas,
            skipPatterns: result.object.recommendations.skipPatterns,
            maxDepth: result.object.recommendations.maxDepth,
            testIntensity: result.object.recommendations.testIntensity,
          }

          strategyStore.set(params.sessionId, newStrategy)

          // Determine if significant changes were made
          const hasSignificantChanges =
            JSON.stringify(currentStrategy.focusAreas) !==
              JSON.stringify(newStrategy.focusAreas) ||
            currentStrategy.testIntensity !== newStrategy.testIntensity

          return {
            success: true,
            strategy: newStrategy,
            reasoning: result.object.recommendations.reasoning,
            tactics: result.object.tactics,
            adjustments: result.object.adjustments,
            hasSignificantChanges,
            summary: `Strategy updated: ${result.object.adjustments.length} adjustments made`,
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Strategy update failed',
          }
        }
      },
    }),
  }
}

// Utility functions
export const getSessionStrategy = (
  sessionId: string,
): ScanStrategy | undefined => {
  return strategyStore.get(sessionId)
}

export const clearSessionStrategy = (sessionId: string): void => {
  strategyStore.delete(sessionId)
}
