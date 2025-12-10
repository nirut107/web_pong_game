const path = require('path');
const fs = require('fs');
const dbConfig = require('../config/database');

function initDatabase() {
	const Database = require('better-sqlite3');

	const dataDir = path.dirname(dbConfig.filename);
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const db = new Database(dbConfig.filename);

	db.pragma('foreign_keys = ON');

	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL
    )
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS coderush_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      wpm REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS pong_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      time_taken INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

	db.close();
}

module.exports = initDatabase; 