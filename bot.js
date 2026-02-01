require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const hooksData = require('./data/hooks.json');
const ideasData = require('./data/ideas.json');
const templatesData = require('./data/templates.json');
const snippetsPath = path.join(__dirname, 'data', 'snippets.json');
let snippetsData = {};
try { snippetsData = require('./data/snippets.json'); } catch (e) { snippetsData = {}; }

const draftsPath = path.join(__dirname, 'data', 'drafts.json');
let draftsData = [];

// Drafts verisini güvenli yükle
try {
    draftsData = require('./data/drafts.json');
} catch (e) {
    console.log('Drafts dosyası boş veya yok, yeni başlatılıyor.');
    draftsData = [];
}

const watchdogPath = path.join(__dirname, 'data', 'watchdog.json');
let watchdogData = {};
try { watchdogData = require('./data/watchdog.json'); } catch (e) { watchdogData = {}; }

const schedulesPath = path.join(__dirname, 'data', 'schedules.json');
let schedulesData = [];
try { schedulesData = require('./data/schedules.json'); } catch (e) { schedulesData = []; }

// Stats verisini yükle
const statsPath = path.join(__dirname, 'data', 'stats.json');
let statsData = {
    session_tweets: 0,
    session_threads: 0,
    session_replies: 0,
    session_remixes: 0,
    last_activity: null,
    // Gamification & Goals
    total_xp: 0,
    current_streak: 0,
    last_streak_date: null,
    daily_goal: 0,
    daily_progress: 0,
    last_goal_date: null
};
try {
    statsData = require('./data/stats.json');
} catch (e) {
    console.log('Stats dosyası yok, yeni başlatılıyor.');
}

function getRank(xp) {
    if (xp < 50) return '👶 Çaylak';
    if (xp < 200) return '✍️ Yazar';
    if (xp < 500) return '🌟 Fenomen';
    if (xp < 1000) return '🤖 Algorithm God';
    return '👑 XPatla CEO';
}

function updateStats(type) {
    const now = new Date();
    const today = now.toLocaleDateString('tr-TR');

    // XP Artışı
    const xpMap = {
        'session_tweets': 10,
        'session_threads': 30,
        'session_replies': 5,
        'session_remixes': 15
    };
    statsData.total_xp = (statsData.total_xp || 0) + (xpMap[type] || 5);

    // Günlük Hedef (Sadece Tweet/Thread işlemleri)
    if (['session_tweets', 'session_threads'].includes(type)) {
        // Yeni gün kontrolü (Hedef için)
        if (statsData.last_goal_date !== today) {
            statsData.daily_progress = 0;
            statsData.last_goal_date = today;
        }

        statsData.daily_progress++;
    }

    // Streak Mantığı
    if (statsData.last_streak_date !== today) {
        // Dünün tarihini bul
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('tr-TR');

        if (statsData.last_streak_date === yesterdayStr) {
            statsData.current_streak++;
        } else {
            statsData.current_streak = 1; // Zincir koptu veya yeni başladı
        }
        statsData.last_streak_date = today;
    }

    statsData[type]++;
    statsData.last_activity = now.toLocaleString('tr-TR');
    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));

    return {
        goalCompleted: (statsData.daily_goal > 0 && statsData.daily_progress === statsData.daily_goal),
        newStreak: statsData.current_streak
    };
}
const {
    calculateViralScore,
    calculateHookScore,
    getScoreEmoji,
    getOptimizationTips
} = require('./utils/scoring');

/**
 * CONFIGURATION
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const xpatlaApiKey = process.env.XPATLA_API_KEY;
const xpatlaBaseUrl = 'https://xpatla.com/api/v1';

if (!token || !xpatlaApiKey) {
    console.error('Hata: TELEGRAM_BOT_TOKEN veya XPATLA_API_KEY eksik.');
    process.exit(1);
}

// Create bot
const bot = new TelegramBot(token, { polling: true });

// XPatla API Client with Timeout
let xpatlaApi = axios.create({
    baseURL: xpatlaBaseUrl,
    headers: {
        'Authorization': `Bearer ${xpatlaApiKey}`,
        'Content-Type': 'application/json'
    },
    timeout: 60000
});

// TEST_MODE MOCKING (Kredi yakmamak için) 🧪
// Kullanım: $env:TEST_MODE="true"; node bot.js
const TEST_MODE = process.env.TEST_MODE === 'true';
if (TEST_MODE) {
    console.log('🧪 TEST_MODE AKTİF: API çağrıları simüle edilecek, kredi harcanmayacak.');
    xpatlaApi.post = async (url, data) => {
        console.log(`[DRY RUN] API POST: ${url}`, data);
        return {
            data: {
                success: true,
                data: {
                    tweets: [{ text: `[TEST ÇIKTISI] Bu bir simülasyon tweetidir. Konu: ${data.topic || 'Genel'}` }],
                    credits_balance: 999
                }
            }
        };
    };
    xpatlaApi.get = async (url) => {
        console.log(`[DRY RUN] API GET: ${url}`);
        if (url.includes('balance')) {
            return { data: { data: { credits_balance: 999, accounts: [{ twitter_username: 'test_user' }] } } };
        }
        return { data: { success: true, data: [] } };
    };
}

/**
 * STATE MANAGEMENT
 */
let targetTwitterUsername = 'hrrcnes';
let currentFormat = 'punch';
let currentPersona = 'authority';
let remixContext = {};
let replyContext = {};
let abContext = {};
let watchdogContext = {};
let frameworkContext = {};

const VIRAL_FRAMEWORKS = {
    'case_study': { name: 'Vaka Analizi', description: 'Bir başarının veya projenin analizini yapar.' },
    'bridge': { name: 'Köprü (Before/After)', description: 'Eski vs Yeni hallerin kıyaslandığı dönüşüm hikayesi.' },
    'unpopular': { name: 'Zıt Görüş', description: 'Herkesin aksine savunduğunuz provokatif bir fikir.' },
    'how_to': { name: 'Pratik Rehber', description: 'Adım adım fayda sağlayan liste/rehber.' },
    'viral_story': { name: 'Viral Hikaye (1.8M Style)', description: 'Merak uyandırıcı, duygusal ve algoritma dostu bir hikaye formatı.' },
    'storytelling': { name: 'Hikaye Anlatıcılığı', description: 'Giriş, gelişme ve vurucu bir ders içeren anlatım tarzı.' }
};

// 1.8M İzlenen Efsanevi Tweet Metni (Referans İçin)
const LEGENDARY_VIRAL_TEXT = `bizim şirketteki stajyer çocuk, geçen toplantıda ceonun gözüne girmek için bir proje fikri attı ortaya... (ve gpt-5 ile 4 saatte bitirdi). Artık kod yazmayı değil, vibeı yönetmeyi öğrenmemiz lazım.`;


const TREND_TOPICS = [
    'DeepSeek vs ChatGPT',
    'Vibe Coding Devrimi',
    'Yapay Zeka Düzenlemeleri',
    'Junior Yazılımcıların Geleceği',
    'Cursor Editör Tüyoları',
    'No-Code/Low-Code Tartışmaları',
    'AGI Ne Zaman Geliyor?',
    'Teknoloji Bağımlılığı',
    'Algoritma Değişiklikleri'
];

const VALID_FORMATS = ['micro', 'punch', 'classic', 'spark', 'storm', 'longform', 'thunder', 'mega'];
const VALID_PERSONAS = ['authority', 'news', 'shitpost', 'mentalist', 'bilgi', 'sigma', 'doomer', 'hustler'];

// Gelen her mesajı logla (Daha detaylı)
bot.on('message', (msg) => {
    console.log(`>>> [GELEN] ${msg.from.username || msg.from.first_name}: ${msg.text}`);
});

/**
 * MESAJ GÖNDERME YARDIMCISI (En Güvenli Yol)
 */
