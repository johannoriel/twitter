import express from 'express';
    import sqlite3 from 'sqlite3';
    import cors from 'cors';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const app = express();
    const db = new sqlite3.Database('twitter.db');

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'dist')));

    // Initialize database
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tweets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT,
          username TEXT,
          parent_tweet_id INTEGER DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(username) REFERENCES users(username),
          FOREIGN KEY(parent_tweet_id) REFERENCES tweets(id)
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO users (username) 
        VALUES ('alice'), ('bob'), ('charlie')
      `);
    });

    // Get tweets with replies
    app.get('/api/tweets', (req, res) => {
      const { username } = req.query;
      let query = `
        SELECT t.*, 
               (SELECT COUNT(*) FROM tweets r WHERE r.parent_tweet_id = t.id) as reply_count
        FROM tweets t
      `;
      const params = [];
      
      if (username) {
        query += ' WHERE t.username = ?';
        params.push(username);
      }
      
      query += ' ORDER BY t.created_at DESC';
      
      db.all(query, params, (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    });

    // Get replies for a specific tweet
    app.get('/api/tweets/:id/replies', (req, res) => {
      const { id } = req.params;
      db.all(`
        SELECT * FROM tweets
        WHERE parent_tweet_id = ?
        ORDER BY created_at ASC
      `, [id], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    });

    app.get('/api/users', (req, res) => {
      db.all('SELECT username FROM users', (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows.map(row => row.username));
      });
    });

    app.post('/api/users', (req, res) => {
      const { username } = req.body;
      if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username already exists' });
          } else {
            res.status(500).json({ error: err.message });
          }
          return;
        }
        res.json({ id: this.lastID });
      });
    });

    app.post('/api/tweets', (req, res) => {
      const { content, username, parent_tweet_id } = req.body;
      if (!content || !username) {
        res.status(400).json({ error: 'Content and username are required' });
        return;
      }

      db.run(`
        INSERT INTO tweets (content, username, parent_tweet_id)
        VALUES (?, ?, ?)
      `, [content, username, parent_tweet_id || null], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID });
      });
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
