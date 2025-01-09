import sqlite3 from 'sqlite3';

    const db = new sqlite3.Database('twitter.db');

    db.serialize(() => {
      // Create new tables with updated schema
      db.run(`
        CREATE TABLE IF NOT EXISTS new_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS new_tweets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT,
          username TEXT,
          parent_tweet_id INTEGER DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(username) REFERENCES new_users(username),
          FOREIGN KEY(parent_tweet_id) REFERENCES new_tweets(id)
        )
      `);

      // Migrate users
      db.run(`
        INSERT INTO new_users (id, username)
        SELECT id, username FROM users
      `);

      // Migrate tweets
      db.run(`
        INSERT INTO new_tweets (id, content, username, created_at)
        SELECT id, content, username, created_at FROM tweets
      `);

      // Drop old tables
      db.run('DROP TABLE IF EXISTS users');
      db.run('DROP TABLE IF EXISTS tweets');

      // Rename new tables
      db.run('ALTER TABLE new_users RENAME TO users');
      db.run('ALTER TABLE new_tweets RENAME TO tweets');

      console.log('Database migration completed successfully');
    });

    db.close();
