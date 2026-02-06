/**
 * Snippet Commands
 * /snippet [ekle|sil|<name>]
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');

function register(bot) {
    bot.onText(/\/snippet(?: (.+))?/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const arg = match[1] ? match[1].trim() : '';
        const chatId = msg.chat.id;

        // /snippet (list all)
        if (!arg) {
            const snippetsData = state.getSnippets(userId);
            const keys = Object.keys(snippetsData);

            if (keys.length === 0) {
                return sendSafeMessage(bot, chatId, '\u{2702}\u{FE0F} *Henuz kayitli parca yok.*\nEkleme: `/snippet ekle <ad> <metin>`', true);
            }

            return sendSafeMessage(bot, chatId, `\u{2702}\u{FE0F} *Kayitli Parcalar:*\n\n${keys.map((k) => `\u{2022} \`${k}\``).join('\n')}\n\nKullanim: \`/snippet <ad>\``, true);
        }

        const parts = arg.split(' ');
        const command = parts[0].toLowerCase();

        // /snippet ekle <name> <text>
        if (command === 'ekle') {
            if (parts.length < 3) {
                return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} Baslik ve metin girin.\nOrnek: `/snippet ekle imza Link Bio\'da!`', true);
            }

            const key = parts[1].toLowerCase();
            const content = parts.slice(2).join(' ');

            state.setSnippet(userId, key, content);
            state.saveSnippets();

            return sendSafeMessage(bot, chatId, `\u{2705} *"${key}"* kaydedildi.`, true);
        }

        // /snippet sil <name>
        if (command === 'sil') {
            const key = parts[1] ? parts[1].toLowerCase() : '';
            const snippetsData = state.getSnippets(userId);

            if (snippetsData[key]) {
                state.deleteSnippet(userId, key);
                state.saveSnippets();
                return sendSafeMessage(bot, chatId, `\u{1F5D1}\u{FE0F} *"${key}"* silindi.`, true);
            }

            return sendSafeMessage(bot, chatId, '\u{274C} Bulunamadi.');
        }

        // /snippet <name> (show)
        const key = command;
        const snippetsData = state.getSnippets(userId);

        if (snippetsData[key]) {
            return sendSafeMessage(bot, chatId, snippetsData[key]);
        }

        return sendSafeMessage(bot, chatId, `\u{274C} *"${key}"* bulunamadi.`, true);
    });
}

module.exports = { register };
