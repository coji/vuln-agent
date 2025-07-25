import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'

interface FileReaderOptions {
  extensions?: string[]
  ignore?: string[]
  maxFileSize?: number
}

export const createFileReader = () => {
  const defaultOptions: FileReaderOptions = {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'],
    ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
    maxFileSize: 1024 * 1024, // 1MB
  }

  const shouldIgnore = (path: string, ignore: string[]): boolean => {
    return ignore.some((pattern) => path.includes(pattern))
  }

  const readSingleFile = async (filePath: string): Promise<string> => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error)
      return ''
    }
  }

  const readDirectory = async (
    targetPath: string,
    options: FileReaderOptions = {},
  ): Promise<Map<string, string>> => {
    const opts = { ...defaultOptions, ...options }
    const files = new Map<string, string>()
    
    // Check if target is a file or directory
    const stats = await stat(targetPath)
    
    if (stats.isFile()) {
      const ext = extname(targetPath)
      if (!opts.extensions || opts.extensions.includes(ext)) {
        const content = await readSingleFile(targetPath)
        if (content) {
          files.set(targetPath, content)
        }
      }
      return files
    }

    const scanDir = async (currentPath: string): Promise<void> => {
      if (shouldIgnore(currentPath, opts.ignore || [])) {
        return
      }

      const entries = await readdir(currentPath)

      for (const entry of entries) {
        const fullPath = join(currentPath, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          await scanDir(fullPath)
        } else if (stats.isFile()) {
          const ext = extname(fullPath)
          if (
            opts.extensions?.includes(ext) &&
            stats.size < (opts.maxFileSize || Infinity)
          ) {
            const content = await readSingleFile(fullPath)
            if (content) {
              files.set(fullPath, content)
            }
          }
        }
      }
    }

    await scanDir(targetPath)
    return files
  }

  return {
    readSingleFile,
    readDirectory,
  }
}
