const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const path = require('node:path')

const app = express()
const port = 3000

// Initialize database
const db = new sqlite3.Database(':memory:')

db.serialize(() => {
  // Create users table
  db.run(
    'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)',
  )

  // Insert sample data
  db.run(
    "INSERT INTO users (username, password, email) VALUES ('admin', 'admin123', 'admin@example.com')",
  )
  db.run(
    "INSERT INTO users (username, password, email) VALUES ('user1', 'password1', 'user1@example.com')",
  )
  db.run(
    "INSERT INTO users (username, password, email) VALUES ('user2', 'password2', 'user2@example.com')",
  )

  // Create comments table
  db.run(
    'CREATE TABLE comments (id INTEGER PRIMARY KEY, author TEXT, content TEXT)',
  )
  db.run(
    "INSERT INTO comments (author, content) VALUES ('Alice', 'Great website!')",
  )
  db.run(
    "INSERT INTO comments (author, content) VALUES ('Bob', 'Thanks for sharing!')",
  )
})

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// Routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// XSS Vulnerability: Reflected XSS
app.get('/search', (req, res) => {
  const query = req.query.q || ''
  // VULNERABILITY: User input is directly inserted into HTML without sanitization
  res.send(`
    <html>
      <head><title>Search Results</title></head>
      <body>
        <h1>Search Results</h1>
        <p>You searched for: ${query}</p>
        <a href="/">Back to home</a>
      </body>
    </html>
  `)
})

// SQL Injection Vulnerability
app.get('/user/:id', (req, res) => {
  const userId = req.params.id
  // VULNERABILITY: Direct string concatenation in SQL query
  const query = `SELECT * FROM users WHERE id = ${userId}`

  db.get(query, (err, row) => {
    if (err) {
      res.status(500).send(`Database error: ${err.message}`)
    } else if (row) {
      res.json(row)
    } else {
      res.status(404).send('User not found')
    }
  })
})

// XSS Vulnerability: Stored XSS
app.get('/comments', (_req, res) => {
  db.all('SELECT * FROM comments', (err, rows) => {
    if (err) {
      res.status(500).send('Database error')
      return
    }

    let html = `
      <html>
        <head><title>Comments</title></head>
        <body>
          <h1>User Comments</h1>
          <ul>
    `

    rows.forEach((comment) => {
      // VULNERABILITY: Comment content is not sanitized
      html += `<li><strong>${comment.author}:</strong> ${comment.content}</li>`
    })

    html += `
          </ul>
          <h2>Add a comment</h2>
          <form action="/comments" method="POST">
            <input type="text" name="author" placeholder="Your name" required><br>
            <textarea name="content" placeholder="Your comment" required></textarea><br>
            <button type="submit">Submit</button>
          </form>
          <a href="/">Back to home</a>
        </body>
      </html>
    `

    res.send(html)
  })
})

// Post comment (with stored XSS vulnerability)
app.post('/comments', (req, res) => {
  const { author, content } = req.body
  // VULNERABILITY: User input is stored without sanitization
  db.run(
    'INSERT INTO comments (author, content) VALUES (?, ?)',
    [author, content],
    (err) => {
      if (err) {
        res.status(500).send('Database error')
      } else {
        res.redirect('/comments')
      }
    },
  )
})

// Authentication bypass vulnerability
app.post('/login', (req, res) => {
  const { username, password } = req.body
  // VULNERABILITY: SQL injection in login query
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`

  db.get(query, (err, row) => {
    if (err) {
      res.status(500).send(`Database error: ${err.message}`)
    } else if (row) {
      res.send(
        `<h1>Welcome, ${row.username}!</h1><p>Login successful!</p><a href="/">Back to home</a>`,
      )
    } else {
      res.send(
        '<h1>Login failed</h1><p>Invalid credentials</p><a href="/">Try again</a>',
      )
    }
  })
})

// Information disclosure
app.get('/debug', (_req, res) => {
  // VULNERABILITY: Exposes sensitive information
  res.json({
    environment: process.env,
    database: 'sqlite3',
    users_count: 3,
    app_version: '1.0.0',
    secret_key: 'super_secret_key_123',
  })
})

app.listen(port, () => {
  console.log(`Vulnerable app listening at http://localhost:${port}`)
  console.log(
    '\nWARNING: This application contains intentional security vulnerabilities.',
  )
  console.log(
    'Only run this in a safe, isolated environment for testing purposes.\n',
  )
})