async function sendSafeMessage(chatId, text, useMarkdown = false) {
    try {
        const options = useMarkdown ? { parse_mode: 'Markdown' } : {};
        await bot.sendMessage(chatId, text, options);
        console.log(`<<< [GÖNDERİLDİ] Chat: ${chatId}`);
    } catch (err) {
        console.error(`!!! [GÖNDERİM HATASI] Chat: ${chatId} - Hata: ${err.message}`);
        console.log(`--- [HATA DETAYI] Metin: ${text.substring(0, 100)}...`);

        // Markdown hatası olma ihtimaline karşı her şeyi temizle ve ham metin gönder
        try {
            const cleanText = text.replace(/[*_`\[\]()]/g, '');
            await bot.sendMessage(chatId, `⚠️ (Markdown Hatası Giderildi)\n\n${cleanText}`);
            console.log(`<<< [GÖNDERİLDİ - KURTARMA] Chat: ${chatId}`);
        } catch (innerErr) {
            console.error(`!!! [KRİTİK GÖNDERİM HATASI] ${innerErr.message}`);
        }
    }
}

// Bot başlatma ve hesap kontrolü
async function initializeBot() {
    try {
        console.log('XPatla hesapları kontrol ediliyor...');
        const response = await xpatlaApi.get('/credits/balance');
        const data = response.data.data;
        const accounts = data.accounts || [];

        if (accounts.length > 0) {
            const hasHrrcnes = accounts.find(a => a.twitter_username === 'hrrcnes');
            targetTwitterUsername = hasHrrcnes ? 'hrrcnes' : accounts[0].twitter_username;
            console.log(`Bot hazir. Aktif profil: @${targetTwitterUsername} | Kredi: ${data.credits_balance}`);
        }

        // Telegram Menü Komutlarını Ayarla
        await bot.setMyCommands([
            { command: '/tweet', description: 'Tweet Yaz 💳' },
            { command: '/thread', description: 'Thread Oluştur 💳' },
            { command: '/remix', description: 'Yeniden Yaz (Remix) 💳' },
            { command: '/ab', description: 'A/B Testi 💳' },
            { command: '/framework', description: 'Viral İskeletler 💳' },
            { command: '/voice', description: 'Sesli Tweet Rehberi' },
            { command: '/reply', description: 'Tweete Cevap Ver 💳' },
            { command: '/cevap', description: 'Cevap Seçenekleri 💳' },
            { command: '/rastgele', description: 'Otomatik Tweet 💳' },
            { command: '/rekabet', description: 'Rakip Analizi 💳' },
            { command: '/vibe', description: 'Duygu Analizi 🆓' },
            { command: '/hooks', description: 'Viral Girişler 🆓' },
            { command: '/fikir', description: 'İçerik Fikirleri 🆓' },
            { command: '/analiz', description: 'Metin Analizi 🆓' },
            { command: '/viral', description: 'Paylaşım Saati 🆓' },
            { command: '/gundem', description: 'Trend Konular 🆓' },
            { command: '/takvim', description: 'Haftalık Plan 🆓' },
            { command: '/stats', description: 'İstatistikler 🆓' },
            { command: '/kredi', description: 'Bakiye Sorgula 🆓' },
            { command: '/rutbe', description: 'Rütbe & Streak 🆓' },
            { command: '/hedef', description: 'Günlük Hedef 🆓' },
            { command: '/snippet', description: 'Kayıtlı Parçalar 🆓' },
            { command: '/sablon', description: 'Hazır Şablonlar 🆓' },
            { command: '/kaydet', description: 'Taslağa Sakla 🆓' },
            { command: '/taslaklar', description: 'Taslak Listesi 🆓' },
            { command: '/rezerve', description: 'Yayın Rezerve Et 🆓' },
            { command: '/sabah', description: 'Günlük Rapor 🆓' },
            { command: '/ornekler', description: 'Kullanım Örnekleri 🆓' },
            { command: '/nasil', description: 'Tam Kılavuz 🆓' },
            { command: '/clean', description: 'Ekranı Temizle 🆓' }
        ]);
        console.log('Telegram komut menüsü güncellendi.');

    } catch (e) {
        console.error('Başlatma API Hatası:', e.message);
    }
}

initializeBot();

// TEST KOMUTU - Bağlantı kontrolü
bot.onText(/\/ping/, (msg) => {
    sendSafeMessage(msg.chat.id, '🏓 *Pong!* Bağlantı aktif. ✅', true);
});

function formatAnalysis(text, apiData = {}) {
    const viral = calculateViralScore(text);
    const hook = calculateHookScore(text);
    const emoji = getScoreEmoji(viral);
    const tips = getOptimizationTips(text);

    let result = `\n\n*Analiz (X Algoritması):*\n`;
    result += `- Skor: ${viral}/100 ${emoji}\n`;
    result += `- Hook Gücü: ${hook}/100\n`;

    if (apiData.quality_score !== undefined) {
        result += `- AI Kalite: %${Math.round(apiData.quality_score * 100)}\n`;
    }

    if (tips.length > 0) {
        result += `\n*Tavsiyeler:*\n${tips.slice(0, 2).map(t => `💡 ${t}`).join('\n')}`;
    }

    return result;
}

// Help/Start komutu
bot.onText(/\/(start|help|yardim)/i, (msg) => {
    const help = `
🤖 *VibeEval Bot v1.9 - Viral Alpha*

✨ *API KULLANAN KOMUTLAR (Kredi Harcar):*
📝 \`/tweet <konu>\` - Tweet üretir 💳
🎲 \`/rastgele\` - Otomatik tweet 💳
🔄 \`/remix\` - (Reply) Yeniden yaz 💳
🧵 \`/thread <konu>\` - Thread üret 💳
💬 \`/reply <url>\` - Cevap önerisi 💳
🎯 \`/cevap\` - (Reply) Cevap menüsü 💳
🎯 \`/rekabet <user>\` - Rakip analizi 💳
🔀 \`/ab <konu>\` - A/B Testi 💳
🏗️ \`/framework\` - Viral İskeletler 💳
🎙️ *Sesli Tweet* - Sesini tweetle 💳

🆓 *ÜCRETSİZ KOMUTLAR:*
🪝 \`/hooks\` - Viral giriş cümleleri
💡 \`/fikir\` - İçerik fikri
🔍 \`/analiz <metin>\` - Algoritma testi
🧠 \`/vibe\` - (Reply) Duygu Analizi
📈 \`/viral\` - En iyi paylaşım saati
📊 \`/stats\` - İstatistikler
💾 \`/kaydet\` - Taslağa kaydet
📂 \`/taslaklar\` - Taslakları listele
🗑️ \`/sil <id>\` - Taslağı sil
🔥 \`/gundem\` - Trend konular
📅 \`/takvim\` - Haftalık plan
🎨 \`/prompt\` - (Reply) Görsel prompt
🎰 \`/slot\` - Motivasyon çarkı
📝 \`/sablon\` - Hazır taslaklar
✂️ \`/snippet\` - Kayıtlı parçalar
🎯 \`/hedef\` - Günlük hedef belirle
🏆 \`/rutbe\` - Seviye ve Streak
☀️ \`/sabah\` - Günlük Rapor
🔍 \`/izle <user>\` - Rakip Gözetle
📡 \`/radar\` - Rakip Radarı
⏰ \`/rezerve\` - Yayın Rezerve Et
💡 \`/ornekler\` - Pratik Örnekler
🧮 \`/hesapla\` - (Reply) Metin analizi
❓ \`/nasil\` - Tam rehber
🧹 \`/clean\` - Ekranı temizle

⚙️ *AYARLAR:*
👤 Profil: @${targetTwitterUsername} (\`/setuser\`)
🎨 Format: \`${currentFormat}\` (\`/setformat\`)
🎭 Persona: \`${currentPersona}\` (\`/setpersona\`)
💳 Bakiye: \`/kredi\`

📋 *TÜM FORMATLAR:*
micro, punch, classic, spark, storm, longform, thunder, mega

🎭 *TÜM PERSONALAR:*
authority, news, shitpost, mentalist, bilgi, sigma, doomer, hustler
`;
    sendSafeMessage(msg.chat.id, help, true);
});

// Nasıl Kullanılır Komutu
bot.onText(/\/nasil/, (msg) => {
    const guide = `
📚 *VibeEval Bot v1.9 Tam Kılavuz*

⚠️ *KREDİ BİLGİSİ:*
💳 = API kullanır, kredi harcar
🆓 = Ücretsiz, kredi harcamaz

━━━━━━━━━━━━━━━━━━━━

✨ *İÇERİK ÜRETİMİ* 💳
• \`/tweet <konu>\` - Tweet yaz
• \`/rastgele\` - Otomatik tweet
• \`/thread <konu>\` - 5 tweetlik seri
• \`/remix\` - (Reply) Farklı persona
• \`/reply <url>\` - Tweete cevap
• \`/cevap\` - (Yanıtla) Cevap menüsü
• \`/rekabet <user>\` - Rakip analizi
• \`/ab <konu>\` - A/B Testi
• \`/framework\` - Viral İskeletler
• 🎙️ *Ses Kaydı Gönder* - Sesli Tweet

🆓 *ÜCRETSİZ ARAÇLAR*
• \`/fikir\` - Konu önerir
• \`/hooks\` - Viral girişler
• \`/analiz <metin>\` - Skor hesaplar
• \`/vibe\` - Duygu/Enerji analizi
• \`/viral\` - İdeal paylaşım saati
• \`/gundem\` - Trend konular
• \`/takvim\` - Haftalık plan
• \`/prompter\` - (Reply) Görsel prompt
• \`/vmaster <konu>\` - 1.8M'lik hikaye tarzında üretim 🔥
• \`/snippet ekle <ad> <metin>\` - Parça kaydet
• \`/sablon\` - Hazır şablonlar

📊 *İSTATİSTİK & HESAP* 🆓
• \`/stats\` - Kullanım istatistikleri
• \`/kredi\` - Bakiye sorgula
• \`/rutbe\` - Oyunlaştırma durumu
• \`/hedef <sayi>\` - Günlük hedef koy
• \`/sabah\` - Günlük rapor

💾 *TASLAKLAR* 🆓
• \`/kaydet\` - (Reply) Sakla
• \`/taslaklar\` - Listele
• \`/sil <id>\` - Sil
• \`/rezerve <id> <saat>\` - Hatırlatıcı kur

⚙️ *AYARLAR*
• \`/setuser <kadi>\` - Hesap değiştir
• \`/setformat <tip>\` - Format ayarla
• \`/setpersona <tip>\` - Persona ayarla
• \`/ornekler\` - Komut kullanım örnekleri
• \`/clean\` - Ekranı temizle
`;
    sendSafeMessage(msg.chat.id, guide, true);
});

// Analiz komutu
bot.onText(/\/analiz (.+)/s, (msg, match) => {
    const text = match[1];
    const viral = calculateViralScore(text);
    const hook = calculateHookScore(text);
    const tips = getOptimizationTips(text);
    const emoji = getScoreEmoji(viral);

    let result = `📊 *X Algoritma Analizi*\n\n`;
    result += `✨ *Skor:* ${viral}/100 ${emoji}\n`;
    result += `🧲 *Hook Gücü:* ${hook}/100\n\n`;

    if (tips.length > 0) {
        result += `💡 *İyileştirme Tavsiyeleri:*\n${tips.map(t => `- ${t}`).join('\n')}`;
    } else {
        result += `✅ *Harika!* Algoritma için optimize görünüyor.`;
    }

    sendSafeMessage(msg.chat.id, result, true);
});

bot.onText(/\/setuser (.+)/, (msg, match) => {
    targetTwitterUsername = match[1].replace('@', '').trim();
    sendSafeMessage(msg.chat.id, `✅ Profil *@${targetTwitterUsername}* olarak ayarlandı.`, true);
});

bot.onText(/\/setformat (.+)/, (msg, match) => {
    const requested = match[1].toLowerCase().trim();
    if (VALID_FORMATS.includes(requested)) {
        currentFormat = requested;
        sendSafeMessage(msg.chat.id, `✅ Format *${currentFormat}* olarak ayarlandı.`, true);
    } else {
        sendSafeMessage(msg.chat.id, `❌ Geçersiz format. Liste: \`${VALID_FORMATS.join(', ')}\``, true);
    }
});

bot.onText(/\/setpersona (.+)/, (msg, match) => {
    const requested = match[1].toLowerCase().trim();
    if (VALID_PERSONAS.includes(requested)) {
        currentPersona = requested;
        sendSafeMessage(msg.chat.id, `✅ Persona *${currentPersona}* olarak ayarlandı.`, true);
    } else {
        sendSafeMessage(msg.chat.id, `❌ Geçersiz persona. Liste: \`${VALID_PERSONAS.join(', ')}\``, true);
    }
});

// Viral Master Üretimi (Özel 1.8M Algoritması)
bot.onText(/\/vmaster(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const topic = match[1] ? match[1].trim() : '';

    if (!topic) {
        return sendSafeMessage(chatId, '⚠️ Lütfen bir konu girin.\nÖrnek: `/vmaster vibe coding ile zengin olan çocuk`', true);
    }

    sendSafeMessage(chatId, `🔥 *1.8M Görüntülenme Potansiyelli* hikaye kurgulanıyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: `Şu konuyu tam olarak şu tarzda bir hikayeye dönüştür: "${LEGENDARY_VIRAL_TEXT}". Konu: ${topic}. Girişi merak uyandırıcı olsun, içinde bir 'stajyer vs senior' veya 'beklenen vs gerçek' çatışması olsun ve sonu "Artık sadece kod değil vibe yönetmek lazım" felsefesine bağlansın.`,
            format: 'longform',
            persona: 'authority',
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0].text;
            updateStats('session_tweets');
            const analysis = formatAnalysis(tweet);
            sendSafeMessage(chatId, `🏆 *Viral Master Çıktısı:*\n\n${tweet}\n\n---${analysis}`, true);
        }
    } catch (e) {
        sendSafeMessage(chatId, `❌ Hata: ${e.message}`);
    }
});

// Tweet Üretme
bot.onText(/\/tweet (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const topic = match[1];
    sendSafeMessage(chatId, `⌛ *@${targetTwitterUsername}* stiliyle tweet üretiliyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: topic,
            format: currentFormat,
            persona: currentPersona,
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0];
            const statsRes = updateStats('session_tweets');
            let analysis = formatAnalysis(tweet.text, tweet);

            if (statsRes.goalCompleted) {
                analysis += `\n\n🎉 *TEBRİKLER!* Günlük hedefini tamamladın! (+50 XP)`;
                statsData.total_xp += 50; // Bonus XP
            }

            sendSafeMessage(chatId, `✨ *Üretilen Tweet:*\n\n${tweet.text}\n\n---${analysis}`, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ *Hata:* ${errorMsg}`);
    }
});

// Thread Üretme
bot.onText(/\/thread (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const topic = match[1];
    sendSafeMessage(chatId, `⌛ *@${targetTwitterUsername}* stiliyle thread hazırlanıyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: topic,
            format: 'thread',
            persona: currentPersona
        });

        if (response.data.success && response.data.data.tweets) {
            const tweets = response.data.data.tweets;
            updateStats('session_threads');
            let threadText = `🧵 *Hazırlanan Thread*\n\n`;
            tweets.forEach((t, i) => {
                threadText += `${i + 1}/${tweets.length}\n${t.text}\n\n`;
            });
            sendSafeMessage(chatId, threadText, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ *Hata:* ${errorMsg}`);
    }
});

// Reply Üretme
bot.onText(/\/reply (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tweetUrl = match[1];
    sendSafeMessage(chatId, `⌛ Tweete uygun cevap üretiliyor...`);

    try {
        const response = await xpatlaApi.post('/tweets/generate-reply', {
            twitter_username: targetTwitterUsername,
            tweet_url: tweetUrl,
            persona: currentPersona
        });

        if (response.data.success && response.data.data.reply) {
            sendSafeMessage(chatId, `💬 *Cevap Önerisi:*\n\n${response.data.data.reply.text}`, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ *Hata:* ${errorMsg}`);
    }
});

bot.onText(/\/kredi/, async (msg) => {
    try {
        const response = await xpatlaApi.get('/credits/balance');
        const balance = response.data.data.credits_balance;
        sendSafeMessage(msg.chat.id, `💳 *Mevcut Krediniz:* ${balance}`, true);
    } catch (e) {
        sendSafeMessage(msg.chat.id, '❌ Kredi bilgisi alınamadı.');
    }
});

bot.onText(/\/hesaplar/, async (msg) => {
    try {
        const response = await xpatlaApi.get('/credits/balance');
        const accounts = response.data.data.accounts || [];

        if (accounts.length > 0) {
            let list = '👤 *Bağlı Hesaplarınız:*\n\n';
            accounts.forEach((acc, i) => {
                const primary = acc.is_primary ? ' ⭐' : '';
                list += `${i + 1}. @${acc.twitter_username}${primary}\n`;
            });
            list += '\n🔄 Değiştirmek için: \`/setuser <username>\`';
            sendSafeMessage(msg.chat.id, list, true);
        } else {
            sendSafeMessage(msg.chat.id, '❌ Hiç bağlı hesap bulunamadı.');
        }
    } catch (e) {
        sendSafeMessage(msg.chat.id, '❌ Hesaplar çekilemedi.');
    }
});

// KAYDET KOMUTU (Reply ile çalışır)
bot.onText(/\/kaydet/, (msg) => {
    // Reply kontrolü
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Bir mesajı yanıtlayarak (Reply) `/kaydet` yazmalısın.', true);
    }

    const contentToSave = msg.reply_to_message.text;
    const newDraft = {
        id: Date.now().toString(), // Basit ID
        content: contentToSave,
        date: new Date().toLocaleDateString('tr-TR')
    };

    draftsData.push(newDraft);

    // Dosyaya yaz
    try {
        fs.writeFileSync(draftsPath, JSON.stringify(draftsData, null, 2));
        sendSafeMessage(msg.chat.id, '✅ *Taslak Kaydedildi!* \n`/taslaklar` yazarak görebilirsin.', true);
    } catch (e) {
        console.error('Taslak kayıt hatası:', e);
        sendSafeMessage(msg.chat.id, '❌ Kayıt sırasında hata oluştu.');
    }
});

// TASLAKLAR KOMUTU
bot.onText(/\/taslaklar/, (msg) => {
    if (draftsData.length === 0) {
        return sendSafeMessage(msg.chat.id, '📂 *Henüz hiç taslağın yok.* \nBeğendiğin bir mesaja yanıt verip `/kaydet` diyebilirsin.', true);
    }

    // Son 5 taslağı göster (Ters sıra)
    const lastDrafts = [...draftsData].reverse().slice(0, 5);
    let response = `📂 *Son Kaydedilen Taslaklar:*\n\n`;

    lastDrafts.forEach((d, i) => {
        // İçeriği kısalt (ilk 50 karakter)
        const preview = d.content.length > 50 ? d.content.substring(0, 50) + '...' : d.content;
        response += `*${i + 1}.* (${d.date}) \n_${preview}_\n📋 ID: \`${d.id}\`\n\n`;
    });

    response += `🗑️ Silmek için: \`/sil <ID>\`\n👁️ Detay için ID'yi kopyalayabilirsin.`;
    sendSafeMessage(msg.chat.id, response, true);
});

// SİL KOMUTU
bot.onText(/\/sil (.+)/, (msg, match) => {
    const idToDelete = match[1].trim();
    const initialLength = draftsData.length;

    draftsData = draftsData.filter(d => d.id !== idToDelete);

    if (draftsData.length < initialLength) {
        fs.writeFileSync(draftsPath, JSON.stringify(draftsData, null, 2));
        sendSafeMessage(msg.chat.id, '🗑️ *Taslak silindi.*', true);
    } else {
        sendSafeMessage(msg.chat.id, '❌ Taslak bulunamadı.');
    }
});

// Hook Sistemi (Kategorili)
bot.onText(/\/hooks/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔮 Vibe Coding', callback_data: 'hook_vibe_coding' },
                    { text: '🤖 Algorithm God', callback_data: 'hook_algorithm_god' }
                ],
                [
                    { text: '🌐 Virtual Entity', callback_data: 'hook_virtual_entity' },
                    { text: '💪 Disiplin & Motivasyon', callback_data: 'hook_discipline_motivation' }
                ]
            ]
        }
    };
    sendSafeMessage(msg.chat.id, '🪝 *Hangi konuda viral giriş cümlesi (Hook) istiyorsun?*', true);
    bot.sendMessage(msg.chat.id, 'Seçim yap:', opts);
});

