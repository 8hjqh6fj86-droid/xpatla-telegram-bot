/**
 * XPatla Bot - Stats DAO
 * Kullanici bazli istatistik ve gamification islemleri
 */

const { getDb } = require('../connection');
const { XP_MAP } = require('../../utils/constants');

const DEFAULT_STATS = {
    session_tweets: 0,
    session_threads: 0,
    session_replies: 0,
    session_remixes: 0,
    total_xp: 0,
    current_streak: 0,
    last_streak_date: null,
    daily_goal: 0,
    daily_progress: 0,
    last_goal_date: null,
    last_activity: null
};

function getStats(userId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM stats WHERE user_id = ?').get(userId);
    if (!row) return { ...DEFAULT_STATS, user_id: userId };
    return { ...DEFAULT_STATS, ...row };
}

function ensureStats(userId) {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO stats (user_id) VALUES (?)').run(userId);
}

function updateStats(userId, type) {
    ensureStats(userId);
    const stats = getStats(userId);
    const db = getDb();

    const now = new Date();
    const today = now.toLocaleDateString('tr-TR');

    // XP artisi
    const xpGain = XP_MAP[type] || 5;
    const newXp = (stats.total_xp || 0) + xpGain;

    // Gunluk hedef ilerlemesi (sadece tweet/thread icin)
    let newDailyProgress = stats.daily_progress;
    let newLastGoalDate = stats.last_goal_date;

    if (['session_tweets', 'session_threads'].includes(type)) {
        if (stats.last_goal_date !== today) {
            newDailyProgress = 0;
            newLastGoalDate = today;
        }
        newDailyProgress++;
    }

    // Streak mantigi
    let newStreak = stats.current_streak;
    let newLastStreakDate = stats.last_streak_date;

    if (stats.last_streak_date !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('tr-TR');

        if (stats.last_streak_date === yesterdayStr) {
            newStreak = stats.current_streak + 1;
        } else {
            newStreak = 1;
        }
        newLastStreakDate = today;
    }

    const newCount = (stats[type] || 0) + 1;
    const lastActivity = now.toLocaleString('tr-TR');

    db.prepare(`
        UPDATE stats SET
            total_xp = ?,
            daily_progress = ?,
            last_goal_date = ?,
            current_streak = ?,
            last_streak_date = ?,
            ${type} = ?,
            last_activity = ?
        WHERE user_id = ?
    `).run(newXp, newDailyProgress, newLastGoalDate, newStreak, newLastStreakDate, newCount, lastActivity, userId);

    const updatedStats = getStats(userId);
    return {
        goalCompleted: updatedStats.daily_goal > 0 && updatedStats.daily_progress === updatedStats.daily_goal,
        newStreak: updatedStats.current_streak
    };
}

function setDailyGoal(userId, goal) {
    ensureStats(userId);
    const db = getDb();
    const today = new Date().toLocaleDateString('tr-TR');
    db.prepare('UPDATE stats SET daily_goal = ?, daily_progress = 0, last_goal_date = ? WHERE user_id = ?')
        .run(goal, today, userId);
}

function resetSession(userId) {
    ensureStats(userId);
    const db = getDb();
    db.prepare(`
        UPDATE stats SET session_tweets = 0, session_threads = 0,
            session_replies = 0, session_remixes = 0
        WHERE user_id = ?
    `).run(userId);
}

module.exports = { getStats, updateStats, setDailyGoal, resetSession, DEFAULT_STATS };
