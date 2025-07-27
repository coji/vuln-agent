import { describe, expect, it } from 'vitest'
import {
  AGENT_SYSTEM_PROMPT,
  STEP_CONTEXT_TEMPLATE,
} from '../../src/agent-prompts.js'

describe('Agent Prompts', () => {
  describe('AGENT_SYSTEM_PROMPT', () => {
    it('should contain key instructions', () => {
      expect(AGENT_SYSTEM_PROMPT).toContain('autonomous security testing agent')
      expect(AGENT_SYSTEM_PROMPT).toContain('seven specialized tools')
      expect(AGENT_SYSTEM_PROMPT).toContain('Testing Methodology')
    })

    it('should define all phases', () => {
      expect(AGENT_SYSTEM_PROMPT).toContain('Phase 1: Reconnaissance')
      expect(AGENT_SYSTEM_PROMPT).toContain('Phase 2: Deep Analysis')
      expect(AGENT_SYSTEM_PROMPT).toContain('Phase 3: Advanced Testing')
      expect(AGENT_SYSTEM_PROMPT).toContain('Phase 4: Verification & Expansion')
      expect(AGENT_SYSTEM_PROMPT).toContain('Phase 5: Cleanup & Reporting')
    })
  })

  describe('STEP_CONTEXT_TEMPLATE', () => {
    it('should generate proper context', () => {
      const context = STEP_CONTEXT_TEMPLATE(
        10,
        100,
        5,
        2,
        3,
        ['https://example.com', 'https://example.com/login'],
        'Authentication testing',
        ['test_endpoint: https://example.com/api'],
      )

      expect(context).toContain('**Progress**: Step 10/100 (10%)')
      expect(context).toContain(
        '**Findings**: 5 total (2 critical/high severity)',
      )
      expect(context).toContain('**Task Queue**: 3 pending tasks')
      expect(context).toContain('**Current Focus**: Authentication testing')
      expect(context).toContain('remaining 90 steps')
    })
  })
})
