import { describe, expect, it } from 'vitest'
import { createHttpRequestTool } from '../../src/tools/http-request.js'

describe('httpRequestTool', () => {
  it('should create a tool with correct name', () => {
    const tool = createHttpRequestTool({
      whitelist: ['example.com'],
    })

    expect(tool.name).toBe('httpRequest')
  })

  it('should have required parameters', () => {
    const tool = createHttpRequestTool({
      whitelist: ['example.com'],
    })

    // Check that tool is defined
    expect(tool.tool).toBeDefined()
    expect(tool.tool.parameters).toBeDefined()
  })

  it('should enforce whitelist restrictions', async () => {
    const tool = createHttpRequestTool({
      whitelist: ['allowed.com'],
    })

    const result = await tool.tool.execute({
      url: 'https://notallowed.com',
      method: 'GET',
    })

    const typedResult = result as { success: boolean; error?: string }
    expect(typedResult.success).toBe(false)
    expect(typedResult.error).toContain('URL not whitelisted')
  })
})
