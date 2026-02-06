/**
 * Remix Command
 * /remix (reply-based)
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');

function register(bot) {
    bot.onText(/\/remix/, (msg) => {
        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Bir tweete yanitlayarak (Reply) `/remix` yazmalisin.', true);
        }

        const originalText = msg.reply_to_message.text;
        state.setRemixContext(msg.chat.id, originalText);

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{1F3AD} Authority', callback_data: 'remix_authority' },
                        { text: '\u{1F4F0} News', callback_data: 'remix_news' }
                    ],
                    [
                        { text: '\u{1F4A9} Shitpost', callback_data: 'remix_shitpost' },
                        { text: '\u{1F9E0} Mentalist', callback_data: 'remix_mentalist' }
                    ],
                    [
                        { text: '\u{1F4DA} Bilgi', callback_data: 'remix_bilgi' },
                        { text: '\u{1F43A} Sigma', callback_data: 'remix_sigma' }
                    ],
                    [
                        { text: '\u{1F614} Doomer', callback_data: 'remix_doomer' },
                        { text: '\u{1F4AA} Hustler', callback_data: 'remix_hustler' }
                    ]
                ]
            }
        };

        const preview = originalText.length > 60 ? originalText.substring(0, 60) + '...' : originalText;
        sendSafeMessage(bot, msg.chat.id, '\u{1F504} *Hangi persona ile yeniden yazayim?*', true);
        bot.sendMessage(msg.chat.id, `_"${preview}"_`, { parse_mode: 'Markdown', ...opts });
    });
}

module.exports = { register };
