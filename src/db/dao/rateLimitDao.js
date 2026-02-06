/**
 * XPatla Bot - Rate Limit DAO
 * Kalici rate limiting (restart'ta sifirlanmaz)
 */

const { getDb } = require('../connection');

const LIMITS = {
    FREE: { daily: 10, cooldown: 5000 },
    PREMIUM: { daily: 1000, cooldown: 1000 }
};

function ensureRecord(userId) {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO rate_limits (user_id) VALUES (?)').run(userId);
}

function checkLimit(userId, isPremium) {
    ensureRecord(userId);
    const db = getDb();
    const limits = isPremium ? LIMITS.PREMIUM : LIMITS.FREE;
    const now = Date.now();
    const today = new Date().toDateString();

    const record = db.prepare('SELECT * FROM rate_limits WHERE user_id = ?').get(userId);

    // Yeni gun - sifirla
    if (record.date_key !== today) {
        db.prepare('UPDATE rate_limits SET daily_count = 0, date_key = ? WHERE user_id = ?')
            .run(today, userId);
        record.daily_count = 0;
    }

    // Cooldown kontrolu
    if (record.last_request && (now - record.last_request) < limits.cooldown) {
        const waitMs = limits.cooldown - (now - record.last_request);
        return {
            allowed: false,
            reason: 'cooldown',
            waitMs,
            message: `\u23f3 Cok hizlisin! ${Math.ceil(waitMs / 1000)} saniye bekle.`
        };
    }

    // Gunluk limit
    if (record.daily_count >= limits.daily) {
        return {
            allowed: false,
            reason: 'daily_limit',
            remaining: 0,
            message: `\ud83d\udeab Gunluk limitine ulastin (${limits.daily} tweet).`
        };
    }

    return {
        allowed: true,
        remaining: limits.daily - record.daily_count - 1,
        isPremium
    };
}

function recordUsage(userId) {
    ensureRecord(userId);
    const db = getDb();
    const today = new Date().toDateString();
    const now = Date.now();

    db.prepare(`
        UPDATE rate_limits SET daily_count = daily_count + 1, last_request = ?, date_key = ?
        WHERE user_id = ?
    `).run(now, today, userId);
}

function getDailyUsage(userId) {
    ensureRecord(userId);
    const db = getDb();
    const record = db.prepare('SELECT * FROM rate_limits WHERE user_id = ?').get(userId);
    return {
        used: record.daily_count || 0,
        dateKey: record.date_key
    };
}

module.exports = { checkLimit, recordUsage, getDailyUsage, LIMITS };
