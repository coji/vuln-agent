import { describe, expect, it } from 'vitest'
import { createAnalyzeResponseTool } from '../src/tools/analyze-response.js'
import { createExtractLinksTool } from '../src/tools/extract-links.js'
import { createHttpRequestTool } from '../src/tools/http-request.js'
import { createManageTasksTool } from '../src/tools/manage-tasks.js'
import { createReportFindingTool } from '../src/tools/report-finding.js'
import { createTestPayloadTool } from '../src/tools/test-payload.js'
import { createUpdateStrategyTool } from '../src/tools/update-strategy.js'

describe('tools', () => {
  describe('httpRequest', () => {
    it('creates tool with correct name', () => {
      const tool = createHttpRequestTool({ whitelist: ['example.com'] })
      expect(tool.name).toBe('httpRequest')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('analyzeResponse', () => {
    it('creates tool with correct name', () => {
      const tool = createAnalyzeResponseTool({
        id: 'mock',
        name: 'Mock',
        generateObject: async () => ({ object: {} }),
      })
      expect(tool.name).toBe('analyzeResponse')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('extractLinks', () => {
    it('creates tool with correct name', () => {
      const tool = createExtractLinksTool({
        id: 'mock',
        name: 'Mock',
        generateObject: async () => ({ object: {} }),
      })
      expect(tool.name).toBe('extractLinks')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('reportFinding', () => {
    it('creates tool with correct name', () => {
      const tool = createReportFindingTool()
      expect(tool.name).toBe('reportFinding')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('testPayload', () => {
    it('creates tool with correct name', () => {
      const tool = createTestPayloadTool(
        { whitelist: ['example.com'] },
        {
          id: 'mock',
          name: 'Mock',
          generateObject: async () => ({ object: {} }),
        },
      )
      expect(tool.name).toBe('testPayload')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('manageTasks', () => {
    it('creates tool with correct name', () => {
      const tool = createManageTasksTool()
      expect(tool.name).toBe('manageTasks')
      expect(tool.tool).toBeDefined()
    })
  })

  describe('updateStrategy', () => {
    it('creates tool with correct name', () => {
      const tool = createUpdateStrategyTool({
        id: 'mock',
        name: 'Mock',
        generateObject: async () => ({ object: {} }),
      })
      expect(tool.name).toBe('updateStrategy')
      expect(tool.tool).toBeDefined()
    })
  })
})
