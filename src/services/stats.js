/**
 * XPatla Bot - Stats & Gamification Servisi (v2 - SQLite proxy)
 * Artik tum islemler state.js -> statsDao uzerinden yapiliyor.
 * Bu dosya geriye uyumluluk icin kalıyor.
 */

const state = require('../state');
const { RANK_THRESHOLDS } = require('../utils/constants');

function getRank(xp) {
    if (xp < 50) return { name: '👶 Çaylak', level: 1, nextAt: 50 };
    if (xp < 200) return { name: '✍️ Yazar', level: 2, nextAt: 200 };
    if (xp < 500) return { name: '🌟 Fenomen', level: 3, nextAt: 500 };
    if (xp < 1000) return { name: '🤖 Algorithm God', level: 4, nextAt: 1000 };
    return { name: '👑 XPatla CEO', level: 5, nextAt: null };
}

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

function generateProgressBar(current, max, length = 10) {
    const percentage = Math.min(current / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

const XP_VALUES = {
    'session_tweets': 10,
    'session_threads': 30,
    'session_replies': 5,
    'session_remixes': 15
};

module.exports = {
    getRank,
    formatStatsMessage,
    generateProgressBar,
    XP_VALUES
};
