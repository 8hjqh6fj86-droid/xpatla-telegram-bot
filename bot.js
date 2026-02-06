/**
 * XPatla Bot - Giriş Noktası
 * Modüler yapı: config → bot → commands → callbacks → başlat
 */

const TelegramBot = require('node-telegram-bot-api');
const { token } = require('./src/config');
const { BOT_COMMANDS } = require('./src/utils/constants');
const { registerAll } = require('./src/commands');
const callbacks = require('./src/callbacks');
const xpatlaApi = require('./src/services/xpatlaApi');
const state = require('./src/state');
const { sendSafeMessage } = require('./src/utils/helpers');

// Bot instance oluştur
const bot = new TelegramBot(token, { polling: true });

// Gelen mesajları logla
bot.on('message', (msg) => {
    console.log(`>>> [GELEN] ${msg.from.username || msg.from.first_name}: ${msg.text}`);
});

// Tüm komutları kaydet
registerAll(bot);

// Callback handler'ları kaydet
callbacks.register(bot);

// Bot başlatma ve hesap kontrolü
async function initializeBot() {
    try {
        console.log('XPatla hesapları kontrol ediliyor...');
        const response = await xpatlaApi.get('/credits/balance');
        const data = response.data.data;
        const accounts = data.accounts || [];

        if (accounts.length > 0) {
            const hasHrrcnes = accounts.find(a => a.twitter_username === 'hrrcnes');
            const username = hasHrrcnes ? 'hrrcnes' : accounts[0].twitter_username;
            state.setTwitterUsername(username);
            console.log(`Bot hazir. Aktif profil: @${username} | Kredi: ${data.credits_balance}`);
        }

        // Telegram komut menüsünü ayarla
        await bot.setMyCommands(BOT_COMMANDS);
        console.log('Telegram komut menüsü güncellendi.');
    } catch (e) {
        console.error('Başlatma API Hatası:', e.message);
    }
}

initializeBot();

// Polling hataları
bot.on('polling_error', (error) => {
    console.error('[POLLING HATASI]', error.code, error.message);
});

process.on('uncaughtException', (err) => console.error('KRİTİK HATA:', err));

console.log('Bot v2.0.0 Aktif - Modüler Yapı.');
