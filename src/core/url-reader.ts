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
      
      const [owner, repo, ...rest] = pathParts
      let branch = ''
      let subPath = ''
      
      // Handle URLs like github.com/owner/repo/tree/branch/path
      if (rest.length >= 2 && rest[0] === 'tree') {
        branch = rest[1]
        subPath = rest.slice(2).join('/')
      }
      
      // Get default branch if not specified
      if (!branch) {
        const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`
        const repoResponse = await fetch(repoApiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'vuln-agent',
            ...(process.env.GITHUB_TOKEN && {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`
            })
          }
        })
        
        if (!repoResponse.ok) {
          throw new Error(`GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`)
        }
        
        const repoData = await repoResponse.json() as any
        branch = repoData.default_branch || 'main'
      }
      
      // Recursive function to fetch directory contents
      const fetchDirectory = async (path: string): Promise<void> => {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'vuln-agent',
            ...(process.env.GITHUB_TOKEN && {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`
            })
          }
        })
        
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
        }
        
        const contents = await response.json() as any[]
        
        // Process each item
        for (const item of contents) {
          if (item.type === 'file' && item.download_url) {
            const ext = extname(item.name)
            if (!options.extensions || options.extensions.includes(ext)) {
              // Check file size (GitHub API returns size in bytes)
              if (!options.maxFileSize || item.size < options.maxFileSize) {
                try {
                  const content = await fetchContent(item.download_url)
                  files.set(item.path, content)
                } catch (error) {
                  console.error(`Error fetching ${item.path}:`, error)
                }
              }
            }
          } else if (item.type === 'dir') {
            // Recursively fetch subdirectories
            await fetchDirectory(item.path)
          }
        }
      }
      
      // Start fetching from the specified path or root
      await fetchDirectory(subPath)
      
      console.log(`Fetched ${files.size} files from ${repoUrl}`)
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