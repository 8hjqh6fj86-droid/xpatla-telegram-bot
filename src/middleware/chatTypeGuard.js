/**
 * Chat Type Guard Middleware
 * Hassas komutlari sadece DM'de calistirir.
 * Grupta yazilirsa mesaji siler ve grupta + DM'de uyari gonderir.
 */

function requirePrivateChat(bot, msg) {
    if (msg.chat.type === 'private') return true;

    const firstName = msg.from.first_name || 'Kullanici';

    // Grupta yazilan hassas mesaji silmeye calis
    bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});

    // Grupta kisa uyari (herkes gorsun)
    bot.sendMessage(
        msg.chat.id,
        `${firstName}, bu komut sadece DM'de calisir. Bana ozel mesaj at.`
    ).catch(() => {});

    // DM'de de uyar (giderse bonus)
    bot.sendMessage(
        msg.from.id,
        'Bu komut guvenlik icin sadece DM\'de calisir.\nBuraya /setkey, /mykey, /delkey yazabilirsin.'
    ).catch(() => {});

    return false;
}

module.exports = { requirePrivateChat };
