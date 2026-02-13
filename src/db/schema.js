/**
 * XPatla Bot - Database Schema & Migrations
 * Idempotent: her calistirmada tabloları varsa atlar, yoksa olusturur
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    telegram_id    INTEGER PRIMARY KEY,
    username       TEXT,
    first_name     TEXT,
    xpatla_api_key TEXT,
    twitter_username TEXT DEFAULT '',
    current_format TEXT DEFAULT 'punch',
    current_persona TEXT DEFAULT 'authority',
    role           TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    is_banned      INTEGER DEFAULT 0,
    invited_by     INTEGER REFERENCES users(telegram_id),
    created_at     TEXT DEFAULT (datetime('now')),
    last_active    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invite_codes (
    code        TEXT PRIMARY KEY,
    created_by  INTEGER NOT NULL REFERENCES users(telegram_id),
    used_by     INTEGER REFERENCES users(telegram_id),
    used_at     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stats (
    user_id          INTEGER PRIMARY KEY REFERENCES users(telegram_id),
    session_tweets   INTEGER DEFAULT 0,
    session_threads  INTEGER DEFAULT 0,
    session_replies  INTEGER DEFAULT 0,
    session_remixes  INTEGER DEFAULT 0,
    total_xp         INTEGER DEFAULT 0,
    current_streak   INTEGER DEFAULT 0,
    last_streak_date TEXT,
    daily_goal       INTEGER DEFAULT 0,
    daily_progress   INTEGER DEFAULT 0,
    last_goal_date   TEXT,
    last_activity    TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(telegram_id),
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS snippets (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(telegram_id),
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,
    UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS watchdog (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(telegram_id),
    target_username TEXT NOT NULL,
    added_at        TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, target_username)
);

CREATE TABLE IF NOT EXISTS schedules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(telegram_id),
    chat_id    INTEGER NOT NULL,
    content    TEXT NOT NULL,
    time       TEXT NOT NULL,
    notified   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
    user_id      INTEGER PRIMARY KEY REFERENCES users(telegram_id),
    daily_count  INTEGER DEFAULT 0,
    last_request INTEGER DEFAULT 0,
    date_key     TEXT
);

CREATE TABLE IF NOT EXISTS tweet_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(telegram_id),
    content      TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'tweet',
    topic        TEXT,
    persona      TEXT,
    format       TEXT,
    viral_score  INTEGER,
    is_favorite  INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user ON snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_user ON watchdog(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON tweet_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_fav ON tweet_history(user_id, is_favorite);
`;

function runMigrations(db) {
    db.exec(SCHEMA_SQL);
}

module.exports = { runMigrations };
