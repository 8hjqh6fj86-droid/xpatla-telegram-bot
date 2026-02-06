/**
 * XPatla Bot - State Manager (v2 - SQLite backed)
 * Tum persistent data artik SQLite'da, in-memory context'ler ayni kaliyor.
 *
 * BREAKING CHANGE: Tum data fonksiyonlari artik ilk parametre olarak userId aliyor.
 * save*() fonksiyonlari no-op (SQLite auto-persist).
 */

const userDao = require('./db/dao/userDao');
const draftsDao = require('./db/dao/draftsDao');
const snippetsDao = require('./db/dao/snippetsDao');
const watchdogDao = require('./db/dao/watchdogDao');
const schedulesDao = require('./db/dao/schedulesDao');
const statsDao = require('./db/dao/statsDao');
const { RANK_THRESHOLDS } = require('./utils/constants');

// ---------------------------------------------------------------------------
// In-memory context'ler (per-chat, gecici - restart'ta kaybolur, sorun degil)
// ---------------------------------------------------------------------------
let remixContext = {};
let replyContext = {};
let abContext = {};
let frameworkContext = {};

// ===========================================================================
// Context Accessors (chatId bazli - DEGISMEDI)
// ===========================================================================

function getRemixContext(chatId) { return remixContext[chatId]; }
function setRemixContext(chatId, text) {
    remixContext = { ...remixContext, [chatId]: text };
}
function deleteRemixContext(chatId) {
    const { [chatId]: _removed, ...rest } = remixContext;
    remixContext = rest;
}

function getReplyContext(chatId) { return replyContext[chatId]; }
function setReplyContext(chatId, text) {
    replyContext = { ...replyContext, [chatId]: text };
}
function deleteReplyContext(chatId) {
    const { [chatId]: _removed, ...rest } = replyContext;
    replyContext = rest;
}

function getAbContext(chatId) { return abContext[chatId]; }
function setAbContext(chatId, data) {
    abContext = { ...abContext, [chatId]: data };
}
function deleteAbContext(chatId) {
    const { [chatId]: _removed, ...rest } = abContext;
    abContext = rest;
}

function getFrameworkContext(chatId) { return frameworkContext[chatId]; }
function setFrameworkContext(chatId, data) {
    frameworkContext = { ...frameworkContext, [chatId]: data };
}
function deleteFrameworkContext(chatId) {
    const { [chatId]: _removed, ...rest } = frameworkContext;
    frameworkContext = rest;
}

// ===========================================================================
// User Settings (DB'den)
// ===========================================================================

function getUserSettings(userId) {
    const user = userDao.findByTelegramId(userId);
    return {
        targetTwitterUsername: user?.twitter_username || '',
        currentFormat: user?.current_format || 'punch',
        currentPersona: user?.current_persona || 'authority'
    };
}

function setTwitterUsername(userId, username) {
    userDao.updateUser(userId, { twitter_username: username });
}

function setFormat(userId, format) {
    userDao.updateUser(userId, { current_format: format });
}

function setPersona(userId, persona) {
    userDao.updateUser(userId, { current_persona: persona });
}

// ===========================================================================
// Drafts (userId bazli)
// ===========================================================================

function getDrafts(userId) {
    return draftsDao.getDrafts(userId);
}

function addDraft(userId, content) {
    return draftsDao.addDraft(userId, content);
}

function deleteDraft(userId, draftId) {
    return draftsDao.deleteDraft(userId, draftId);
}

function saveDrafts() { /* no-op: SQLite auto-persist */ }

// ===========================================================================
// Snippets (userId bazli)
// ===========================================================================

function getSnippets(userId) {
    return snippetsDao.getSnippets(userId);
}

function setSnippet(userId, key, value) {
    return snippetsDao.setSnippet(userId, key, value);
}

function deleteSnippet(userId, key) {
    return snippetsDao.deleteSnippet(userId, key);
}

function saveSnippets() { /* no-op: SQLite auto-persist */ }

// ===========================================================================
// Watchdog (userId bazli)
// ===========================================================================

function getWatchdog(userId) {
    return watchdogDao.getWatchdog(userId);
}

function addWatchdog(userId, username) {
    return watchdogDao.addWatchdog(userId, username);
}

function saveWatchdog() { /* no-op: SQLite auto-persist */ }

// ===========================================================================
// Schedules (userId bazli)
// ===========================================================================

function getSchedules(userId) {
    return schedulesDao.getSchedules(userId);
}

function addSchedule(userId, schedule) {
    return schedulesDao.addSchedule(userId, schedule.chatId, schedule.content, schedule.time);
}

function markNotified(scheduleId) {
    return schedulesDao.markNotified(scheduleId);
}

function getPendingSchedules() {
    return schedulesDao.getPendingSchedules();
}

function saveSchedules() { /* no-op: SQLite auto-persist */ }

// ===========================================================================
// Stats & Gamification (userId bazli)
// ===========================================================================

function getStats(userId) {
    return statsDao.getStats(userId);
}

function getRank(xp) {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= RANK_THRESHOLDS[i].min) {
            return RANK_THRESHOLDS[i].name;
        }
    }
    return RANK_THRESHOLDS[0].name;
}

function updateStats(userId, type) {
    return statsDao.updateStats(userId, type);
}

function setDailyGoal(userId, goal) {
    return statsDao.setDailyGoal(userId, goal);
}

function saveStats() { /* no-op: SQLite auto-persist */ }

// ===========================================================================
// Backward compat: getState() - artik userId gerektirir
// ===========================================================================

function getState(userId) {
    if (!userId) {
        // Eger userId verilmezse sadece context'leri don (eski uyumluluk)
        return {
            targetTwitterUsername: '',
            currentFormat: 'punch',
            currentPersona: 'authority',
            remixContext,
            replyContext,
            abContext,
            frameworkContext
        };
    }

    const settings = getUserSettings(userId);
    return {
        ...settings,
        remixContext,
        replyContext,
        abContext,
        frameworkContext,
        draftsData: getDrafts(userId),
        snippetsData: getSnippets(userId),
        watchdogData: getWatchdog(userId),
        schedulesData: getSchedules(userId),
        statsData: getStats(userId)
    };
}

// ===========================================================================
// Exports
// ===========================================================================

module.exports = {
    // Backward compat
    getState,
    // User settings
    getUserSettings,
    setTwitterUsername,
    setFormat,
    setPersona,
    // Contexts (chatId bazli - degismedi)
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
    // Drafts (userId bazli)
    getDrafts,
    addDraft,
    deleteDraft,
    saveDrafts,
    // Snippets (userId bazli)
    getSnippets,
    setSnippet,
    deleteSnippet,
    saveSnippets,
    // Watchdog (userId bazli)
    getWatchdog,
    addWatchdog,
    saveWatchdog,
    // Schedules (userId bazli)
    getSchedules,
    addSchedule,
    markNotified,
    getPendingSchedules,
    saveSchedules,
    // Stats (userId bazli)
    getStats,
    updateStats,
    getRank,
    setDailyGoal,
    saveStats
};
