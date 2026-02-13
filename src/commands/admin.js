/**
 * XPatla Bot - Admin Komutlari
 * /invite, /users, /ban, /unban, /broadcast
 */

const { requireAdmin, handleUnauthorized } = require('../middleware/auth');
const { requirePrivateChat } = require('../middleware/chatTypeGuard');
const userDao = require('../db/dao/userDao');
const inviteDao = require('../db/dao/inviteDao');
const { sendSafeMessage } = require('../utils/helpers');

function register(bot) {

    // /invite - Davet kodu uret (SADECE DM)
    bot.onText(/\/invite/, (msg) => {
        if (!requirePrivateChat(bot, msg)) return;
        const chatId = msg.chat.id;
        const auth = requireAdmin(msg.from.id);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const result = inviteDao.createInviteCode(msg.from.id);
        const invites = inviteDao.getInvitesByUser(msg.from.id);
        const usedCount = invites.filter(i => i.used_by).length;
        const totalCount = invites.length;

        sendSafeMessage(bot, chatId,
            `🎫 *Yeni Davet Kodu:* \`${result.code}\`\n\n` +
            `Paylasim linki:\n\`/start ${result.code}\`\n\n` +
            `📊 Toplam: ${totalCount} kod | Kullanilan: ${usedCount}`, true);
    });

    // /users - Kayitli kullanicilari listele
    bot.onText(/\/users/, (msg) => {
        const chatId = msg.chat.id;
        const auth = requireAdmin(msg.from.id);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const users = userDao.getAllUsers();
        if (users.length === 0) {
            return sendSafeMessage(bot, chatId, 'Henuz kayitli kullanici yok.');
        }

        let list = `👥 *Kayitli Kullanicilar (${users.length}):*\n\n`;
        for (const u of users) {
            const status = u.is_banned ? ' ❌' : ' ✅';
            const role = u.role === 'admin' ? ' 👑' : '';
            const name = u.username ? `@${u.username}` : (u.first_name || u.telegram_id);
            const hasKey = u.xpatla_api_key ? '🔑' : '⚠️';
            list += `${status}${role} ${name} (${u.telegram_id}) ${hasKey}\n`;
        }

        list += '\n🔑 = API key var | ⚠️ = API key yok';
        sendSafeMessage(bot, chatId, list, true);
    });

    // /ban <telegram_id veya @username>
    bot.onText(/\/ban (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const auth = requireAdmin(msg.from.id);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const target = match[1].trim().replace('@', '');
        let targetUser = null;

        // Sayi ise telegram_id, degılse username
        if (/^\d+$/.test(target)) {
            targetUser = userDao.findByTelegramId(parseInt(target, 10));
        } else {
            targetUser = userDao.findByUsername(target);
        }

        if (!targetUser) {
            return sendSafeMessage(bot, chatId, `Kullanici bulunamadi: ${target}`);
        }

        if (targetUser.role === 'admin') {
            return sendSafeMessage(bot, chatId, 'Admin kullanicilar engellenemez.');
        }

        userDao.setBanned(targetUser.telegram_id, true);
        const name = targetUser.username ? `@${targetUser.username}` : targetUser.telegram_id;
        sendSafeMessage(bot, chatId, `🚫 Kullanici engellendi: ${name}`);
    });

    // /unban <telegram_id veya @username>
    bot.onText(/\/unban (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const auth = requireAdmin(msg.from.id);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const target = match[1].trim().replace('@', '');
        let targetUser = null;

        if (/^\d+$/.test(target)) {
            targetUser = userDao.findByTelegramId(parseInt(target, 10));
        } else {
            targetUser = userDao.findByUsername(target);
        }

        if (!targetUser) {
            return sendSafeMessage(bot, chatId, `Kullanici bulunamadi: ${target}`);
        }

        userDao.setBanned(targetUser.telegram_id, false);
        const name = targetUser.username ? `@${targetUser.username}` : targetUser.telegram_id;
        sendSafeMessage(bot, chatId, `✅ Engel kaldirildi: ${name}`);
    });

    // /broadcast <mesaj> - Tum kullanicilara mesaj gonder (SADECE DM)
    bot.onText(/\/broadcast (.+)/s, async (msg, match) => {
        if (!requirePrivateChat(bot, msg)) return;
        const chatId = msg.chat.id;
        const auth = requireAdmin(msg.from.id);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const message = match[1];
        const users = userDao.getAllUsers();
        let sent = 0;
        let failed = 0;

        for (const u of users) {
            if (u.is_banned) continue;
            try {
                await sendSafeMessage(bot, u.telegram_id, `📢 *Duyuru:*\n\n${message}`, true);
                sent++;
            } catch (_e) {
                failed++;
            }
        }

        sendSafeMessage(bot, chatId,
            `📢 Broadcast tamamlandi.\n✅ Gonderildi: ${sent}\n❌ Basarisiz: ${failed}`);
    });
}

module.exports = { register };
