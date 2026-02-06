/**
 * XPatla Bot - Schedules DAO
 * Kullanici bazli zamanlanmis tweet islemleri
 */

const { getDb } = require('../connection');

function getSchedules(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM schedules WHERE user_id = ? ORDER BY time ASC').all(userId);
}

function addSchedule(userId, chatId, content, time) {
    const db = getDb();
    const result = db.prepare(`
        INSERT INTO schedules (user_id, chat_id, content, time) VALUES (?, ?, ?, ?)
    `).run(userId, chatId, content, time);

    return db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
}

function markNotified(scheduleId) {
    const db = getDb();
    db.prepare('UPDATE schedules SET notified = 1 WHERE id = ?').run(scheduleId);
}

function getPendingSchedules() {
    const db = getDb();
    return db.prepare('SELECT * FROM schedules WHERE notified = 0').all();
}

function deleteSchedule(userId, scheduleId) {
    const db = getDb();
    const result = db.prepare('DELETE FROM schedules WHERE id = ? AND user_id = ?').run(scheduleId, userId);
    return result.changes > 0;
}

module.exports = { getSchedules, addSchedule, markNotified, getPendingSchedules, deleteSchedule };
