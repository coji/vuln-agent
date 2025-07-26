import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { ServerType } from '@hono/node-server'

export interface VulnerableAppOptions {
  port?: number
}

export interface VulnerableApp {
  start: () => Promise<ServerType>
  stop: () => Promise<void>
  url: string
}

/**
 * Creates a vulnerable test application for integration testing
 */
export const createVulnerableApp = (options: VulnerableAppOptions = {}): VulnerableApp => {
  const port = options.port || 0 // 0 means auto-assign port
  let server: ServerType | null = null
  let actualPort: number = port
  
  const app = new Hono()
  
  // === XSS Vulnerabilities ===
  
  // Reflected XSS - query parameter
  app.get('/xss/reflected', (c) => {
    const input = c.req.query('input') || ''
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Search Results</title></head>
        <body>
          <h1>Search Results</h1>
          <p>You searched for: ${input}</p>
        </body>
      </html>
    `)
  })
  
  // DOM-based XSS simulation
  app.get('/xss/dom', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>DOM XSS Test</title></head>
        <body>
          <h1>Welcome</h1>
          <div id="output"></div>
          <script>
            const params = new URLSearchParams(window.location.search);
            const name = params.get('name');
            document.getElementById('output').innerHTML = 'Hello ' + name;
          </script>
        </body>
      </html>
    `)
  })
  
  // XSS with basic filter (bypassable)
  app.get('/xss/filtered', (c) => {
    let input = c.req.query('input') || ''
    // Basic filter that can be bypassed
    input = input.replace(/<script/gi, '&lt;script')
    input = input.replace(/<\/script>/gi, '&lt;/script&gt;')
    
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Filtered Search</title></head>
        <body>
          <h1>Search Results</h1>
          <p>You searched for: ${input}</p>
        </body>
      </html>
    `)
  })
  
  // === SQL Injection Vulnerabilities ===
  
  // Error-based SQLi
  app.get('/sqli/error', (c) => {
    const id = c.req.query('id') || '1'
    
    // Simulate SQL injection with error messages
    if (id.includes("'") || id.toLowerCase().includes('union') || id.toLowerCase().includes('select')) {
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head><title>Database Error</title></head>
          <body>
            <h1>Database Error</h1>
            <p>Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${id}' at line 1</p>
            <p>Query: SELECT * FROM users WHERE id = ${id}</p>
          </body>
        </html>
      `, 500)
    }
    
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>User Profile</title></head>
        <body>
          <h1>User Profile</h1>
          <p>User ID: ${id}</p>
          <p>Name: John Doe</p>
          <p>Email: john@example.com</p>
        </body>
      </html>
    `)
  })
  
  // Blind SQLi (boolean-based)
  app.get('/sqli/blind', (c) => {
    const username = c.req.query('username') || 'admin'
    
    // Simulate blind SQL injection
    if (username.includes("' OR '1'='1") || username.includes("' OR 1=1--")) {
      // Login bypass successful
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head><title>Admin Panel</title></head>
          <body>
            <h1>Welcome Administrator</h1>
            <p>You have successfully logged in.</p>
          </body>
        </html>
      `)
    }
    
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Login Failed</title></head>
        <body>
          <h1>Login Failed</h1>
          <p>Invalid username or password.</p>
        </body>
      </html>
    `, 401)
  })
  
  // === Authentication Vulnerabilities ===
  
  // Weak authentication
  app.post('/auth/login', async (c) => {
    const body = await c.req.parseBody()
    const username = body.username as string || ''
    const password = body.password as string || ''
    
    // Weak password check
    if (username === 'admin' && password === 'admin') {
      return c.json({ success: true, token: 'weak-token-12345' })
    }
    
    return c.json({ success: false, message: 'Invalid credentials' }, 401)
  })
  
  // === Safe Endpoints (for comparison) ===
  
  // Properly escaped XSS
  app.get('/safe/search', (c) => {
    const input = c.req.query('input') || ''
    const escaped = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Safe Search</title></head>
        <body>
          <h1>Search Results</h1>
          <p>You searched for: ${escaped}</p>
        </body>
      </html>
    `)
  })
  
  // Home page with vulnerability index
  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Vulnerable Test Application</title></head>
        <body>
          <h1>Vulnerable Test Application</h1>
          <h2>XSS Vulnerabilities:</h2>
          <ul>
            <li><a href="/xss/reflected?input=test">Reflected XSS</a></li>
            <li><a href="/xss/dom?name=test">DOM-based XSS</a></li>
            <li><a href="/xss/filtered?input=test">Filtered XSS (bypassable)</a></li>
          </ul>
          <h2>SQL Injection Vulnerabilities:</h2>
          <ul>
            <li><a href="/sqli/error?id=1">Error-based SQLi</a></li>
            <li><a href="/sqli/blind?username=admin">Blind SQLi</a></li>
          </ul>
          <h2>Authentication Vulnerabilities:</h2>
          <ul>
            <li>POST /auth/login (weak credentials: admin/admin)</li>
          </ul>
          <h2>Safe Endpoints:</h2>
          <ul>
            <li><a href="/safe/search?input=test">Safe Search</a></li>
          </ul>
        </body>
      </html>
    `)
  })
  
  const start = async (): Promise<ServerType> => {
    return new Promise((resolve) => {
      server = serve({
        fetch: app.fetch,
        port: actualPort
      }, (info) => {
        actualPort = info.port
        resolve(server as ServerType)
      })
    })
  }
  
  const stop = async (): Promise<void> => {
    if (server) {
      return new Promise((resolve) => {
        server?.close(() => {
          server = null
          resolve()
        })
      })
    }
  }
  
  return {
    start,
    stop,
    get url() {
      return `http://localhost:${actualPort}`
    }
  }
}