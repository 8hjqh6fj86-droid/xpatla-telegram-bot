/**
 * Settings Commands
 * /setuser, /setformat, /setpersona
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { VALID_FORMATS, VALID_PERSONAS } = require('../utils/constants');

function register(bot) {
    // /setuser <username>
    bot.onText(/\/setuser (.+)/, (msg, match) => {
        const username = match[1].replace('@', '').trim();
        state.setTwitterUsername(username);
        sendSafeMessage(bot, msg.chat.id, `\u{2705} Profil *@${username}* olarak ayarlandi.`, true);
    });

    // /setformat <format>
    bot.onText(/\/setformat (.+)/, (msg, match) => {
        const requested = match[1].toLowerCase().trim();

        if (VALID_FORMATS.includes(requested)) {
            state.setFormat(requested);
            sendSafeMessage(bot, msg.chat.id, `\u{2705} Format *${requested}* olarak ayarlandi.`, true);
        } else {
            sendSafeMessage(bot, msg.chat.id, `\u{274C} Gecersiz format. Liste: \`${VALID_FORMATS.join(', ')}\``, true);
        }
    });

    // /setpersona <persona>
    bot.onText(/\/setpersona (.+)/, (msg, match) => {
        const requested = match[1].toLowerCase().trim();

        if (VALID_PERSONAS.includes(requested)) {
            state.setPersona(requested);
            sendSafeMessage(bot, msg.chat.id, `\u{2705} Persona *${requested}* olarak ayarlandi.`, true);
        } else {
            sendSafeMessage(bot, msg.chat.id, `\u{274C} Gecersiz persona. Liste: \`${VALID_PERSONAS.join(', ')}\``, true);
        }
    });
}

module.exports = { register };