// Fikir Jeneratörü (Kategorili)
bot.onText(/\/fikir/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔮 Vibe Coding', callback_data: 'idea_vibe_coding' },
                    { text: '🤖 Algorithm God', callback_data: 'idea_algorithm_god' }
                ],
                [
                    { text: '🌐 Virtual Entity', callback_data: 'idea_virtual_entity' },
                    { text: '💪 Disiplin & Motivasyon', callback_data: 'idea_discipline_motivation' }
                ]
            ]
        }
    };
    sendSafeMessage(msg.chat.id, '💡 *Hangi konuda içerik fikri istiyorsun?*', true);
    bot.sendMessage(msg.chat.id, 'Seçim yap:', opts);
});

// REMIX KOMUTU (Reply ile çalışır)
bot.onText(/\/remix/, (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Bir tweete yanıt vererek (Reply) `/remix` yazmalısın.', true);
    }

    const originalText = msg.reply_to_message.text;
    remixContext[msg.chat.id] = originalText;

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🎭 Authority', callback_data: 'remix_authority' },
                    { text: '📰 News', callback_data: 'remix_news' }
                ],
                [
                    { text: '💩 Shitpost', callback_data: 'remix_shitpost' },
                    { text: '🧠 Mentalist', callback_data: 'remix_mentalist' }
                ],
                [
                    { text: '📚 Bilgi', callback_data: 'remix_bilgi' },
                    { text: '🐺 Sigma', callback_data: 'remix_sigma' }
                ],
                [
                    { text: '😔 Doomer', callback_data: 'remix_doomer' },
                    { text: '💪 Hustler', callback_data: 'remix_hustler' }
                ]
            ]
        }
    };

    const preview = originalText.length > 60 ? originalText.substring(0, 60) + '...' : originalText;
    sendSafeMessage(msg.chat.id, '🔄 *Hangi persona ile yeniden yazayım?*', true);
    bot.sendMessage(msg.chat.id, `_"${preview}"_`, { parse_mode: 'Markdown', ...opts });
});

