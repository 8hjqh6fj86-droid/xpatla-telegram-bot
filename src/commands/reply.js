/**
 * Reply Commands
 * /reply <url>, /cevap
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { getApiClient } = require('../services/apiClientFactory');

function register(bot) {
    // /reply <url>
    bot.onText(/\/reply (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);
        const user = auth.user;

        const api = getApiClient(user.xpatla_api_key);
        if (!api) return sendSafeMessage(bot, chatId, 'Once /setkey ile XPatla API anahtarinizi girin.');

        const tweetUrl = match[1];
        const { targetTwitterUsername, currentPersona } = state.getUserSettings(userId);

        sendSafeMessage(bot, chatId, `\u{231B} Tweete uygun cevap uretiliyor...`);

        try {
            const response = await api.post('/tweets/generate-reply', {
                twitter_username: targetTwitterUsername,
                tweet_url: tweetUrl,
                persona: currentPersona
            });

            if (response.data.success && response.data.data.reply) {
                sendSafeMessage(bot, chatId, `\u{1F4AC} *Cevap Onerisi:*\n\n${response.data.data.reply.text}`, true);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            sendSafeMessage(bot, chatId, `\u{274C} *Hata:* ${errorMsg}`);
        }
    });

    // /cevap (reply-based)
    bot.onText(/\/cevap/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Bir tweete yanitlayarak (Reply) `/cevap` yazmalisin.', true);
        }

        const originalText = msg.reply_to_message.text;
        state.setReplyContext(msg.chat.id, originalText);

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{1F4AC} Normal Reply', callback_data: 'cevap_normal' },
                        { text: '\u{1F504} Quote Tweet', callback_data: 'cevap_quote' }
                    ],
                    [
                        { text: '\u{2705} Katiliyorum', callback_data: 'cevap_agree' },
                        { text: '\u{274C} Karsi Gorus', callback_data: 'cevap_disagree' }
                    ],
                    [
                        { text: '\u{1F914} Soru Sor', callback_data: 'cevap_question' },
                        { text: '\u{1F602} Mizahi', callback_data: 'cevap_funny' }
                    ]
                ]
            }
        };

        const preview = originalText.length > 50 ? originalText.substring(0, 50) + '...' : originalText;
        sendSafeMessage(bot, msg.chat.id, '\u{1F4AC} *Ne tur bir cevap istiyorsun?*', true);
        bot.sendMessage(msg.chat.id, `_"${preview}"_`, { parse_mode: 'Markdown', ...opts });
    });
}

module.exports = { register };
