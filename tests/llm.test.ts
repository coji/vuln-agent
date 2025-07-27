import { describe, expect, it } from 'vitest'
import { createLLM } from '../src/llm.js'

describe('llm', () => {
  it('creates openai-o3 provider', () => {
    const llm = createLLM({
      provider: 'openai-o3',
      apiKey: 'test-key',
    })

    expect(llm.name).toBe('OpenAI o3')
    expect(llm.generateObject).toBeDefined()
  })

  it('creates claude-sonnet-4 provider', () => {
    const llm = createLLM({
      provider: 'claude-sonnet-4',
      apiKey: 'test-key',
    })

    expect(llm.name).toBe('Claude Sonnet 4')
    expect(llm.generateObject).toBeDefined()
  })

  it('creates gemini-2.5-pro provider', () => {
    const llm = createLLM({
      provider: 'gemini-2.5-pro',
      apiKey: 'test-key',
    })

    expect(llm.name).toBe('Gemini 2.5 Pro')
    expect(llm.generateObject).toBeDefined()
  })

  it('creates gemini-2.5-flash provider', () => {
    const llm = createLLM({
      provider: 'gemini-2.5-flash',
      apiKey: 'test-key',
    })

    expect(llm.name).toBe('Gemini 2.5 Flash')
    expect(llm.generateObject).toBeDefined()
  })

  it('throws error for unknown provider', () => {
    expect(() => {
      createLLM({
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid provider
        provider: 'unknown' as any,
        apiKey: 'test-key',
      })
    }).toThrow('Unknown provider: unknown')
  })

  it('throws error when no API key provided', () => {
    expect(() => {
      createLLM({
        provider: 'openai-o3',
      })
    }).toThrow('No API key provided for openai-o3')
  })
})