// Callback Query Handler (Hook + Fikir + Remix + Cevap + Sablon)
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    try {
        // Spinner'ı hemen durdur
        await bot.answerCallbackQuery(callbackQuery.id);

        // HOOK SİSTEMİ
        if (action.startsWith('hook_')) {
            const category = action.replace('hook_', '');
            const hooks = hooksData[category];

            if (hooks && hooks.length > 0) {
                const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
                const catNames = {
                    'vibe_coding': '🔮 Vibe Coding',
                    'algorithm_god': '🤖 Algorithm God',
                    'virtual_entity': '🌐 Virtual Entity',
                    'discipline_motivation': '💪 Disiplin'
                };

                const response = `
🪝 *${catNames[category]} Hook Önerisi:*

"${randomHook}"

---
💡 *Tavsiye:* Bu cümleyi tweetin en başına koy ve altına detayları yaz.
`;
                sendSafeMessage(chatId, response, true);
            }
        }

        // FİKİR SİSTEMİ
        else if (action.startsWith('idea_')) {
            const category = action.replace('idea_', '');
            const ideas = ideasData[category];

            if (ideas && ideas.length > 0) {
                const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
                const catNames = {
                    'vibe_coding': '🔮 Vibe Coding',
                    'algorithm_god': '🤖 Algorithm God',
                    'virtual_entity': '🌐 Virtual Entity',
                    'discipline_motivation': '💪 Disiplin'
                };

                const response = `
💡 *${catNames[category]} İçerik Fikri:*

"${randomIdea}"

---
✍️ *Aksiyon:* Bu fikri kullanarak hemen bir taslak çıkar!
`;
                sendSafeMessage(chatId, response, true);
            }
        }

        // REMIX SİSTEMİ
        else if (action.startsWith('remix_')) {
            const targetPersona = action.replace('remix_', '');
            const originalText = remixContext[chatId];

            if (!originalText) {
                sendSafeMessage(chatId, '❌ *Hata:* Remix yapılacak metin bulunamadı (zaman aşımı). Lütfen tekrar `/remix` yaz.');
            } else {
                sendSafeMessage(chatId, `⏳ Tweet *${targetPersona}* moduna çevriliyor...`, true);

                // API Çağrısı
                try {
                    // Not: Topic olarak direkt metni veriyoruz ve başına instruction ekliyoruz
                    const promptTopic = `Şu tweeti yeniden yaz ve bana sadece tweeti ver: "${originalText}"`;

                    const response = await xpatlaApi.post('/tweets/generate', {
                        twitter_username: targetTwitterUsername,
                        topic: promptTopic,
                        format: currentFormat, // Formatı koru
                        persona: targetPersona, // Yeni persona
                        count: 1
                    });

                    if (response.data.success && response.data.data.tweets) {
                        const newTweet = response.data.data.tweets[0].text;
                        updateStats('session_remixes');
                        const analysis = formatAnalysis(newTweet);

                        const result = `
🔄 *Remix Sonucu (${targetPersona}):*

${newTweet}

---
${analysis}
`;
                        sendSafeMessage(chatId, result, true);
                    }
                } catch (e) {
                    console.error('Remix hatası:', e);
                    sendSafeMessage(chatId, '❌ Remix sırasında hata oluştu.');
                }

                // Contexti temizle
                delete remixContext[chatId];
            }
        }

        // CEVAP SİSTEMİ CALLBACK
        else if (action.startsWith('cevap_')) {
            const replyType = action.replace('cevap_', '');
            const originalText = replyContext[chatId];

            if (!originalText) {
                sendSafeMessage(chatId, '❌ *Hata:* Cevap verilecek metin bulunamadı. Lütfen tekrar `/cevap` yaz.');
            } else {
                const typeLabels = {
                    'normal': 'Normal Reply',
                    'quote': 'Quote Tweet',
                    'agree': 'Katılım Cevabı',
                    'disagree': 'Karşı Görüş',
                    'question': 'Soru Sorma',
                    'funny': 'Mizahi Cevap'
                };

                const typePrompts = {
                    'normal': 'Bu tweete kısa ve etkili bir reply yaz',
                    'quote': 'Bu tweeti quote tweet olarak paylaşmak için yorum yaz',
                    'agree': 'Bu tweete katıldığını belirten destekleyici bir cevap yaz',
                    'disagree': 'Bu tweete nazik ama karşı görüş içeren bir cevap yaz',
                    'question': 'Bu tweete düşündürücü bir soru sorarak cevap ver',
                    'funny': 'Bu tweete mizahi ve esprili bir cevap yaz'
                };

                sendSafeMessage(chatId, `⏳ *${typeLabels[replyType]}* hazırlanıyor...`, true);

                try {
                    const promptTopic = `${typePrompts[replyType]}: "${originalText}"`;

                    const response = await xpatlaApi.post('/tweets/generate', {
                        twitter_username: targetTwitterUsername,
                        topic: promptTopic,
                        format: 'micro',
                        persona: currentPersona,
                        count: 1
                    });

                    if (response.data.success && response.data.data.tweets) {
                        const reply = response.data.data.tweets[0].text;
                        updateStats('session_replies');

                        const result = `
💬 *${typeLabels[replyType]}:*

${reply}

---
📋 Kopyala ve X'e yapıştır!
`;
                        sendSafeMessage(chatId, result, true);
                    }
                } catch (e) {
                    console.error('Cevap hatası:', e);
                    sendSafeMessage(chatId, '❌ Cevap oluşturulurken hata oluştu.');
                }

                delete replyContext[chatId];
            }
        }

        // FRAMEWORK CALLBACK
        else if (action.startsWith('fw_')) {
            const type = action.replace('fw_', '');
            if (!VIRAL_FRAMEWORKS[type]) throw new Error('Framework tipi geçersiz.');

            frameworkContext[chatId] = { type: type, waitTopic: true };
            sendSafeMessage(chatId, `🏗️ *${VIRAL_FRAMEWORKS[type].name}* tasarımı seçildi.\n\nLütfen tweetin konusunu veya ana fikrini yazın:`, true);
        }

        // SABLON SİSTEMİ CALLBACK
        else if (action.startsWith('sablon_')) {
            const category = action.replace('sablon_', '');
            const templates = templatesData[category];

            if (templates && templates.length > 0) {
                const randomTemp = templates[Math.floor(Math.random() * templates.length)];

                const response = `
📝 *Hazır Şablon (${category.toUpperCase()}):*

\`${randomTemp}\`

---
📋 *Kullanım:* Kopyala ve köşeli parantezli \`[...]\` yerleri doldur!
`;
                bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            }
        }

        // A/B TEST SİSTEMİ CALLBACK
        else if (action.startsWith('ab_')) {
            const selectedIndex = parseInt(action.replace('ab_', ''));
            const context = abContext[chatId];

            if (!context || !context[selectedIndex]) {
                sendSafeMessage(chatId, '❌ *Hata:* A/B Test verisi bulunamadı.');
            } else {
                const tweetText = context[selectedIndex];
                updateStats('session_tweets');
                const analysis = formatAnalysis(tweetText);
                sendSafeMessage(chatId, `✅ *Seçilen Versiyon (${selectedIndex + 1}):* \n\n${tweetText}\n\n---${analysis}`, true);
                delete abContext[chatId];
            }
        }

        // Yükleniyor dairesini kaldır (Eğer catch'e girerse aşağıda tekrar handle edilecek)
    } catch (err) {
        console.error('Callback Hatası:', err);
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ İşlem sırasında bir hata oluştu.' }).catch(() => { });
        sendSafeMessage(chatId, '❌ Bir işlem hatası oluştu. Lütfen tekrar deneyin.');
    }
});

