import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import sqlite from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Setup database
const db = new sqlite('app.db', { verbose: console.log });
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    username TEXT,
    lastLogin TEXT
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    bundledContent TEXT,
    deployedAt TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

try {
  db.exec('ALTER TABLE projects ADD COLUMN bundledContent TEXT;');
} catch(e) {}

try {
  db.exec('ALTER TABLE users ADD COLUMN phoneNumber TEXT;');
} catch(e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN firstName TEXT;');
} catch(e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN lastName TEXT;');
} catch(e) {}

const startServer = async () => {
  const app = express();
  const PORT = 3000;

  // Subdomain Middleware
  app.use(async (req, res, next) => {
    const host = (req.headers.host || '').split(':')[0]; // remove port if present
    let domainId = null;

    if (host.includes('deploystudio.org') && host !== 'deploystudio.org' && host !== 'www.deploystudio.org') {
      domainId = host.split('.deploystudio.org')[0];
    } else if (req.path.startsWith('/site/')) {
      // Support for testing in preview environment: /site/:subdomain
      const pathParts = req.path.split('/');
      domainId = pathParts[2];
      
      if (domainId) {
        const stmt = db.prepare('SELECT bundledContent FROM projects WHERE subdomain = ?');
        const project = stmt.get(domainId);
        if (project && project.bundledContent) {
          res.setHeader('Content-Type', 'text/html');
          return res.send(project.bundledContent);
        }
      }
    } else {
      // Fallback for testing with query param
      domainId = req.query.subdomain as string;
    }

    if (!domainId && host && host !== 'localhost') {
       domainId = host;
    }

    if (domainId && domainId !== 'www' && !req.path.startsWith('/api') && !req.path.startsWith('/site/')) {
      const stmt = db.prepare('SELECT bundledContent FROM projects WHERE subdomain = ?');
      const project = stmt.get(domainId);
      if (project && project.bundledContent) {
        res.setHeader('Content-Type', 'text/html');
        return res.send(project.bundledContent);
      }
    }
    
    next();
  });

  app.use(express.json());

  // API Routes
  app.post('/api/deploy/subdomain', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const { name, subdomain, bundledContent } = req.body;
      
      const deployedAt = new Date().toISOString();
      
      // Check if project exists for this user
      const checkStmt = db.prepare('SELECT id FROM projects WHERE subdomain = ?');
      const existing = checkStmt.get(subdomain);
      
      if (existing) {
        const updateStmt = db.prepare('UPDATE projects SET deployedAt = ?, name = ?, bundledContent = ? WHERE id = ?');
        updateStmt.run(deployedAt, name, bundledContent, existing.id);
      } else {
        const insertStmt = db.prepare('INSERT INTO projects (userId, name, subdomain, deployedAt, bundledContent) VALUES (?, ?, ?, ?, ?)');
        insertStmt.run(decoded.id, name, subdomain, deployedAt, bundledContent);
      }
      
      res.json({ 
        success: true, 
        url: `https://${subdomain}.deploystudio.org`,
        previewUrl: `/site/${subdomain}`
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Deployment failed' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, username, phoneNumber, firstName, lastName } = req.body;
      const hash = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password, username, phoneNumber, firstName, lastName, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const lastLogin = new Date().toISOString();
      
      const info = stmt.run(email, hash, username || email.split('@')[0], phoneNumber || '', firstName || '', lastName || '', lastLogin);
      
      const userStmt = db.prepare('SELECT id, email, username, phoneNumber, firstName, lastName, lastLogin FROM users WHERE id = ?');
      const user = userStmt.get(info.lastInsertRowid);
      
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    } catch (error) {
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      const user = stmt.get(email);
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const updateStmt = db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?');
      const lastLogin = new Date().toISOString();
      updateStmt.run(lastLogin, user.id);
      user.lastLogin = lastLogin;

      delete user.password; // Do not send password back
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/anonymous', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      const hash = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password, username, lastLogin) VALUES (?, ?, ?, ?)');
      const lastLogin = new Date().toISOString();
      
      const info = stmt.run(email, hash, username, lastLogin);
      
      const userStmt = db.prepare('SELECT id, email, username, phoneNumber, firstName, lastName, lastLogin FROM users WHERE id = ?');
      const user = userStmt.get(info.lastInsertRowid);
      
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Anonymous login failed' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const stmt = db.prepare('SELECT id, email, username, phoneNumber, firstName, lastName, lastLogin FROM users WHERE id = ?');
      const user = stmt.get(decoded.id);
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/projects', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const stmt = db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY deployedAt DESC');
      const projects = stmt.all(decoded.id);
      res.json({ projects });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
