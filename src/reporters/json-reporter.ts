import type { AnalysisResult } from '../core/types.js'

export const createJsonReporter = () => {
  const generate = (result: AnalysisResult): string => {
    return JSON.stringify(result, null, 2)
  }

  return { generate }
}