// GÜNDEM (Trend Avcısı)
bot.onText(/\/gundem/, (msg) => {
    // Rastgele 3 trend seç
    const shuffled = TREND_TOPICS.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    let response = `🔥 *Aktif Gündem & Trendler*\n\n`;
    selected.forEach((t, i) => {
        response += `${i + 1}. *${t}*\n`;
    });

    response += `\n💡 *Tavsiye:* Bu konulardan biriyle ilgili hemen \`/tweet\` at!`;
    sendSafeMessage(msg.chat.id, response, true);
});

// YAYINLA (X'e Gönder)
bot.onText(/\/yayinla/, async (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Yayınlamak istediğin tweete yanıt vererek (Reply) `/yayinla` yaz.', true);
    }

    const tweetText = msg.reply_to_message.text;
    sendSafeMessage(msg.chat.id, '🚀 *X\'e gönderiliyor...*', true);

    // Gerçek API entegrasyonu olmadığı için simülasyon yapıyoruz
    // Eğer XPatla API desteklerse buraya endpoint eklenebilir.
    setTimeout(() => {
        sendSafeMessage(msg.chat.id, `✅ *Tweet Başarıyla Yayınlandı!* \n\n🔗 [Tweeti Görüntüle](https://x.com/${targetTwitterUsername})`, true);
    }, 2000);
});

// CLEAN (Ekran Temizle - Hacky)
bot.onText(/\/clean/, async (msg) => {
    try {
        // Kullanıcının komutunu silmeyi dene (yetki varsa)
        bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => { });

        // Ekranı yukarı kaydıracak uzun boş mesaj (Invisible Character: Hangul Filler)
        // Bu karakter Telegram tarafından "dolu" sayılır ama görünmez.
        const spacer = '\u3164\n'.repeat(60);

        // Mesajı gönder
        const sent = await bot.sendMessage(msg.chat.id, `${spacer}🧹 *Sayfa Temizlendi*`, { parse_mode: 'Markdown' });

        // Mesajı bir süre sonra sil (Kullanıcı temizlenmiş hissi yaşasın)
        // Not: Mesaj silinince ekran geri kayabilir, bu Telegram'ın client davranışıdır.
        setTimeout(() => {
            bot.deleteMessage(msg.chat.id, sent.message_id).catch(() => { });
        }, 4000);

    } catch (e) {
        console.error('Clean hatası:', e);
    }
});

// TAKVİM (Haftalık Planlayıcı)
bot.onText(/\/takvim/, (msg) => {
    const plan = `
📅 *Bu Haftanın İçerik Reçetesi (AI & Tech)*

🟢 *Pazartesi (Motivasyon):*
"Junior yazılımcıların yaptığı 5 hata ve çözümü." (Thread)

🟡 *Salı (Tartışma):*
"DeepSeek gerçekten ChatGPT'yi bitirebilir mi?" (Anket + Soru)

🟠 *Çarşamba (Eğitim):*
"Cursor Editör ile kod yazma hızını 2x yap." (Video/Görselli Tweet)

🔴 *Perşembe (Hardcore):*
"X Algoritmasının Heavy Ranker mantığı nasıl çalışır?" (Teknik Bilgi Sel)

🔵 *Cuma (Meme/Mizah):*
Deploy edilen kodun patladığı o an... (GIF + Shitpost)

🟣 *Haftasonu (Serbest):*
Kendi projenizden bir ekran görüntüsü paylaşın. (#BuildInPublic)
`;
    sendSafeMessage(msg.chat.id, plan, true);
});

// PROMPT (Görsel Yardımcısı)
bot.onText(/\/prompt/, (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Bir tweete yanıt vererek `/prompt` yazmalısın.', true);
    }

    const text = msg.reply_to_message.text;
    // Basit bir prompt mühendisliği şablonu
    // Metnin ilk 100 karakterini al, İngilizceye çeviriyormuş gibi yap (gerçek çeviri için API lazım, şimdilik metni direkt kullanıyoruz ama stil ekliyoruz)

    const prompt = `
🎨 *Midjourney / Flux Prompt Önerisi:*

\`code aesthetics, futuristic interface showing "${text.substring(0, 50)}...", cyber punk neon lighting, matrix digital rain background, high quality, 8k, cinematic lighting, photorealistic --ar 16:9 --v 6.0\`

---
💡 *Tavsiye:* Bunu kopyalayıp Midjourney veya Flux'a yapıştır.
`;
    sendSafeMessage(msg.chat.id, prompt, true);
});


// ===============================
// YENİ ÖZELLİKLER (v1.6)
// ===============================

// 1. STATS - İstatistik Paneli 📊 (Geliştirilmiş)
bot.onText(/\/stats/, async (msg) => {
    try {
        const response = await xpatlaApi.get('/credits/balance');
        const balance = response.data.data.credits_balance;

        const statsMsg = `
📊 *Bot İstatistikleri*

🐦 *Üretim Sayıları (Bu Oturum):*
• Tweet: ${statsData.session_tweets}
• Thread: ${statsData.session_threads}
• Reply: ${statsData.session_replies}
• Remix: ${statsData.session_remixes}

💳 *Kredi Bakiyesi:* ${balance}
👤 *Aktif Profil:* @${targetTwitterUsername}
🎨 *Format:* ${currentFormat}
🎭 *Persona:* ${currentPersona}

⏰ *Son Aktivite:* ${statsData.last_activity || 'Yok'}

---
🏆 *Rütbe:* ${getRank(statsData.total_xp || 0)}
🔥 *Streak:* ${statsData.current_streak || 0} Gün
⚡ *XP:* ${statsData.total_xp || 0}
🎯 *Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 0}
`;
        sendSafeMessage(msg.chat.id, statsMsg, true);
    } catch (e) {
        sendSafeMessage(msg.chat.id, '❌ İstatistikler yüklenemedi.');
    }
});

