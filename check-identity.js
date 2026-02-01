require('dotenv').config();
const axios = require('axios');
const token = process.env.TELEGRAM_BOT_TOKEN;

async function checkBot() {
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        console.log('🤖 BOT KİMLİĞİ:');
        console.log(`Ad: ${response.data.result.first_name}`);
        console.log(`Kullanıcı Adı: @${response.data.result.username}`);
        console.log(`ID: ${response.data.result.id}`);
    } catch (err) {
        console.error('❌ Token geçersiz veya bağlantı sorunu:', err.message);
    }
}

checkBot();
