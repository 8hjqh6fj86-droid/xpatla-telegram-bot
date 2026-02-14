/**
 * XPatla Bot v3.0.0 - Multi-User SQLite
 * Giris Noktasi: logger → config → db → bot → commands → callbacks → panel → baslat
 */

// Logger'i her seyden once yukle (console.log override)
const logger = require('./src/panel/logger');
logger.install();

const TelegramBot = require('node-telegram-bot-api');
const { token, ADMIN_USER_ID } = require('./src/config');
const panel = require('./src/panel/server');
const { BOT_COMMANDS } = require('./src/utils/constants');
const { getDb, closeDb } = require('./src/db');
const { registerAll } = require('./src/commands');
const callbacks = require('./src/callbacks');
const userDao = require('./src/db/dao/userDao');
const { getApiClient } = require('./src/services/apiClientFactory');

// Database baslat (tablolari olusturur)
getDb();

// Bot instance
const bot = new TelegramBot(token, { polling: true });

// Gelen mesajlari logla (hassas komutlar maskelenir)
const SENSITIVE_COMMANDS = ['/setkey'];
bot.on('message', (msg) => {
    const text = msg.text || '[media]';
    const isSensitive = SENSITIVE_COMMANDS.some(cmd => text.startsWith(cmd));
    const logText = isSensitive ? `${text.split(' ')[0]} ***` : text;
    console.log(`>>> [GELEN] ${msg.from.username || msg.from.first_name} (${msg.from.id}): ${logText}`);
});

// Tum komutlari ve callback'leri kaydet
registerAll(bot);
callbacks.register(bot);

// Bot baslatma
async function initializeBot() {
    try {
        // Admin varsa kredi bakiyesini kontrol et
        if (ADMIN_USER_ID) {
            const admin = userDao.findByTelegramId(ADMIN_USER_ID);
            if (admin && admin.xpatla_api_key) {
                const api = getApiClient(admin.xpatla_api_key);
                const response = await api.get('/credits/balance');
                const data = response.data.data;
                console.log(`Admin kredi: ${data.credits_balance}`);
            }
        }

        await bot.setMyCommands(BOT_COMMANDS);
        console.log('Telegram komut menusu guncellendi.');
    } catch (e) {
        console.error('Baslatma Hatasi:', e.message);
    }
}

initializeBot();

// Admin panel baslat
panel.start();

// Polling hatalari
bot.on('polling_error', (error) => {
    console.error('[POLLING HATASI]', error.code, error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Bot kapatiliyor...');
    closeDb();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_WRITE_AFTER_END') return;
    console.error('KRITIK HATA:', err);
});

console.log('Bot v3.0.0 Aktif - Multi-User SQLite.');
