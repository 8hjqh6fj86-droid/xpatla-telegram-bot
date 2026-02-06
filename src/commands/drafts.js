/**
 * Draft Commands
 * /kaydet, /taslaklar, /sil
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');

function register(bot) {
    // /kaydet (reply-based)
    bot.onText(/\/kaydet/, (msg) => {
        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Bir mesaji yanitlayarak (Reply) `/kaydet` yazmalisin.', true);
        }

        const contentToSave = msg.reply_to_message.text;

        try {
            state.addDraft(contentToSave);
            state.saveDrafts();
            sendSafeMessage(bot, msg.chat.id, '\u{2705} *Taslak Kaydedildi!* \n`/taslaklar` yazarak gorebilirsin.', true);
        } catch (e) {
            console.error('Taslak kayit hatasi:', e);
            sendSafeMessage(bot, msg.chat.id, '\u{274C} Kayit sirasinda hata olustu.');
        }
    });

    // /taslaklar
    bot.onText(/\/taslaklar/, (msg) => {
        const draftsData = state.getDrafts();

        if (draftsData.length === 0) {
            return sendSafeMessage(bot, msg.chat.id, '\u{1F4C2} *Henuz hic taslagin yok.* \nBegendirin bir mesaja yanit verip `/kaydet` diyebilirsin.', true);
        }

        const lastDrafts = [...draftsData].reverse().slice(0, 5);
        let response = `\u{1F4C2} *Son Kaydedilen Taslaklar:*\n\n`;

        lastDrafts.forEach((d, i) => {
            const preview = d.content.length > 50 ? d.content.substring(0, 50) + '...' : d.content;
            const date = d.date || d.created_at || '';
            response += `*${i + 1}.* (${date}) \n_${preview}_\n\u{1F4CB} ID: \`${d.id}\`\n\n`;
        });

        response += `\u{1F5D1}\u{FE0F} Silmek icin: \`/sil <ID>\`\n\u{1F441}\u{FE0F} Detay icin ID'yi kopyalayabilirsin.`;
        sendSafeMessage(bot, msg.chat.id, response, true);
    });

    // /sil <id>
    bot.onText(/\/sil (.+)/, (msg, match) => {
        const idToDelete = match[1].trim();
        const draftsBefore = state.getDrafts().length;

        state.deleteDraft(idToDelete);

        // Also try numeric comparison in case id is stored as number
        if (state.getDrafts().length === draftsBefore) {
            state.deleteDraft(parseInt(idToDelete, 10));
        }

        if (state.getDrafts().length < draftsBefore) {
            state.saveDrafts();
            sendSafeMessage(bot, msg.chat.id, '\u{1F5D1}\u{FE0F} *Taslak silindi.*', true);
        } else {
            sendSafeMessage(bot, msg.chat.id, '\u{274C} Taslak bulunamadi.');
        }
    });
}

module.exports = { register };
