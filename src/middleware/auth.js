/**
 * XPatla Bot - Auth Middleware
 * Kullanici dogrulama ve yetkilendirme
 */

const userDao = require('../db/dao/userDao');
const { sendSafeMessage } = require('../utils/helpers');

function requireAuth(userId) {
    const user = userDao.findByTelegramId(userId);
    if (!user) return { authorized: false, reason: 'not_registered' };
    if (user.is_banned) return { authorized: false, reason: 'banned' };

    // Son aktiflik guncelle
    userDao.touchLastActive(userId);

    return { authorized: true, user };
}

function requireAdmin(userId) {
    const authResult = requireAuth(userId);
    if (!authResult.authorized) return authResult;
    if (authResult.user.role !== 'admin') {
        return { authorized: false, reason: 'not_admin' };
    }
    return authResult;
}

function requireApiKey(user) {
    if (!user.xpatla_api_key) {
        return { hasKey: false };
    }
    return { hasKey: true };
}

function handleUnauthorized(bot, msg, reason) {
    const chatId = msg.chat ? msg.chat.id : msg;

    if (reason === 'not_registered') {
        return sendSafeMessage(bot, chatId,
            'Bu botu kullanmak icin kayit olmaniz gerekiyor.\n\n' +
            'Davet kodunuz varsa: `/start DAVET_KODU`\n' +
            'Davet kodu icin admin ile iletisime gecin.', true);
    }

    if (reason === 'banned') {
        return sendSafeMessage(bot, chatId,
            'Hesabiniz engellenmis. Admin ile iletisime gecin.', true);
    }

    if (reason === 'not_admin') {
        return sendSafeMessage(bot, chatId,
            'Bu komut sadece adminler icindir.', true);
    }
}

module.exports = { requireAuth, requireAdmin, requireApiKey, handleUnauthorized };
