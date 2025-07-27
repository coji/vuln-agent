import { tool } from 'ai'
import { z } from 'zod'
import type { ScanTask } from '../domain/models/scan-session.js'
import type { LLMProvider } from '../llm/types.js'
import type { VulnAgentTool } from './types.js'

// In-memory task store (will be replaced with proper storage later)
const taskStore = new Map<string, ScanTask[]>()

export const createManageTasksTool = (llm: LLMProvider): VulnAgentTool => {
  return {
    name: 'manageTasks',
    tool: tool({
      description:
        'Manage scan tasks - add, update, prioritize, and retrieve tasks',
      parameters: z.object({
        sessionId: z.string().describe('Current scan session ID'),
        action: z
          .enum(['add', 'update', 'get', 'prioritize', 'complete'])
          .describe('Action to perform on tasks'),
        task: z
          .object({
            id: z.string().optional(),
            type: z.enum([
              'test_endpoint',
              'analyze_response',
              'extract_links',
              'test_payload',
            ]),
            target: z.string(),
            priority: z.number().optional(),
            status: z
              .enum(['pending', 'in_progress', 'completed', 'failed'])
              .optional(),
            metadata: z.record(z.unknown()).optional(),
          })
          .optional()
          .describe('Task details for add/update actions'),
        filter: z
          .object({
            status: z
              .enum(['pending', 'in_progress', 'completed', 'failed'])
              .optional(),
            type: z.string().optional(),
          })
          .optional()
          .describe('Filter for get action'),
        context: z
          .object({
            currentFindings: z.array(z.string()).optional(),
            completedTasks: z.number().optional(),
            remainingSteps: z.number().optional(),
          })
          .optional()
          .describe('Context for prioritization'),
      }),
      execute: async (params) => {
        try {
          const sessionTasks = taskStore.get(params.sessionId) || []

          switch (params.action) {
            case 'add': {
              if (!params.task) {
                throw new Error('Task details required for add action')
              }

              const newTask: ScanTask = {
                id:
                  params.task.id ||
                  `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                type: params.task.type,
                target: params.task.target,
                priority: params.task.priority || sessionTasks.length,
                status: params.task.status || 'pending',
                metadata: params.task.metadata,
              }

              sessionTasks.push(newTask)
              taskStore.set(params.sessionId, sessionTasks)

              return {
                success: true,
                task: newTask,
                totalTasks: sessionTasks.length,
              }
            }

            case 'update': {
              if (!params.task?.id) {
                throw new Error('Task ID required for update action')
              }

              const taskIndex = sessionTasks.findIndex(
                (t) => t.id === params.task?.id,
              )
              if (taskIndex === -1) {
                throw new Error('Task not found')
              }

              sessionTasks[taskIndex] = {
                ...sessionTasks[taskIndex],
                ...params.task,
              }

              taskStore.set(params.sessionId, sessionTasks)

              return {
                success: true,
                task: sessionTasks[taskIndex],
              }
            }

            case 'get': {
              let filteredTasks = sessionTasks

              if (params.filter) {
                if (params.filter.status) {
                  filteredTasks = filteredTasks.filter(
                    (t) => t.status === params.filter?.status,
                  )
                }
                if (params.filter.type) {
                  filteredTasks = filteredTasks.filter(
                    (t) => t.type === params.filter?.type,
                  )
                }
              }

              return {
                success: true,
                tasks: filteredTasks,
                stats: {
                  total: sessionTasks.length,
                  pending: sessionTasks.filter((t) => t.status === 'pending')
                    .length,
                  inProgress: sessionTasks.filter(
                    (t) => t.status === 'in_progress',
                  ).length,
                  completed: sessionTasks.filter(
                    (t) => t.status === 'completed',
                  ).length,
                  failed: sessionTasks.filter((t) => t.status === 'failed')
                    .length,
                },
              }
            }

            case 'prioritize': {
              if (!params.context) {
                throw new Error('Context required for prioritization')
              }

              // Use LLM to prioritize tasks
              const prompt = `Prioritize these security testing tasks:

Current tasks:
${sessionTasks
  .filter((t) => t.status === 'pending')
  .map(
    (t, i) =>
      `${i + 1}. Type: ${t.type}, Target: ${t.target}, Current Priority: ${t.priority}`,
  )
  .join('\n')}

Context:
- Findings so far: ${params.context.currentFindings?.join(', ') || 'None'}
- Completed tasks: ${params.context.completedTasks || 0}
- Remaining steps: ${params.context.remainingSteps || 'Unknown'}

Reorder these tasks by priority (1 = highest priority) based on:
1. Likelihood of finding vulnerabilities
2. Importance of the target
3. Dependencies between tasks
4. Efficiency of execution`

              const result = await llm.generateObject({
                prompt,
                schema: z.object({
                  prioritizedTasks: z.array(
                    z.object({
                      taskIndex: z.number(),
                      newPriority: z.number(),
                      reasoning: z.string(),
                    }),
                  ),
                }),
              })

              // Update priorities
              result.object.prioritizedTasks.forEach(
                ({ taskIndex, newPriority }) => {
                  if (sessionTasks[taskIndex]) {
                    sessionTasks[taskIndex].priority = newPriority
                  }
                },
              )

              // Sort by priority
              sessionTasks.sort((a, b) => a.priority - b.priority)
              taskStore.set(params.sessionId, sessionTasks)

              return {
                success: true,
                prioritizedTasks: sessionTasks.filter(
                  (t) => t.status === 'pending',
                ),
                changes: result.object.prioritizedTasks,
              }
            }

            case 'complete': {
              if (!params.task?.id) {
                throw new Error('Task ID required for complete action')
              }

              const taskIndex = sessionTasks.findIndex(
                (t) => t.id === params.task?.id,
              )
              if (taskIndex === -1) {
                throw new Error('Task not found')
              }

              sessionTasks[taskIndex].status = 'completed'
              taskStore.set(params.sessionId, sessionTasks)

              return {
                success: true,
                task: sessionTasks[taskIndex],
                remainingTasks: sessionTasks.filter(
                  (t) => t.status === 'pending',
                ).length,
              }
            }

            default:
              throw new Error(`Unknown action: ${params.action}`)
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Task management failed',
          }
        }
      },
    }),
  }
}

// Utility functions
export const getSessionTasks = (sessionId: string): ScanTask[] => {
  return taskStore.get(sessionId) || []
}

export const clearSessionTasks = (sessionId: string): void => {
  taskStore.delete(sessionId)
}
