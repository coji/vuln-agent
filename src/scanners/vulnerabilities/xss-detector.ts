import type {
  HttpResponse,
  LLMVulnerabilityTester,
  VulnerabilityAnalysisResult,
  VulnerabilityAttempt,
  VulnerabilityTestContext,
} from '../../types.js'
import { debug } from '../../utils.js'
import type { HttpClient } from '../web-scanner.js'

export interface XSSDetectorOptions {
  httpClient: HttpClient
  llmTester: LLMVulnerabilityTester
  maxAttempts?: number
}

export const createXSSDetector = (options: XSSDetectorOptions) => {
  const { httpClient, llmTester, maxAttempts = 3 } = options

  const injectPayload = (
    url: string,
    param: string,
    payload: string,
    location: string,
  ): string => {
    const urlObj = new URL(url)

    switch (location) {
      case 'query':
        urlObj.searchParams.set(param, payload)
        return urlObj.toString()
      case 'path':
        // Path injection requires more complex handling
        return url.replace(
          new RegExp(`\{${param}\}`),
          encodeURIComponent(payload),
        )
      default:
        // For body, header, cookie - handled differently
        return url
    }
  }

  const detectXSS = async (context: VulnerabilityTestContext) => {
    const attempts: VulnerabilityAttempt[] = []
    let isVulnerable = false
    let finalAnalysis: VulnerabilityAnalysisResult | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. Generate payload using LLM
      const { payload, reasoning, technique } = await llmTester.generatePayload(
        {
          ...context,
          previousAttempts: attempts,
        },
        'XSS',
      )

      debug.xss('Testing with payload: %s', payload)
      debug.xss('Technique: %s', technique)
      debug.xss('Reasoning: %s', reasoning)

      // 2. Send the payload
      let testResponse: HttpResponse
      const testUrl = injectPayload(
        context.url,
        context.parameter,
        payload,
        context.parameterLocation,
      )

      if (
        context.parameterLocation === 'query' ||
        context.parameterLocation === 'path'
      ) {
        testResponse = await httpClient.request({
          url: testUrl,
          method: context.method,
        })
      } else if (context.parameterLocation === 'body') {
        testResponse = await httpClient.request({
          url: context.url,
          method: context.method,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `${context.parameter}=${encodeURIComponent(payload)}`,
        })
      } else {
        // Header or cookie injection
        const headers: Record<string, string> = {}
        if (context.parameterLocation === 'header') {
          headers[context.parameter] = payload
        } else if (context.parameterLocation === 'cookie') {
          headers.Cookie = `${context.parameter}=${payload}`
        }

        testResponse = await httpClient.request({
          url: context.url,
          method: context.method,
          headers,
        })
      }

      // 3. Analyze the response using LLM
      const analysis = await llmTester.analyzeResponse(context, {
        payload,
        technique,
        response: testResponse,
        reasoning,
        vulnerabilityType: 'XSS',
      })

      // Record the attempt
      attempts.push({
        payload,
        result: analysis.isVulnerable
          ? 'reflected'
          : analysis.filterDetected
            ? 'blocked'
            : 'no_change',
        response: testResponse,
      })

      finalAnalysis = analysis

      // If vulnerable with high confidence, stop testing
      if (analysis.isVulnerable && analysis.confidence > 0.8) {
        isVulnerable = true
        break
      }

      // If filter detected but LLM suggests bypass, continue
      if (
        analysis.filterDetected &&
        analysis.suggestedNextPayload &&
        attempt < maxAttempts - 1
      ) {
        debug.xss('Filter detected: %s', analysis.filterDetected.type)
        debug.xss('Trying bypass: %s', analysis.filterDetected.bypass)
        continue
      }

      // If no suggestions, stop
      if (!analysis.suggestedNextPayload) {
        break
      }
    }

    return {
      vulnerable: isVulnerable,
      attempts,
      analysis: finalAnalysis,
      testUrl: context.url,
      parameter: context.parameter,
      location: context.parameterLocation,
    }
  }

  return { detectXSS }
}
