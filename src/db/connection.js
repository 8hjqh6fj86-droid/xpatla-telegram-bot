/**
 * XPatla Bot - Database Connection (Singleton)
 * better-sqlite3 ile senkron SQLite baglantisi
 */

const Database = require('better-sqlite3');
const path = require('path');
const { runMigrations } = require('./schema');

let db = null;

function getDb() {
    if (!db) {
        const dbPath = path.join(__dirname, '..', '..', 'data', 'xpatla.db');
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
    }
    return db;
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { getDb, closeDb };
