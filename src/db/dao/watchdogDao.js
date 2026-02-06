/**
 * XPatla Bot - Watchdog DAO
 * Kullanici bazli Twitter hesap takip islemleri
 */

const { getDb } = require('../connection');

function getWatchdog(userId) {
    const db = getDb();
    const rows = db.prepare('SELECT target_username, added_at FROM watchdog WHERE user_id = ?').all(userId);
    const result = {};
    for (const row of rows) {
        result[row.target_username] = { added_at: row.added_at };
    }
    return result;
}

function addWatchdog(userId, targetUsername) {
    const db = getDb();
    db.prepare(`
        INSERT INTO watchdog (user_id, target_username) VALUES (?, ?)
        ON CONFLICT(user_id, target_username) DO NOTHING
    `).run(userId, targetUsername);
}

function removeWatchdog(userId, targetUsername) {
    const db = getDb();
    const result = db.prepare('DELETE FROM watchdog WHERE user_id = ? AND target_username = ?').run(userId, targetUsername);
    return result.changes > 0;
}

module.exports = { getWatchdog, addWatchdog, removeWatchdog };