// 2. REKABET - Rakip Analizi 🎯
bot.onText(/\/rekabet (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const competitor = match[1].replace('@', '').trim();

    sendSafeMessage(chatId, `🎯 *@${competitor}* analiz ediliyor...`, true);

    try {
        // Rakibin tarzında bir tweet üret
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: competitor,
            topic: 'güncel teknoloji trendi',
            format: currentFormat,
            persona: currentPersona,
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0];
            const analysis = `
🎯 *Rakip Analizi: @${competitor}*

📝 *Örnek Tarz Tahmini:*
${tweet.text}

---
💡 *Strateji:* Bu tarzı analiz edip, kendi sesinle adapte edebilirsin.
🔄 Benzer konuda tweet üretmek için: \`/tweet ${competitor} tarzı içerik\`
`;
            sendSafeMessage(chatId, analysis, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ Rakip analizi yapılamadı: ${errorMsg}`);
    }
});

// 3. VIRAL - En İyi Saat Önerisi 📈
bot.onText(/\/viral/, (msg) => {
    const now = new Date();
    const hour = now.getHours();
    let recommendation = '';
    let nextBest = '';

    if (hour >= 8 && hour < 10) {
        recommendation = '🟢 *ŞU AN İDEAL!* Sabah erken saatler, aktif kullanıcılar uyanıyor.';
        nextBest = 'Sonraki ideal: 12:00-14:00';
    } else if (hour >= 12 && hour < 14) {
        recommendation = '🟢 *ŞU AN İDEAL!* Öğle molası, scroll time.';
        nextBest = 'Sonraki ideal: 19:00-22:00';
    } else if (hour >= 19 && hour < 22) {
        recommendation = '🟢 *ŞU AN İDEAL!* Primetime! En yüksek engagement.';
        nextBest = 'Sonraki ideal: Yarın 08:00-10:00';
    } else if (hour >= 22 || hour < 8) {
        recommendation = '🟡 *ORTA SEVİYE* Gece kuşları online ama düşük hacim.';
        nextBest = 'Sonraki ideal: 08:00-10:00';
    } else {
        recommendation = '🟠 *DÜŞÜK AKTİVİTE* İş saatleri, insanlar meşgul.';
        nextBest = 'Sonraki ideal: 12:00-14:00 veya 19:00-22:00';
    }

    const viralMsg = `
📈 *X Algoritması Saat Analizi*

🕐 Şu an: *${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}*

${recommendation}

---
*Türkiye İçin İdeal Saatler:*
• ☀️ 08:00-10:00 (Sabah açılış)
• 🍽️ 12:00-14:00 (Öğle molası)  
• 🌙 19:00-22:00 (Primetime) ⭐

⏰ ${nextBest}
`;
    sendSafeMessage(msg.chat.id, viralMsg, true);
});

// 4. RASTGELE - Otomatik Konu + Tweet 🎲
bot.onText(/\/rastgele/, async (msg) => {
    const chatId = msg.chat.id;

    // Rastgele trend seç
    const randomTopic = TREND_TOPICS[Math.floor(Math.random() * TREND_TOPICS.length)];

    sendSafeMessage(chatId, `🎲 Rastgele konu: *${randomTopic}*\n⌛ Tweet üretiliyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: randomTopic,
            format: currentFormat,
            persona: currentPersona,
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0];
            updateStats('session_tweets');
            const analysis = formatAnalysis(tweet.text, tweet);

            sendSafeMessage(chatId, `🎲 *Rastgele Tweet:*\n\n${tweet.text}\n\n---${analysis}`, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ *Hata:* ${errorMsg}`);
    }
});

// 5. CEVAP - Gelişmiş Reply Sistemi 💬
bot.onText(/\/cevap/, (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Bir tweete yanıt vererek (Reply) `/cevap` yazmalısın.', true);
    }

    const originalText = msg.reply_to_message.text;
    replyContext[msg.chat.id] = originalText;

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💬 Normal Reply', callback_data: 'cevap_normal' },
                    { text: '🔄 Quote Tweet', callback_data: 'cevap_quote' }
                ],
                [
                    { text: '✅ Katılıyorum', callback_data: 'cevap_agree' },
                    { text: '❌ Karşı Görüş', callback_data: 'cevap_disagree' }
                ],
                [
                    { text: '🤔 Soru Sor', callback_data: 'cevap_question' },
                    { text: '😂 Mizahi', callback_data: 'cevap_funny' }
                ]
            ]
        }
    };

    const preview = originalText.length > 50 ? originalText.substring(0, 50) + '...' : originalText;
    sendSafeMessage(msg.chat.id, '💬 *Ne tür bir cevap istiyorsun?*', true);
    bot.sendMessage(msg.chat.id, `_"${preview}"_`, { parse_mode: 'Markdown', ...opts });
});

// 6. SLOT - Motivasyon Makinesi 🎰
bot.onText(/\/slot/, (msg) => {
    const slots = ['💎', '🚀', '🔥', '💰', '🧠', '⚡'];
    const r1 = slots[Math.floor(Math.random() * slots.length)];
    const r2 = slots[Math.floor(Math.random() * slots.length)];
    const r3 = slots[Math.floor(Math.random() * slots.length)];

    let result = `🎰 *Vibe Slot Machine*\n\n[ ${r1} | ${r2} | ${r3} ]\n\n`;

    const jackpotQuotes = [
        "🎉 *JACKPOT!* Bugün senin günün! Evren sana \"YÜRÜ!\" diyor. 🚀",
        "🌈 *HAYALLERİN GERÇEĞE DÖNÜŞÜYOR!* Bu enerjiyle durdurulamazsın! 🔥",
        "🥇 *ŞAMPİYON!* Algoritma bugün senin için çalışıyor! 💎"
    ];

    const nearMissQuotes = [
        "✨ *Güzel Enerji!* Çok yaklaştın, çalışmaya devam et!",
        "⚡ *Neredeyse Oluyordu!* Vibe'ın çok yüksek, sakın bırakma.",
        "🟠 *Sinyal Yakındı!* Algoritma seni seviyor ama henüz tam zamanı değil."
    ];

    const lossQuotes = [
        "📉 *Kaybettin ama vazgeçme.* Şans değil, disiplin kazanır. Tekrar dene!",
        "💡 *Hata yapmaktan korkma*, denememekten kork. Vibe'ını yüksek tut.",
        "🌊 *Dalgalar çekiliyor ama deniz hep orada.* Yarın senin günün olabilir.",
        "🛡️ *Disiplin Şansı Yener.* Bir tweet daha at, bir şans daha yarat!"
    ];

    if (r1 === r2 && r2 === r3) {
        result += jackpotQuotes[Math.floor(Math.random() * jackpotQuotes.length)];
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        result += nearMissQuotes[Math.floor(Math.random() * nearMissQuotes.length)];
    } else {
        result += lossQuotes[Math.floor(Math.random() * lossQuotes.length)];
    }

    sendSafeMessage(msg.chat.id, result, true);
});

// 7. HESAPLA - Metin Analizcisi 🧮
bot.onText(/\/hesapla/, (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return sendSafeMessage(msg.chat.id, '⚠️ Analiz edilecek metne yanıt vererek (Reply) `/hesapla` yaz.', true);
    }

    const text = msg.reply_to_message.text;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200 * 60); // Saniye cinsinden

    let status = '';
    if (charCount < 100) status = '🟡 Çok kısa (Etkileşim zor)';
    else if (charCount < 280) status = '🟢 İdeal Tweet uzunluğu';
    else status = '🔵 Uzun (Thread veya Longform için uygun)';

    const report = `
🧮 *Metin Analizi*

📏 *Karakter:* ${charCount}
📝 *Kelime:* ${wordCount}
⏱️ *Okuma Süresi:* ~${readTime} sn
📊 *Durum:* ${status}

💡 *Bilgi:* İdeal bir tweet genellikle 200-260 karakter arasındadır.
`;
    sendSafeMessage(msg.chat.id, report, true);
});

// 8. SABLON - Hazır Taslaklar 📝
bot.onText(/\/sablon/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔥 Viral', callback_data: 'sablon_viral' },
                    { text: '🧵 Thread', callback_data: 'sablon_thread' }
                ],
                [
                    { text: '⚡ Kısa & Öz', callback_data: 'sablon_kisa' }
                ]
            ]
        }
    };
    sendSafeMessage(msg.chat.id, '📝 *Hangi türde tweet şablonu istersin?*', true);
    bot.sendMessage(msg.chat.id, 'Seçim yap:', opts);
});

// 9. SNIPPET - Parça Yöneticisi ✂️
bot.onText(/\/snippet(?: (.+))?/, (msg, match) => {
    const arg = match[1] ? match[1].trim() : '';

    // /snippet (Liste)
    if (!arg) {
        const keys = Object.keys(snippetsData);
        if (keys.length === 0) {
            return sendSafeMessage(msg.chat.id, '✂️ *Henüz kayıtlı parça yok.*\nEkleme: `/snippet ekle <ad> <metin>`', true);
        }
        return sendSafeMessage(msg.chat.id, `✂️ *Kayıtlı Parçalar:*\n\n${keys.map(k => `• \`${k}\``).join('\n')}\n\nKullanım: \`/snippet <ad>\``, true);
    }

    const parts = arg.split(' ');
    const command = parts[0].toLowerCase();

    // /snippet ekle <isim> <metin>
    if (command === 'ekle') {
        if (parts.length < 3) return sendSafeMessage(msg.chat.id, '⚠️ Başlık ve metin girin.\nÖrnek: `/snippet ekle imza Link Bio\'da!`', true);
        const key = parts[1].toLowerCase();
        const content = parts.slice(2).join(' ');

        snippetsData[key] = content;
        fs.writeFileSync(snippetsPath, JSON.stringify(snippetsData, null, 2));
        return sendSafeMessage(msg.chat.id, `✅ *"${key}"* kaydedildi.`, true);
    }

    // /snippet sil <isim>
    if (command === 'sil') {
        const key = parts[1] ? parts[1].toLowerCase() : '';
        if (snippetsData[key]) {
            delete snippetsData[key];
            fs.writeFileSync(snippetsPath, JSON.stringify(snippetsData, null, 2));
            return sendSafeMessage(msg.chat.id, `🗑️ *"${key}"* silindi.`, true);
        }
        return sendSafeMessage(msg.chat.id, '❌ Bulunamadı.');
    }

    // /snippet <isim> (Kullanma)
    const key = command;
    if (snippetsData[key]) {
        return sendSafeMessage(msg.chat.id, snippetsData[key]); // Markdown yok, ham metin
    } else {
        return sendSafeMessage(msg.chat.id, `❌ *"${key}"* bulunamadı.`, true);
    }
});

