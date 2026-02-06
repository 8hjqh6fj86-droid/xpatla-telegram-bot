const fs = require('fs');
const path = require('path');
const { XP_MAP, RANK_THRESHOLDS } = require('./utils/constants');

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------
const draftsPath = path.join(__dirname, '..', 'data', 'drafts.json');
const snippetsPath = path.join(__dirname, '..', 'data', 'snippets.json');
const watchdogPath = path.join(__dirname, '..', 'data', 'watchdog.json');
const schedulesPath = path.join(__dirname, '..', 'data', 'schedules.json');
const statsPath = path.join(__dirname, '..', 'data', 'stats.json');

// ---------------------------------------------------------------------------
// Safe JSON loader
// ---------------------------------------------------------------------------
function loadJSON(filePath, fallback) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (_err) {
        return fallback;
    }
}

// ---------------------------------------------------------------------------
// In-memory state (lost on restart)
// ---------------------------------------------------------------------------
let targetTwitterUsername = 'hrrcnes';
let currentFormat = 'punch';
let currentPersona = 'authority';
let remixContext = {};
let replyContext = {};
let abContext = {};
let frameworkContext = {};

// ---------------------------------------------------------------------------
// Persistent data (loaded from JSON files)
// ---------------------------------------------------------------------------
let draftsData = loadJSON(draftsPath, []);
let snippetsData = loadJSON(snippetsPath, {});
let watchdogData = loadJSON(watchdogPath, {});
let schedulesData = loadJSON(schedulesPath, []);

const defaultStats = {
    session_tweets: 0,
    session_threads: 0,
    session_replies: 0,
    session_remixes: 0,
    last_activity: null,
    total_xp: 0,
    current_streak: 0,
    last_streak_date: null,
    daily_goal: 0,
    daily_progress: 0,
    last_goal_date: null
};

let statsData = loadJSON(statsPath, defaultStats);

// Ensure all default keys are present even if the file was partial
statsData = { ...defaultStats, ...statsData };

// ===========================================================================
// State accessors
// ===========================================================================

function getState() {
    return {
        targetTwitterUsername,
        currentFormat,
        currentPersona,
        remixContext,
        replyContext,
        abContext,
        frameworkContext,
        draftsData,
        snippetsData,
        watchdogData,
        schedulesData,
        statsData
    };
}

// ---------------------------------------------------------------------------
// Simple setters
// ---------------------------------------------------------------------------
function setTwitterUsername(username) {
    targetTwitterUsername = username;
}

function setFormat(format) {
    currentFormat = format;
}

function setPersona(persona) {
    currentPersona = persona;
}

// ---------------------------------------------------------------------------
// Remix context (per-chat)
// ---------------------------------------------------------------------------
function getRemixContext(chatId) {
    return remixContext[chatId];
}

function setRemixContext(chatId, text) {
    remixContext = { ...remixContext, [chatId]: text };
}

function deleteRemixContext(chatId) {
    const { [chatId]: _removed, ...rest } = remixContext;
    remixContext = rest;
}

// ---------------------------------------------------------------------------
// Reply context (per-chat)
// ---------------------------------------------------------------------------
function getReplyContext(chatId) {
    return replyContext[chatId];
}

function setReplyContext(chatId, text) {
    replyContext = { ...replyContext, [chatId]: text };
}

function deleteReplyContext(chatId) {
    const { [chatId]: _removed, ...rest } = replyContext;
    replyContext = rest;
}

// ---------------------------------------------------------------------------
// A/B context (per-chat)
// ---------------------------------------------------------------------------
function getAbContext(chatId) {
    return abContext[chatId];
}

function setAbContext(chatId, data) {
    abContext = { ...abContext, [chatId]: data };
}

function deleteAbContext(chatId) {
    const { [chatId]: _removed, ...rest } = abContext;
    abContext = rest;
}

// ---------------------------------------------------------------------------
// Framework context (per-chat)
// ---------------------------------------------------------------------------
function getFrameworkContext(chatId) {
    return frameworkContext[chatId];
}

function setFrameworkContext(chatId, data) {
    frameworkContext = { ...frameworkContext, [chatId]: data };
}

function deleteFrameworkContext(chatId) {
    const { [chatId]: _removed, ...rest } = frameworkContext;
    frameworkContext = rest;
}

// ===========================================================================
// Drafts
// ===========================================================================

function getDrafts() {
    return draftsData;
}

function addDraft(content) {
    const draft = {
        id: Date.now(),
        content,
        created_at: new Date().toISOString()
    };
    draftsData = [...draftsData, draft];
    return draft;
}

