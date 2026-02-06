require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const xpatlaApiKey = process.env.XPATLA_API_KEY;
const xpatlaBaseUrl = process.env.XPATLA_API_BASE_URL || 'https://xpatla.com/api/v1';
const TEST_MODE = process.env.TEST_MODE === 'true';

if (!token || !xpatlaApiKey) {
    console.error('Hata: TELEGRAM_BOT_TOKEN veya XPATLA_API_KEY eksik.');
    process.exit(1);
}

module.exports = {
    token,
    xpatlaApiKey,
    xpatlaBaseUrl,
    TEST_MODE
};