// 10. HEDEF - Günlük Hedef Belirle 🎯
bot.onText(/\/hedef (\d+)/, (msg, match) => {
    const target = parseInt(match[1]);
    if (isNaN(target) || target <= 0) return sendSafeMessage(msg.chat.id, '⚠️ Geçerli bir sayı girin.');

    statsData.daily_goal = target;
    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));

    sendSafeMessage(msg.chat.id, `🎯 *Günlük Hedef Ayarlandı: ${target} Tweet*\nHadi çalışmaya başlayalım! 🚀`, true);
});

// 11. RUTBE - Oyunlaştırma Durumu 🏆
bot.onText(/\/rutbe/, (msg) => {
    const rank = getRank(statsData.total_xp || 0);
    const msgRank = `
🏆 *Oyunlaştırma Durumu*

👑 *Rütbe:* ${rank}
✨ *Total XP:* ${statsData.total_xp || 0}
🔥 *Günlük Streak:* ${statsData.current_streak || 0} Gün

🎯 *Bugünkü Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 'Yok'}
`;
    sendSafeMessage(msg.chat.id, msgRank, true);
});

// ===============================
// SUPER ASISTAN ÖZELLİKLERİ (v1.8)
// ===============================

// 12. SESLİ TWEET 🎙️
async function mockTranscribe(chatId) {
    const transcriptions = [
        "Bugün vibe coding hakkında harika bir gün!",
        "Twitter algoritması gerçekten bazen çok acımasız olabiliyor.",
        "Yeni bir proje üzerinde çalışıyorum, çok heyecanlıyım.",
        "Yapay zeka araçları iş akışımı inanılmaz hızlandırdı."
    ];
    return transcriptions[Math.floor(Math.random() * transcriptions.length)];
}

bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    sendSafeMessage(chatId, "🎙️ *Ses kaydı alınıyor ve yazıya dökülüyor...*", true);

    // Simüle transcription
    const text = await mockTranscribe(chatId);

    setTimeout(() => {
        sendSafeMessage(chatId, `✍️ *Transcription Tamamlandı:*\n\n"${text}"\n\nBu metni tweet'e dönüştürmek için konuyu onaylıyor musun? \`/tweet ${text}\` yazarak veya düzenleyerek devam edebilirsin.`, true);
    }, 2000);
});

// 13. GÜNLÜK RAPOR (Morning Briefing) ☀️
bot.onText(/\/sabah/, (msg) => {
    const today = new Date().toLocaleDateString('tr-TR');
    const rank = getRank(statsData.total_xp || 0);
    const randomTrend = TREND_TOPICS[Math.floor(Math.random() * TREND_TOPICS.length)];

    const briefing = `
☀️ *Günaydın Asistan!* Bugün ${today}

🔥 *Streak Durumu:* ${statsData.current_streak || 0} Gündür aktifsin!
🏆 *Mevcut Rütbe:* ${rank}
⚡ *Toplam XP:* ${statsData.total_xp || 0}

🎯 *Bugünkü Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 'Ayarlanmamış'}
📈 *Trend Önerisi:* Bugün *#${randomTrend.replace(/\s+/g, '')}* üzerine bir şeyler yazabilirsin.

💡 *Fikir:* "Yapay zeka ve ${randomTrend} kombinasyonu geleceğin iş modelini nasıl değiştirir?" konulu bir thread hazırla.
`;
    sendSafeMessage(msg.chat.id, briefing, true);
});

// 14. A/B TESTİ ÜRETİMİ 🔀
bot.onText(/\/ab (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const topic = match[1];
    sendSafeMessage(chatId, `🔀 *A/B Testi için 2 farklı versiyon üretiliyor...*`, true);

    try {
        // İki farklı persona ile üretim yapalım
        const p1 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];
        let p2 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];
        while (p1 === p2) p2 = VALID_PERSONAS[Math.floor(Math.random() * VALID_PERSONAS.length)];

        const res1 = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: topic,
            format: currentFormat,
            persona: p1,
            count: 1
        });

        const res2 = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: topic,
            format: currentFormat,
            persona: p2,
            count: 1
        });

        if (res1.data.success && res2.data.success) {
            const t1 = res1.data.data.tweets[0].text;
            const t2 = res2.data.data.tweets[0].text;

            abContext[chatId] = [t1, t2];

            const opts = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `Versiyon 1 (${p1})`, callback_data: 'ab_0' },
                            { text: `Versiyon 2 (${p2})`, callback_data: 'ab_1' }
                        ]
                    ]
                }
            };

            const report = `
🔀 *A/B Testi Sonuçları:*

*V1 (${p1}):*
${t1}

---
*V2 (${p2}):*
${t2}

🤔 Hangisini yayınlamak istersin?
`;
            bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...opts });
        }
    } catch (e) {
        sendSafeMessage(chatId, `❌ A/B Test hatası: ${e.message}`);
    }
});

// 15. RAKİP GÖZETLEME & RADAR 🔍
bot.onText(/\/izle (.+)/, (msg, match) => {
    const username = match[1].replace('@', '').trim();
    watchdogData[username] = { added_at: new Date().toISOString() };
    fs.writeFileSync(watchdogPath, JSON.stringify(watchdogData, null, 2));
    sendSafeMessage(msg.chat.id, `🔍 *@${username}* radara eklendi. Artık ondan ilham alabilirsin.`, true);
});

bot.onText(/\/radar/, async (msg) => {
    const keys = Object.keys(watchdogData);
    if (keys.length === 0) return sendSafeMessage(msg.chat.id, '📡 *Radar Boş!* Önce `/izle <username>` ile birini takip et.');

    const target = keys[Math.floor(Math.random() * keys.length)];
    sendSafeMessage(msg.chat.id, `📡 *Radar:* *@${target}* stili analiz ediliyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: target,
            topic: 'güncel trendler',
            format: currentFormat,
            persona: currentPersona,
            count: 1
        });

        if (response.data.success) {
            const tweet = response.data.data.tweets[0].text;
            sendSafeMessage(msg.chat.id, `📡 *Radar Yakalaması (@${target} Tarzı):*\n\n${tweet}`, true);
        }
    } catch (e) {
        sendSafeMessage(msg.chat.id, `❌ Radar hatası: ${e.message}`);
    }
});

// 16. AKILLI TAKVİM & REZERVE ⏰
bot.onText(/\/rezerve (\d+) (\d{2}:\d{2})/, (msg, match) => {
    const draftId = match[1];
    const time = match[2];

    const draft = draftsData.find(d => d.id === draftId);
    if (!draft) return sendSafeMessage(msg.chat.id, '❌ Taslak bulunamadı.');

    const newSchedule = {
        id: Date.now().toString(),
        chatId: msg.chat.id,
        content: draft.content,
        time: time,
        notified: false
    };

    schedulesData.push(newSchedule);
    fs.writeFileSync(schedulesPath, JSON.stringify(schedulesData, null, 2));

    sendSafeMessage(msg.chat.id, `⏰ *Tweet Rezerve Edildi!* Saat ${time} olduğunda sana hatırlatacağım.`, true);
});

// Arkaplan Kontrolcü (Rezerveler için)
setInterval(() => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    schedulesData.forEach(async (s) => {
        if (s.time === currentTime && !s.notified) {
            await sendSafeMessage(s.chatId, `⏰ *HATIRLATICI:* Rezerve ettiğin tweetin vakti geldi!\n\n"${s.content}"\n\nYayınlamak için \`/yayinla\` (Reply) komutunu kullanabilirsin.`, true);
            s.notified = true;
            fs.writeFileSync(schedulesPath, JSON.stringify(schedulesData, null, 2));
        }
    });
}, 60000);

