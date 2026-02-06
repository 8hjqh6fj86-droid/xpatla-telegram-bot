/**
 * XPatla Bot - Error Handler Middleware
 * Global hata yakalama ve kullanıcıya güzel mesaj gösterme
 */

// Hata mesajları
const ERROR_MESSAGES = {
    'ETELEGRAM': '⚠️ Telegram API hatası. Lütfen tekrar dene.',
    'ECONNREFUSED': '⚠️ Bağlantı hatası. Lütfen bekle ve tekrar dene.',
    'ETIMEDOUT': '⚠️ İstek zaman aşımına uğradı. Tekrar dene.',
    'rate_limit': '⏳ Çok hızlısın! Birkaç saniye bekle.',
    'default': '❌ Bir hata oluştu. Lütfen tekrar dene.'
};

// Error handler
function errorHandler(bot) {
    bot.on('polling_error', (error) => {
        console.error('Polling Error:', error.code, error.message);
    });

    bot.on('error', (error) => {
        console.error('Bot Error:', error);
    });
}

// Kullanıcıya hata mesajı gönder
async function sendErrorMessage(bot, chatId, error) {
    let message = ERROR_MESSAGES.default;

    if (error.code && ERROR_MESSAGES[error.code]) {
        message = ERROR_MESSAGES[error.code];
    } else if (error.message && error.message.includes('rate')) {
        message = ERROR_MESSAGES.rate_limit;
    }

    try {
        await bot.sendMessage(chatId, message);
    } catch (e) {
        console.error('Hata mesajı gönderilemedi:', e);
    }
}

// Async handler wrapper
function asyncHandler(fn) {
    return async (msg, ...args) => {
        try {
            await fn(msg, ...args);
        } catch (error) {
            console.error('Handler Error:', error);
            // Hata mesajı gönderme opsiyonel
        }
    };
}

module.exports = {
    errorHandler,
    sendErrorMessage,
    asyncHandler,
    ERROR_MESSAGES
};
