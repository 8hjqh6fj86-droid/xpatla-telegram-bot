/**
 * XPatla Bot - Stats & Gamification Servisi
 * XP, Streak, Rank ve günlük hedef sistemi
 */

const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '../../data/stats.json');

// Default stats
const defaultStats = {
    session_tweets: 0,
    session_threads: 0,
    session_replies: 0,
    session_remixes: 0,
    last_activity: null,
    total_xp: 0,
    current_streak: 0,
    last_streak_date: null,
    daily_goal: 5,
    daily_progress: 0,
    last_goal_date: null
};

// XP değerleri
const XP_VALUES = {
    'session_tweets': 10,
    'session_threads': 30,
    'session_replies': 5,
    'session_remixes': 15
};

// Rank sistemi
function getRank(xp) {
    if (xp < 50) return { name: '👶 Çaylak', level: 1, nextAt: 50 };
    if (xp < 200) return { name: '✍️ Yazar', level: 2, nextAt: 200 };
    if (xp < 500) return { name: '🌟 Fenomen', level: 3, nextAt: 500 };
    if (xp < 1000) return { name: '🤖 Algorithm God', level: 4, nextAt: 1000 };
    return { name: '👑 XPatla CEO', level: 5, nextAt: null };
}

// Stats yükle
function loadStats() {
    try {
        if (fs.existsSync(statsPath)) {
            return { ...defaultStats, ...JSON.parse(fs.readFileSync(statsPath, 'utf8')) };
        }
    } catch (e) {
        console.log('Stats yüklenemedi, default kullanılıyor');
    }
    return { ...defaultStats };
}

// Stats kaydet
function saveStats(stats) {
    try {
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    } catch (e) {
        console.error('Stats kaydedilemedi:', e);
    }
}

// Stats güncelle
function updateStats(type) {
    const stats = loadStats();
    const now = new Date();
    const today = now.toLocaleDateString('tr-TR');

    // Counter artır
    if (stats[type] !== undefined) {
        stats[type]++;
    }

    // XP artır
    stats.total_xp += XP_VALUES[type] || 5;

    // Günlük hedef (tweet/thread için)
    if (['session_tweets', 'session_threads'].includes(type)) {
        if (stats.last_goal_date !== today) {
            stats.daily_progress = 0;
            stats.last_goal_date = today;
        }
        stats.daily_progress++;
    }

    // Streak mantığı
    if (stats.last_streak_date !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('tr-TR');

        if (stats.last_streak_date === yesterdayStr) {
            stats.current_streak++;
        } else {
            stats.current_streak = 1;
        }
        stats.last_streak_date = today;
    }

    stats.last_activity = now.toISOString();
    saveStats(stats);

    return stats;
}

// Stats mesajı formatla
function formatStatsMessage(stats) {
    const rank = getRank(stats.total_xp);
    const progressToNext = rank.nextAt
        ? `${stats.total_xp}/${rank.nextAt} XP`
        : 'MAX LEVEL!';

    const goalProgress = stats.daily_goal > 0
        ? `${stats.daily_progress}/${stats.daily_goal}`
        : 'Hedef belirlenmedi';

    const goalBar = stats.daily_goal > 0
        ? generateProgressBar(stats.daily_progress, stats.daily_goal)
        : '';

    return `📊 **XPatla İstatistiklerin**

**Rank:** ${rank.name}
**XP:** ${progressToNext}

━━━━━━━━━━━━━━━━━━━━
**Bu Oturum:**
✍️ Tweet: ${stats.session_tweets}
🧵 Thread: ${stats.session_threads}
💬 Reply: ${stats.session_replies}
🔄 Remix: ${stats.session_remixes}

━━━━━━━━━━━━━━━━━━━━
**Günlük Hedef:** ${goalProgress}
${goalBar}

🔥 **Streak:** ${stats.current_streak} gün

💡 _Hedef belirlemek için: /hedef 5_`;
}

// Progress bar
function generateProgressBar(current, max, length = 10) {
    const percentage = Math.min(current / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Hedef belirle
function setDailyGoal(goal) {
    const stats = loadStats();
    stats.daily_goal = goal;
    stats.daily_progress = 0;
    stats.last_goal_date = new Date().toLocaleDateString('tr-TR');
    saveStats(stats);
    return stats;
}

// Session sıfırla
function resetSession() {
    const stats = loadStats();
    stats.session_tweets = 0;
    stats.session_threads = 0;
    stats.session_replies = 0;
    stats.session_remixes = 0;
    saveStats(stats);
    return stats;
}

module.exports = {
    loadStats,
    saveStats,
    updateStats,
    getRank,
    formatStatsMessage,
    setDailyGoal,
    resetSession,
    XP_VALUES
};
