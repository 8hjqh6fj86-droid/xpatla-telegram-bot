/**
 * XPatla Bot - Rate Limiter Middleware
 * Kullanıcı başına istek sınırlama (freemium model için)
 */

// Kullanıcı limitleri (memory-based, production için Redis kullan)
const userLimits = new Map();

// Ayarlar
const LIMITS = {
    FREE: {
        daily: 10,       // Günlük maksimum tweet
        cooldown: 5000   // 5 saniye bekleme
    },
    PREMIUM: {
        daily: 1000,     // Sınırsız gibi
        cooldown: 1000   // 1 saniye
    }
};

// Premium kullanıcılar (production için database'den çek)
const premiumUsers = new Set();

// Kullanıcı limitini kontrol et
function checkLimit(userId) {
    const isPremium = premiumUsers.has(userId);
    const limits = isPremium ? LIMITS.PREMIUM : LIMITS.FREE;

    const now = Date.now();
    const today = new Date().toDateString();

    if (!userLimits.has(userId)) {
        userLimits.set(userId, {
            count: 0,
            lastRequest: 0,
            date: today
        });
    }

    const user = userLimits.get(userId);

    // Yeni gün kontrolü
    if (user.date !== today) {
        user.count = 0;
        user.date = today;
    }

    // Cooldown kontrolü
    if (now - user.lastRequest < limits.cooldown) {
        return {
            allowed: false,
            reason: 'cooldown',
            waitMs: limits.cooldown - (now - user.lastRequest),
            message: `⏳ Çok hızlısın! ${Math.ceil((limits.cooldown - (now - user.lastRequest)) / 1000)} saniye bekle.`
        };
    }

    // Günlük limit kontrolü
    if (user.count >= limits.daily) {
        return {
            allowed: false,
            reason: 'daily_limit',
            remaining: 0,
            message: `🚫 Günlük limitine ulaştın (${limits.daily} tweet).\n\n💎 Premium'a geç: Sınırsız tweet üret!`
        };
    }

    return {
        allowed: true,
        remaining: limits.daily - user.count - 1,
        isPremium
    };
}

// Kullanımı kaydet
function recordUsage(userId) {
    if (!userLimits.has(userId)) {
        userLimits.set(userId, {
            count: 0,
            lastRequest: 0,
            date: new Date().toDateString()
        });
    }

    const user = userLimits.get(userId);
    user.count++;
    user.lastRequest = Date.now();
}

// Premium ekle
function addPremium(userId) {
    premiumUsers.add(userId);
}

// Premium kaldır
function removePremium(userId) {
    premiumUsers.delete(userId);
}

// Premium kontrol
function isPremium(userId) {
    return premiumUsers.has(userId);
}

// Kullanıcı istatistikleri
function getUserStats(userId) {
    const isPrem = premiumUsers.has(userId);
    const limits = isPrem ? LIMITS.PREMIUM : LIMITS.FREE;
    const user = userLimits.get(userId) || { count: 0 };

    return {
        used: user.count,
        limit: limits.daily,
        remaining: Math.max(0, limits.daily - user.count),
        isPremium: isPrem
    };
}

module.exports = {
    checkLimit,
    recordUsage,
    addPremium,
    removePremium,
    isPremium,
    getUserStats,
    LIMITS
};
