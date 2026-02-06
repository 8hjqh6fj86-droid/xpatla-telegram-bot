/**
 * XPatla Bot - Snippets DAO
 * Kullanici bazli snippet islemleri
 */

const { getDb } = require('../connection');

function getSnippets(userId) {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM snippets WHERE user_id = ?').all(userId);
    const result = {};
    for (const row of rows) {
        result[row.key] = row.value;
    }
    return result;
}

function setSnippet(userId, key, value) {
    const db = getDb();
    db.prepare(`
        INSERT INTO snippets (user_id, key, value) VALUES (?, ?, ?)
        ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `).run(userId, key, value);
}

function deleteSnippet(userId, key) {
    const db = getDb();
    const result = db.prepare('DELETE FROM snippets WHERE user_id = ? AND key = ?').run(userId, key);
    return result.changes > 0;
}

module.exports = { getSnippets, setSnippet, deleteSnippet };
