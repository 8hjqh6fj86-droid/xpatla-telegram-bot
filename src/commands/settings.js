/**
 * Settings Commands
 * /setuser, /setformat, /setpersona, /setkey, /mykey, /delkey
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { VALID_FORMATS, VALID_PERSONAS } = require('../utils/constants');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const { requirePrivateChat } = require('../middleware/chatTypeGuard');
const userDao = require('../db/dao/userDao');

/**
 * API key'i maskeleyerek gosterir: xp_***son4
 */
function maskApiKey(key) {
    if (!key || key.length < 8) return '***';
    const prefix = key.slice(0, 3);
    const suffix = key.slice(-4);
    return `${prefix}***${suffix}`;
}

function register(bot) {
    // /setuser <username>
    bot.onText(/\/setuser (.+)/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const username = match[1].replace('@', '').trim();
        state.setTwitterUsername(userId, username);
        sendSafeMessage(bot, msg.chat.id, `\u{2705} Profil *@${username}* olarak ayarlandi.`, true);
    });

    // /setformat <format>
    bot.onText(/\/setformat (.+)/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const requested = match[1].toLowerCase().trim();

        if (VALID_FORMATS.includes(requested)) {
            state.setFormat(userId, requested);
            sendSafeMessage(bot, msg.chat.id, `\u{2705} Format *${requested}* olarak ayarlandi.`, true);
        } else {
            sendSafeMessage(bot, msg.chat.id, `\u{274C} Gecersiz format. Liste: \`${VALID_FORMATS.join(', ')}\``, true);
        }
    });

    // /setpersona <persona>
    bot.onText(/\/setpersona (.+)/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const requested = match[1].toLowerCase().trim();

        if (VALID_PERSONAS.includes(requested)) {
            state.setPersona(userId, requested);
            sendSafeMessage(bot, msg.chat.id, `\u{2705} Persona *${requested}* olarak ayarlandi.`, true);
        } else {
            sendSafeMessage(bot, msg.chat.id, `\u{274C} Gecersiz persona. Liste: \`${VALID_PERSONAS.join(', ')}\``, true);
        }
    });

    // /setkey <api_key> - XPatla API key kaydet (SADECE DM)
    bot.onText(/\/setkey (.+)/, async (msg, match) => {
        if (!requirePrivateChat(bot, msg)) return;

        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const apiKey = match[1].trim();
        userDao.setApiKey(userId, apiKey);

        // Guvenlik: API key iceren mesaji sil
        try { await bot.deleteMessage(chatId, msg.message_id); } catch (_e) {}

        sendSafeMessage(bot, chatId, 'API anahtari kaydedildi! Guvenlik icin mesajiniz silindi.\n\nArtik /tweet, /thread gibi komutlari kullanabilirsiniz.', true);
    });

    // /mykey - Kayitli API key'i maskeli goster (SADECE DM)
    bot.onText(/\/mykey/, (msg) => {
        if (!requirePrivateChat(bot, msg)) return;

        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const user = auth.user;
        if (!user.xpatla_api_key) {
            return sendSafeMessage(bot, msg.chat.id, 'Kayitli API anahtariniz yok. `/setkey <key>` ile ekleyin.', true);
        }

        const masked = maskApiKey(user.xpatla_api_key);
        sendSafeMessage(bot, msg.chat.id, `Kayitli API anahtariniz: \`${masked}\``, true);
    });

    // /delkey - API key'i sil (SADECE DM)
    bot.onText(/\/delkey/, (msg) => {
        if (!requirePrivateChat(bot, msg)) return;

        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        userDao.setApiKey(userId, null);
        sendSafeMessage(bot, msg.chat.id, 'API anahtariniz silindi. Yeni key icin `/setkey <key>` kullanin.', true);
    });
}

module.exports = { register };