function deleteDraft(id) {
    draftsData = draftsData.filter((d) => d.id !== id);
}

function saveDrafts() {
    fs.writeFileSync(draftsPath, JSON.stringify(draftsData, null, 2));
}

// ===========================================================================
// Snippets
// ===========================================================================

function getSnippets() {
    return snippetsData;
}

function setSnippet(key, value) {
    snippetsData = { ...snippetsData, [key]: value };
}

function deleteSnippet(key) {
    const { [key]: _removed, ...rest } = snippetsData;
    snippetsData = rest;
}

function saveSnippets() {
    fs.writeFileSync(snippetsPath, JSON.stringify(snippetsData, null, 2));
}

// ===========================================================================
// Watchdog
// ===========================================================================

function getWatchdog() {
    return watchdogData;
}

function addWatchdog(username) {
    watchdogData = {
        ...watchdogData,
        [username]: { added_at: new Date().toISOString() }
    };
}

function saveWatchdog() {
    fs.writeFileSync(watchdogPath, JSON.stringify(watchdogData, null, 2));
}

// ===========================================================================
// Schedules
// ===========================================================================

function getSchedules() {
    return schedulesData;
}

function addSchedule(schedule) {
    const entry = {
        id: Date.now(),
        ...schedule,
        notified: false
    };
    schedulesData = [...schedulesData, entry];
    return entry;
}

function markNotified(id) {
    schedulesData = schedulesData.map((s) =>
        s.id === id ? { ...s, notified: true } : s
    );
}

function saveSchedules() {
    fs.writeFileSync(schedulesPath, JSON.stringify(schedulesData, null, 2));
}

// ===========================================================================
// Stats & Gamification
// ===========================================================================

function getStats() {
    return statsData;
}

function getRank(xp) {
    // RANK_THRESHOLDS is sorted ascending by min. Walk from highest to lowest.
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= RANK_THRESHOLDS[i].min) {
            return RANK_THRESHOLDS[i].name;
        }
    }
    return RANK_THRESHOLDS[0].name;
}

function updateStats(type) {
    const now = new Date();
    const today = now.toLocaleDateString('tr-TR');

    // XP increase
    const xpGain = XP_MAP[type] || 5;
    const newXp = (statsData.total_xp || 0) + xpGain;

    // Daily goal progress (only for tweets/threads)
    let newDailyProgress = statsData.daily_progress;
    let newLastGoalDate = statsData.last_goal_date;

    if (['session_tweets', 'session_threads'].includes(type)) {
        if (statsData.last_goal_date !== today) {
            newDailyProgress = 0;
            newLastGoalDate = today;
        }
        newDailyProgress++;
    }

    // Streak logic
    let newStreak = statsData.current_streak;
    let newLastStreakDate = statsData.last_streak_date;

    if (statsData.last_streak_date !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('tr-TR');

        if (statsData.last_streak_date === yesterdayStr) {
            newStreak = statsData.current_streak + 1;
        } else {
            newStreak = 1;
        }
        newLastStreakDate = today;
    }

    // Build updated stats immutably
    statsData = {
        ...statsData,
        total_xp: newXp,
        daily_progress: newDailyProgress,
        last_goal_date: newLastGoalDate,
        current_streak: newStreak,
        last_streak_date: newLastStreakDate,
        [type]: (statsData[type] || 0) + 1,
        last_activity: now.toLocaleString('tr-TR')
    };

    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));

    return {
        goalCompleted: statsData.daily_goal > 0 && statsData.daily_progress === statsData.daily_goal,
        newStreak: statsData.current_streak
    };
}

function setDailyGoal(goal) {
    statsData = { ...statsData, daily_goal: goal };
}

function saveStats() {
    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));
}

// ===========================================================================
// Exports
// ===========================================================================

module.exports = {
    getState,
    setTwitterUsername,
    setFormat,
    setPersona,
    getRemixContext,
    setRemixContext,
    deleteRemixContext,
    getReplyContext,
    setReplyContext,
    deleteReplyContext,
    getAbContext,
    setAbContext,
    deleteAbContext,
    getFrameworkContext,
    setFrameworkContext,
    deleteFrameworkContext,
    getDrafts,
    addDraft,
    deleteDraft,
    saveDrafts,
    getSnippets,
    setSnippet,
    deleteSnippet,
    saveSnippets,
    getWatchdog,
    addWatchdog,
    saveWatchdog,
    getSchedules,
    addSchedule,
    markNotified,
    saveSchedules,
    getStats,
    updateStats,
    getRank,
    setDailyGoal,
    saveStats
};
