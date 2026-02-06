/**
 * XPatla Bot - User DAO
 * Kullanici CRUD islemleri
 */

const { getDb } = require('../connection');

function findByTelegramId(telegramId) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) || null;
}

function findByUsername(username) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

function createUser({ telegramId, username, firstName, invitedBy = null }) {
    const db = getDb();
    db.prepare(`
        INSERT INTO users (telegram_id, username, first_name, invited_by)
        VALUES (?, ?, ?, ?)
    `).run(telegramId, username || null, firstName || null, invitedBy);

    // Stats tablosuna da kayit olustur
    db.prepare('INSERT INTO stats (user_id) VALUES (?)').run(telegramId);

    return findByTelegramId(telegramId);
}

function updateUser(telegramId, fields) {
    const db = getDb();
    const allowed = [
        'username', 'first_name', 'xpatla_api_key', 'twitter_username',
        'current_format', 'current_persona', 'role', 'is_banned', 'last_active'
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
        if (allowed.includes(key)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (updates.length === 0) return findByTelegramId(telegramId);

    values.push(telegramId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE telegram_id = ?`).run(...values);

    return findByTelegramId(telegramId);
}

function setApiKey(telegramId, apiKey) {
    return updateUser(telegramId, { xpatla_api_key: apiKey });
}

function setBanned(telegramId, isBanned) {
    return updateUser(telegramId, { is_banned: isBanned ? 1 : 0 });
}

function setAdmin(telegramId) {
    return updateUser(telegramId, { role: 'admin' });
}

function isAdmin(telegramId) {
    const user = findByTelegramId(telegramId);
    return user ? user.role === 'admin' : false;
}

function getAllUsers() {
    const db = getDb();
    return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
}

function getUserCount() {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return row.count;
}

function touchLastActive(telegramId) {
    const db = getDb();
    db.prepare("UPDATE users SET last_active = datetime('now') WHERE telegram_id = ?").run(telegramId);
}

module.exports = {
    findByTelegramId,
    findByUsername,
    createUser,
    updateUser,
    setApiKey,
    setBanned,
    setAdmin,
    isAdmin,
    getAllUsers,
    getUserCount,
    touchLastActive
};
