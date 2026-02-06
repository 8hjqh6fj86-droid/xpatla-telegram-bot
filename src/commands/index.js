/**
 * XPatla Bot - Commands Index
 * Registers all command handler modules with the bot instance
 */

const start = require('./start');
const tweet = require('./tweet');
const thread = require('./thread');
const reply = require('./reply');
const remix = require('./remix');
const framework = require('./framework');
const ab = require('./ab');
const analysis = require('./analysis');
const drafts = require('./drafts');
const snippets = require('./snippets');
const schedule = require('./schedule');
const watchdog = require('./watchdog');
const stats = require('./stats');
const settings = require('./settings');
const misc = require('./misc');

const modules = [
    start,
    tweet,
    thread,
    reply,
    remix,
    framework,
    ab,
    analysis,
    drafts,
    snippets,
    schedule,
    watchdog,
    stats,
    settings,
    misc
];

/**
 * Register all command handlers with the bot
 * @param {Object} bot - TelegramBot instance
 */
function registerAll(bot) {
    modules.forEach((mod) => mod.register(bot));
}

module.exports = {
    registerAll,
    start,
    tweet,
    thread,
    reply,
    remix,
    framework,
    ab,
    analysis,
    drafts,
    snippets,
    schedule,
    watchdog,
    stats,
    settings,
    misc
};
