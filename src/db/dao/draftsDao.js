/**
 * XPatla Bot - Drafts DAO
 * Kullanici bazli taslak islemleri
 */

const { getDb } = require('../connection');

function getDrafts(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM drafts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function addDraft(userId, content) {
    const db = getDb();
    const result = db.prepare(`
        INSERT INTO drafts (user_id, content) VALUES (?, ?)
    `).run(userId, content);

    return db.prepare('SELECT * FROM drafts WHERE id = ?').get(result.lastInsertRowid);
}

function deleteDraft(userId, draftId) {
    const db = getDb();
    const result = db.prepare('DELETE FROM drafts WHERE id = ? AND user_id = ?').run(draftId, userId);
    return result.changes > 0;
}

module.exports = { getDrafts, addDraft, deleteDraft };
