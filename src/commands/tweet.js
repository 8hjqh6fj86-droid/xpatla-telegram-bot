/**
 * Tweet Commands
 * /tweet, /vmaster, /rastgele
 */

const state = require('../state');
const { sendSafeMessage, formatAnalysis } = require('../utils/helpers');
const services = require('../services');
const { TREND_TOPICS, LEGENDARY_VIRAL_TEXT } = require('../utils/constants');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { getApiClient } = require('../services/apiClientFactory');

function register(bot) {
    // /tweet <topic>
    bot.onText(/\/tweet (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const topic = match[1];
        const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);

        sendSafeMessage(bot, chatId, `\u{231B} *@${targetTwitterUsername}* stiliyle tweet uretiliyor...`, true);

        try {
            const response = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: topic,
                format: currentFormat,
                persona: currentPersona,
                count: 1
            });

            if (response.data.success && response.data.data.tweets) {
                const tweet = response.data.data.tweets[0];
                const statsRes = state.updateStats(userId, 'session_tweets');
                let analysis = formatAnalysis(tweet.text);

                const viralData = services.calculateViralScore(tweet.text);
                const viralSection = `
\u{1F4CA} *Viral Score:* ${viralData.score}/1000 ${viralData.badge.text}
${services.generateProgressBar(viralData.score, 1000)}
${viralData.tips.slice(0, 3).join(' \u{2022} ')}`;

                if (statsRes.goalCompleted) {
                    analysis += `\n\n\u{1F389} *TEBRIKLER!* Gunluk hedefini tamamladin! (+50 XP)`;
                }

                sendSafeMessage(bot, chatId, `\u{2728} *Uretilen Tweet:*\n\n${tweet.text}\n\n---${viralSection}\n${analysis}`, true);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            sendSafeMessage(bot, chatId, `\u{274C} *Hata:* ${errorMsg}`);
        }
    });

    // /vmaster <topic>
    bot.onText(/\/vmaster(?: (.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const topic = match[1] ? match[1].trim() : '';
        const { targetTwitterUsername } = state.getUserSettings(userId);

        if (!topic) {
            return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} Lutfen bir konu girin.\nOrnek: `/vmaster vibe coding ile zengin olan cocuk`', true);
        }

        sendSafeMessage(bot, chatId, `\u{1F525} *1.8M Goruntulenme Potansiyelli* hikaye kurgulan\u{0131}yor...`, true);

        try {
            const response = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: `Su konuyu tam olarak su tarzda bir hikayeye donustur: "${LEGENDARY_VIRAL_TEXT}". Konu: ${topic}. Girisi merak uyandirici olsun, icinde bir 'stajyer vs senior' veya 'beklenen vs gercek' catismasi olsun ve sonu "Artik sadece kod degil vibe yonetmek lazim" felsefesine baglansin.`,
                format: 'longform',
                persona: 'authority',
                count: 1
            });

            if (response.data.success && response.data.data.tweets) {
                const tweet = response.data.data.tweets[0].text;
                state.updateStats(userId, 'session_tweets');
                const analysis = formatAnalysis(tweet);
                sendSafeMessage(bot, chatId, `\u{1F3C6} *Viral Master Ciktisi:*\n\n${tweet}\n\n---${analysis}`, true);
            }
        } catch (e) {
            sendSafeMessage(bot, chatId, `\u{274C} Hata: ${e.message}`);
        }
    });

    // /rastgele
    bot.onText(/\/rastgele/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);
        const randomTopic = TREND_TOPICS[Math.floor(Math.random() * TREND_TOPICS.length)];

        sendSafeMessage(bot, chatId, `\u{1F3B2} Rastgele konu: *${randomTopic}*\n\u{231B} Tweet uretiliyor...`, true);

        try {
            const response = await api.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: randomTopic,
                format: currentFormat,
                persona: currentPersona,
                count: 1
            });

            if (response.data.success && response.data.data.tweets) {
                const tweet = response.data.data.tweets[0];
                state.updateStats(userId, 'session_tweets');
                const analysis = formatAnalysis(tweet.text);

                sendSafeMessage(bot, chatId, `\u{1F3B2} *Rastgele Tweet:*\n\n${tweet.text}\n\n---${analysis}`, true);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            sendSafeMessage(bot, chatId, `\u{274C} *Hata:* ${errorMsg}`);
        }
    });
}

module.exports = { register };
