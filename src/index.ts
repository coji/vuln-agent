export const createVulnAgent = () => {
  const analyze = async (targetPath: string) => {
    console.log(`Analyzing: ${targetPath}`)
    return { vulnerabilities: [] }
  }

  return { analyze }
}