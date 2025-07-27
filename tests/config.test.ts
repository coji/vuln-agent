import { promises as fs } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultConfig, loadConfig } from '../src/config.js'

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates default config', () => {
    const config = createDefaultConfig()

    expect(config.defaultLLM).toBe('openai-o3')
    expect(config.maxSteps).toBe(100)
    expect(config.timeout).toBe(30000)
    expect(config.whitelist).toEqual([])
  })

  it('loads config from specific file', async () => {
    const customConfig = {
      defaultLLM: 'claude-sonnet-4' as const,
      maxSteps: 50,
    }

    vi.mocked(fs.readFile).mockClear()
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(customConfig))

    const config = await loadConfig('.test-config.json')

    expect(config.defaultLLM).toBe('claude-sonnet-4')
    expect(config.maxSteps).toBe(50)
  })

  it('returns default config on file error', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

    const config = await loadConfig()

    expect(config.defaultLLM).toBe('openai-o3')
    expect(config.maxSteps).toBe(100)
  })

  it('merges partial config with defaults', async () => {
    const partialConfig = {
      maxSteps: 200,
    }

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(partialConfig))

    const config = await loadConfig('.test-config.json')

    expect(config.maxSteps).toBe(200)
    expect(config.defaultLLM).toBe('openai-o3')
    expect(config.timeout).toBe(30000)
  })
})
