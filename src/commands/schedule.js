/**
 * Schedule Command
 * /rezerve <id> <HH:MM> + schedule checking interval
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');

function register(bot) {
    // /rezerve <id> <HH:MM>
    bot.onText(/\/rezerve (\d+) (\d{2}:\d{2})/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const draftId = match[1];
        const time = match[2];

        const draftsData = state.getDrafts(userId);
        const draft = draftsData.find((d) => String(d.id) === draftId);

        if (!draft) {
            return sendSafeMessage(bot, msg.chat.id, '\u{274C} Taslak bulunamadi.');
        }

        state.addSchedule(userId, {
            chatId: msg.chat.id,
            content: draft.content,
            time: time
        });
        state.saveSchedules();

        sendSafeMessage(bot, msg.chat.id, `\u{23F0} *Tweet Rezerve Edildi!* Saat ${time} oldugunda sana hatirlatacagim.`, true);
    });

    // Background schedule checker (every 60 seconds)
    // Uses getPendingSchedules() to check ALL users' pending schedules
    setInterval(() => {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const pendingSchedules = state.getPendingSchedules();

        pendingSchedules.forEach(async (s) => {
            if (s.time === currentTime) {
                await sendSafeMessage(
                    bot,
                    s.chat_id || s.chatId,
                    `\u{23F0} *HATIRLATICI:* Rezerve ettigin tweetin vakti geldi!\n\n"${s.content}"\n\nYayinlamak icin \`/yayinla\` (Reply) komutunu kullanabilirsin.`,
                    true
                );
                state.markNotified(s.id);
                state.saveSchedules();
            }
        });
    }, 60000);
}

module.exports = { register };
