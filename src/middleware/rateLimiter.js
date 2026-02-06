/**
 * XPatla Bot - Rate Limiter Middleware (v2 - SQLite backed)
 * Kalici rate limiting - restart'ta sifirlanmaz
 */

const rateLimitDao = require('../db/dao/rateLimitDao');

function checkLimit(userId, isPremium) {
    return rateLimitDao.checkLimit(userId, isPremium || false);
}

function recordUsage(userId) {
    return rateLimitDao.recordUsage(userId);
}

function getUserStats(userId, isPremium) {
    const limits = isPremium ? rateLimitDao.LIMITS.PREMIUM : rateLimitDao.LIMITS.FREE;
    const usage = rateLimitDao.getDailyUsage(userId);

    return {
        used: usage.used,
        limit: limits.daily,
        remaining: Math.max(0, limits.daily - usage.used),
        isPremium: isPremium || false
    };
}

module.exports = {
    checkLimit,
    recordUsage,
    getUserStats,
    LIMITS: rateLimitDao.LIMITS
};
