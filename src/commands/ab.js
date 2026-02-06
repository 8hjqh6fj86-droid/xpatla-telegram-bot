/**
 * A/B Test Command
 * /ab <topic>
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { VALID_PERSONAS } = require('../utils/constants');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { getApiClient } = require('../services/apiClientFactory');

function register(bot) {
    bot.onText(/\/ab (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const topic = match[1];
        const { targetTwitterUsername, currentFormat } = state.getUserSettings(userId);

        sendSafeMessage(bot, chatId, `\u{1F500} *A/B Testi icin 2 farkli versiyon uretiliyor...*`, true);

        try {
            const p1 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];
            let p2 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];
            while (p1 === p2) {
                p2 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];
            }

            const res1 = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: topic,
                format: currentFormat,
                persona: p1,
                count: 1
            });

            const res2 = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: topic,
                format: currentFormat,
                persona: p2,
                count: 1
            });

            if (res1.data.success && res2.data.success) {
                const t1 = res1.data.data.tweets[0].text;
                const t2 = res2.data.data.tweets[0].text;

                state.setAbContext(chatId, [t1, t2]);

                const opts = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `Versiyon 1 (${p1})`, callback_data: 'ab_0' },
                                { text: `Versiyon 2 (${p2})`, callback_data: 'ab_1' }
                            ]
                        ]
                    }
                };

                const report = `
\u{1F500} *A/B Testi Sonuclari:*

*V1 (${p1}):*
${t1}

---
*V2 (${p2}):*
${t2}

\u{1F914} Hangisini yayinlamak istersin?
`;
                bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...opts });
            }
        } catch (e) {
            sendSafeMessage(bot, chatId, `\u{274C} A/B Test hatasi: ${e.message}`);
        }
    });
}

module.exports = { register };
