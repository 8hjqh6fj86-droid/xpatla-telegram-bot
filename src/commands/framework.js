/**
 * Framework Command
 * /framework + message listener for topic input
 */

const state = require('../state');
const { sendSafeMessage, formatAnalysis } = require('../utils/helpers');
const { VIRAL_FRAMEWORKS } = require('../utils/constants');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { getApiClient } = require('../services/apiClientFactory');

function register(bot) {
    // /framework - show framework selection buttons
    bot.onText(/\/framework/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const chatId = msg.chat.id;
        const buttons = Object.keys(VIRAL_FRAMEWORKS).map((key) => ([{
            text: VIRAL_FRAMEWORKS[key].name,
            callback_data: `fw_${key}`
        }]));

        bot.sendMessage(chatId, '\u{1F680} *Bir Viral Iskelet Secin:*', {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
        });
    });

    // Message listener for framework topic input
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        const ctx = state.getFrameworkContext(chatId);
        if (ctx && ctx.waitTopic && text && !text.startsWith('/')) {
            const type = ctx.type;
            const topic = text;
            state.deleteFrameworkContext(chatId);

            const userId = msg.from.id;
            const auth = requireAuth(userId);
            if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
            const user = auth.user;

            const api = getApiClient(user.xpatla_api_key);
            if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

            const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);

            sendSafeMessage(bot, chatId, `\u{231B} *${VIRAL_FRAMEWORKS[type].name}* iskeletine gore icerik uretiliyor...`, true);

            try {
                const response = await api.post('/tweets/generate', {
                    twitter_username: targetTwitterUsername,
                    topic: `Konu: ${topic}. Framework: ${VIRAL_FRAMEWORKS[type].name} (${VIRAL_FRAMEWORKS[type].description}) formatinda viral bir tweet yaz.`,
                    format: currentFormat,
                    persona: currentPersona,
                    count: 1
                });

                if (response.data.success && response.data.data.tweets) {
                    const tweet = response.data.data.tweets[0].text;
                    state.updateStats(userId, 'session_tweets');
                    const analysis = formatAnalysis(tweet);
                    sendSafeMessage(bot, chatId, `\u{2728} *${VIRAL_FRAMEWORKS[type].name} Sonucu:*\n\n${tweet}\n\n---${analysis}`, true);
                } else {
                    sendSafeMessage(bot, chatId, '\u{274C} Icerik uretilemedi, lutfen tekrar deneyin.');
                }
            } catch (e) {
                console.error('Framework Uretim Hatasi:', e);
                sendSafeMessage(bot, chatId, `\u{274C} Framework hatasi: ${e.message}`);
            }
        }
    });
}

module.exports = { register };