// 17. ORNEKLER - Komut Kılavuzu 💡
bot.onText(/\/ornekler/, (msg) => {
    const examples = `
🚀 *VibeEval Tam Kullanım Kılavuzu*

📝 *1. İÇERİK ÜRETİMİ (Kredi Harcar 💳)*
• \`/tweet DeepSeek vs ChatGPT\` (Konu bazlı tweet)
• \`/rastgele\` (Zaman tüneline uygun rastgele tweet)
• \`/thread Yazılımda 20 yıl kuralı\` (5'li tweet serisi)
• \`/ab Yapay zeka sanatı\` (2 farklı persona ile A/B testi)
• \`/remix\` (Yanıtla) -> Farklı bir tarzda yeniden yazdırır
• \`/reply <url>\` -> Belirli bir tweete en etkili cevabı yazar
• \`/cevap\` (Yanıtla) -> Cevap menüsünü (Mizahi, Karşı Görüş vb.) açar

🔍 *2. ANALİZ & STRATEJİ (Ücretsiz 🆓)*
• \`/analiz <metin>\` -> Algoritma skorunu hesaplar (0-100)
• \`/hesapla\` (Yanıtla) -> Mevcut metni detaylı analiz eder
• \`/vibe\` (Yanıtla) -> Metnin duygusal "vibe"ını ölçer ✅
• \`/viral\` -> Şehrine göre en iyi paylaşım saati
• \`/gundem\` -> O anki X trendlerini listeler
• \`/takvim\` -> Haftalık içerik planı çıkarır
• \`/rekabet elonmusk\` -> Rakip analizi ve strateji sunar 💳

🛠️ *3. TASLAK & VERİMLİLİK (Ücretsiz 🆓)*
• \`/kaydet\` (Yanıtla) -> Tweeti taslaklara ekler
• \`/taslaklar\` -> Kayıtlı taslakları listeler
• \`/sil <id>\` -> Belirli bir taslağı siler
• \`/snippet ekle imza Bio'ya tıkla!\` -> Kalıp kaydeder
• \`/snippet imza\` -> Kayıtlı kalıbı getirir
• \`/sablon\` -> Hazır içerik şablonları seçer
• \`/framework\` -> Viral iskelet kütüphanesini açar 💳 ✅
• \`/rezerve <id> <saat>\` -> Taslağı saate kurar (Örn: \`/rezerve 123 18:00\`)
• \`/prompt\` (Yanıtla) -> Tweet için görsel üretim promptu hazırlar

⚙️ *4. AYARLAR & HESAP*
• \`/kredi\` -> Kalan API kredini gösterir
• \`/stats\` -> Kullanım istatistiklerini döker
• \`/rutbe\` -> XP ve Rütbe durumunu gösterir
• \`/hedef 5\` -> Günlük tweet hedefini belirler
• \`/setuser hrrcnes\` -> X profilini değiştirir
• \`/setformat punch\` -> Varsayılan yazım formatını ayarlar
• \`/setpersona sigma\` -> Varsayılan kişiliği ayarlar

✨ *5. DİĞER*
• \`/voice\` (Ses kaydı at) -> Sesi tweet'e çevirir
• \`/sabah\` -> Günlük özet raporunu sunar
• \`/slot\` -> Motivasyon çarkını çevirir
• \`/clean\` -> Sohbet ekranını temizler
`;
    sendSafeMessage(msg.chat.id, examples, true);
});

// 18. REKABET - Rakip Analizi 🎯
bot.onText(/\/rekabet(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetUser = match[1] ? match[1].replace('@', '').trim() : '';

    if (!targetUser) {
        return sendSafeMessage(chatId, '⚠️ Lütfen analiz edilecek bir kullanıcı adı girin.\nÖrnek: `/rekabet elonmusk`', true);
    }

    sendSafeMessage(chatId, `🎯 *@${targetUser}* için rekabet stratejisi hazırlanıyor...`, true);

    try {
        // Rekabet analizini XPatla API üzerinden simüle edilmiş veya direkt prompt ile çekiyoruz
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetUser,
            topic: `Bu kullanıcının en güçlü yanlarını analiz et ve ona rakip olabilmem için 3 maddelik strateji üret.`,
            format: 'punch',
            persona: 'authority',
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const analysis = response.data.data.tweets[0].text;
            updateStats('session_replies'); // Kredi harcadığı için istatistik yansıtalım

            const report = `
🎯 *REKABET STRATEJİ RAPORU: @${targetUser}*

📊 *Stil Analizi & Öneriler:*
${analysis}

💡 *Hızlandırılmış Aksiyon Planı:*
1. *Farklılaş:* Onun değinmediği teknik detaylara odaklan.
2. *Hook Çal:* En çok tutan giriş kalıplarını kendi konuna uyarla.
3. *Vibe Üstünlüğü:* Daha samimi ve "vibe coding" odaklı bir dil kur.

💳 *Maliyet:* 1 Kredi Harcandı.
`;
            sendSafeMessage(chatId, report, true);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(chatId, `❌ Rekabet analizi hatası: ${errorMsg}`);
    }
});

// 19. FRAMEWORK - Viral İskeletler 🏗️
bot.onText(/\/framework/, (msg) => {
    const chatId = msg.chat.id;
    const buttons = Object.keys(VIRAL_FRAMEWORKS).map(key => ([{
        text: VIRAL_FRAMEWORKS[key].name,
        callback_data: `fw_${key}`
    }]));

    bot.sendMessage(chatId, '🚀 *Bir Viral İskelet Seçin:*', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    });
});

// Framework konu girişi dinleyici
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (frameworkContext[chatId] && frameworkContext[chatId].waitTopic && text && !text.startsWith('/')) {
        const type = frameworkContext[chatId].type;
        const topic = text;
        delete frameworkContext[chatId];

        sendSafeMessage(chatId, `⌛ *${VIRAL_FRAMEWORKS[type].name}* iskeletine göre içerik üretiliyor...`, true);

        try {
            const response = await xpatlaApi.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: `Konu: ${topic}. Framework: ${VIRAL_FRAMEWORKS[type].name} (${VIRAL_FRAMEWORKS[type].description}) formatında viral bir tweet yaz.`,
                format: currentFormat,
                persona: currentPersona,
                count: 1
            });

            if (response.data.success && response.data.data.tweets) {
                const tweet = response.data.data.tweets[0].text;
                updateStats('session_tweets');
                const analysis = formatAnalysis(tweet);
                sendSafeMessage(chatId, `✨ *${VIRAL_FRAMEWORKS[type].name} Sonucu:*\n\n${tweet}\n\n---${analysis}`, true);
            } else {
                sendSafeMessage(chatId, '❌ İçerik üretilemedi, lütfen tekrar deneyin.');
            }
        } catch (e) {
            console.error('Framework Üretim Hatası:', e);
            sendSafeMessage(chatId, `❌ Framework hatası: ${e.message}`);
        }
    }
});

// 20. VIBE - Duygu ve Enerji Analizi 🧠
bot.onText(/\/vibe/, (msg) => {
    const chatId = msg.chat.id;
    const replyTo = msg.reply_to_message;
    const text = replyTo ? (replyTo.text || replyTo.caption) : msg.text.replace(/\/vibe/, '').trim();

    if (!text) {
        return sendSafeMessage(chatId, '⚠️ Lütfen bir tweete yanıt vererek `/vibe` yazın veya analiz edilecek metni yanına ekleyin.', true);
    }

    // Sentiment Logic (Mock analysis for now)
    const analysis = analyzeVibe(text);

    const report = `
🧠 *VIBE CHECK REPORT*

✨ *Genel Enerji:* ${analysis.tone}
📊 *Duygu Dağılımı:*
• 💡 İlham: %${analysis.scores.inspiration}
• 🔥 Provokasyon: %${analysis.scores.provocation}
• 🛠️ Fayda: %${analysis.scores.utility}
• 🎭 Eğlence: %${analysis.scores.entertainment}

💡 *Viral Tavsiyesi:*
${analysis.suggestion}
`;
    sendSafeMessage(chatId, report, true);
});

function analyzeVibe(text) {
    // Basit anahtar kelime analizi simülasyonu
    let isp = 20, pro = 20, uti = 20, ent = 20;

    if (/!|\?|neden|asla|hiçbir|herkes/i.test(text)) pro += 40;
    if (/nasil|rehber|adım|öğren/i.test(text)) uti += 40;
    if (/başarı|hayal|motivasyon|inandım/i.test(text)) isp += 40;
    if (text.length < 100 && pro > 30) ent += 30;

    let tone = '⚖️ Dengeli';
    if (pro > 50) tone = '🔥 Provokatif / Kışkırtıcı';
    else if (isp > 50) tone = '✨ İlham Verici';
    else if (uti > 50) tone = '📚 Faydalı / Eğitici';
    else if (ent > 50) tone = '🎭 Eğlenceli';

    const suggestions = [
        "Metne biraz daha kışkırtıcı bir soru ekleyerek '🔥 Provokasyon' dozunu artırabilirsin.",
        "Kullanıcılara doğrudan fayda sağlayan bir 'adım adım' listesi eklemek viralliği artırır.",
        "Daha kısa ve vurucu cümleler kullanarak eğlence dozunu artırmayı dene.",
        "Kendi başarı hikayenden bir detay ekleyerek ilham gücünü %40 artırabilirsin."
    ];

    return {
        tone: tone,
        scores: { inspiration: isp, provocation: pro, utility: uti, entertainment: ent },
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
    };
}

// Polling hataları
bot.on('polling_error', (error) => {
    console.error('[POLLING HATASI]', error.code, error.message);
});

process.on('uncaughtException', (err) => console.error('KRİTİK HATA:', err));

// 21. VOICE REHBER 🎙️
bot.onText(/\/voice/, (msg) => {
    sendSafeMessage(msg.chat.id, '🎙️ *Sesli Tweet Özelliği*\n\nBu özelliği kullanmak için bota doğrudan bir **ses kaydı** göndermeniz yeterlidir. \n\nBot sesinizi yazıya dökecek ve ardından seçili persona/format ile harika bir tweet taslağı hazırlayacaktır. 💳', true);
});

console.log('Bot v1.9.1 Aktif - Viral Alpha Mode Synchronized.');
