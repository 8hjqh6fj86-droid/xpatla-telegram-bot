/**
 * Watchdog Commands
 * /izle, /radar, /rekabet
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { getApiClient } = require('../services/apiClientFactory');

function register(bot) {
    // /izle <user>
    bot.onText(/\/izle (.+)/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const username = match[1].replace('@', '').trim();

        state.addWatchdog(userId, username);
        state.saveWatchdog();

        sendSafeMessage(bot, msg.chat.id, `\u{1F50D} *@${username}* radara eklendi. Artik ondan ilham alabilirsin.`, true);
    });

    // /radar
    bot.onText(/\/radar/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const watchdogData = state.getWatchdog(userId);
        const keys = Object.keys(watchdogData);

        if (keys.length === 0) {
            return sendSafeMessage(bot, chatId, '\u{1F4E1} *Radar Bos!* Once `/izle <username>` ile birini takip et.');
        }

        const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);
        const target = keys[Math.floor(Math.random() * keys.length)];

        sendSafeMessage(bot, chatId, `\u{1F4E1} *Radar:* *@${target}* stili analiz ediliyor...`, true);

        try {
            const response = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: `@${target} kullanicisinin uslubunu ve tarzini analiz et. Tamamen onun gibi davranarak "guncel trendler" hakkinda viral bir tweet yaz.`,
                format: currentFormat,
                persona: currentPersona,
                count: 1
            });

            if (response.data.success) {
                const tweet = response.data.data.tweets[0].text;
                sendSafeMessage(bot, chatId, `\u{1F4E1} *Radar Yakalamasi (@${target} Tarzi):*\n\n${tweet}`, true);
            }
        } catch (e) {
            sendSafeMessage(bot, chatId, `\u{274C} Radar hatasi: ${e.message}`);
        }
    });

    // /rekabet <user> (with argument - generates analysis)
    bot.onText(/\/rekabet (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const targetUser = match[1].replace('@', '').trim();

        sendSafeMessage(bot, chatId, `\u{1F3AF} *@${targetUser}* icin rekabet stratejisi hazirlaniyor...`, true);

        try {
            const response = await api.post('/tweets/generate', {
                twitter_username: targetUser,
                topic: `Bu kullanicinin en guclu yanlarini analiz et ve ona rakip olabilmem icin 3 maddelik strateji uret.`,
                format: 'punch',
                persona: 'authority',
                count: 1
            });

            if (response.data.success && response.data.data.tweets) {
                const analysis = response.data.data.tweets[0].text;
                state.updateStats(userId, 'session_replies');

                const report = `
\u{1F3AF} *REKABET STRATEJI RAPORU: @${targetUser}*

\u{1F4CA} *Stil Analizi & Oneriler:*
${analysis}

\u{1F4A1} *Hizlandirilmis Aksiyon Plani:*
1. *Farklilas:* Onun deginmedigi teknik detaylara odaklan.
2. *Hook Cal:* En cok tutan giris kaliplarini kendi konuna uyarla.
3. *Vibe Ustunlugu:* Daha samimi ve "vibe coding" odakli bir dil kur.

\u{1F4B3} *Maliyet:* 1 Kredi Harcandi.
`;
                sendSafeMessage(bot, chatId, report, true);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            sendSafeMessage(bot, chatId, `\u{274C} Rekabet analizi hatasi: ${errorMsg}`);
        }
    });

    // /rekabet (without argument - shows usage)
    bot.onText(/\/rekabet$/, (msg) => {
        sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Lutfen analiz edilecek bir kullanici adi girin.\nOrnek: `/rekabet elonmusk`', true);
    });
}

module.exports = { register };
