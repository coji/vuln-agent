import { extname } from 'node:path'

interface URLReaderOptions {
  extensions?: string[]
  maxFileSize?: number
}

export const createURLReader = () => {
  const isGitHubUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.hostname === 'github.com' || parsed.hostname === 'raw.githubusercontent.com'
    } catch {
      return false
    }
  }

  const convertGitHubUrlToRaw = (url: string): string => {
    try {
      const parsed = new URL(url)
      
      // Already a raw URL
      if (parsed.hostname === 'raw.githubusercontent.com') {
        return url
      }
      
      // Convert github.com/owner/repo/blob/branch/path to raw URL
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts.length >= 5 && pathParts[2] === 'blob') {
        const [owner, repo, , branch, ...filePath] = pathParts
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath.join('/')}`
      }
      
      return url
    } catch {
      return url
    }
  }

  const fetchContent = async (url: string): Promise<string> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }

  const readFromURL = async (
    url: string,
    options: URLReaderOptions = {}
  ): Promise<Map<string, string>> => {
    const files = new Map<string, string>()
    
    try {
      // Handle GitHub URLs
      if (isGitHubUrl(url)) {
        const rawUrl = convertGitHubUrlToRaw(url)
        const content = await fetchContent(rawUrl)
        
        // Extract filename from URL
        const urlPath = new URL(rawUrl).pathname
        const filename = urlPath.split('/').pop() || 'unknown'
        const ext = extname(filename)
        
        if (!options.extensions || options.extensions.includes(ext)) {
          files.set(url, content)
        }
      } else {
        // Handle regular URLs
        const content = await fetchContent(url)
        files.set(url, content)
      }
    } catch (error) {
      console.error(`Error fetching URL ${url}:`, error)
    }
    
    return files
  }

  const readGitHubRepository = async (
    repoUrl: string,
    options: URLReaderOptions = {}
  ): Promise<Map<string, string>> => {
    const files = new Map<string, string>()
    
    try {
      // Parse GitHub repo URL
      const parsed = new URL(repoUrl)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      
      if (pathParts.length < 2) {
        throw new Error('Invalid GitHub repository URL')
      }
      
      const [owner, repo] = pathParts
      
      // Use GitHub API to list files
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'vuln-agent'
        }
      })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }
      
      const contents = await response.json() as any[]
      
      // Filter and fetch files
      for (const item of contents) {
        if (item.type === 'file' && item.download_url) {
          const ext = extname(item.name)
          if (!options.extensions || options.extensions.includes(ext)) {
            try {
              const content = await fetchContent(item.download_url)
              files.set(item.path, content)
            } catch (error) {
              console.error(`Error fetching ${item.path}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading GitHub repository:`, error)
    }
    
    return files
  }

  return {
    readFromURL,
    readGitHubRepository,
    isGitHubUrl,
    convertGitHubUrlToRaw
  }
}