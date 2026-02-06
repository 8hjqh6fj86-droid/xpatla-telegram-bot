/**
 * Miscellaneous Commands
 * /gundem, /takvim, /hooks, /fikir, /sablon, /prompt, /clean, /yayinla,
 * /hesaplar, /kredi, /voice + voice handler
 */

const path = require('path');
const state = require('../state');
const xpatlaApi = require('../services/xpatlaApi');
const { sendSafeMessage } = require('../utils/helpers');
const { TREND_TOPICS } = require('../utils/constants');

const hooksData = require(path.join(__dirname, '..', '..', 'data', 'hooks.json'));
const ideasData = require(path.join(__dirname, '..', '..', 'data', 'ideas.json'));
const templatesData = require(path.join(__dirname, '..', '..', 'data', 'templates.json'));

function register(bot) {
    // /gundem - random 3 from TREND_TOPICS
    bot.onText(/\/gundem/, (msg) => {
        const shuffled = [...TREND_TOPICS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        let response = `\u{1F525} *Aktif Gundem & Trendler*\n\n`;
        selected.forEach((t, i) => {
            response += `${i + 1}. *${t}*\n`;
        });

        response += `\n\u{1F4A1} *Tavsiye:* Bu konulardan biriyle ilgili hemen \`/tweet\` at!`;
        sendSafeMessage(bot, msg.chat.id, response, true);
    });

    // /takvim - static weekly plan
    bot.onText(/\/takvim/, (msg) => {
        const plan = `
\u{1F4C5} *Bu Haftanin Icerik Receptesi (AI & Tech)*

\u{1F7E2} *Pazartesi (Motivasyon):*
"Junior yazilimcilarin yaptigi 5 hata ve cozumu." (Thread)

\u{1F7E1} *Sali (Tartisma):*
"DeepSeek gercekten ChatGPT'yi bitirebilir mi?" (Anket + Soru)

\u{1F7E0} *Carsamba (Egitim):*
"Cursor Editor ile kod yazma hizini 2x yap." (Video/Gorselli Tweet)

\u{1F534} *Persembe (Hardcore):*
"X Algoritmasinin Heavy Ranker mantigi nasil calisir?" (Teknik Bilgi Sel)

\u{1F535} *Cuma (Meme/Mizah):*
Deploy edilen kodun patladigi o an... (GIF + Shitpost)

\u{1F7E3} *Haftasonu (Serbest):*
Kendi projenizden bir ekran goruntusu paylasin. (#BuildInPublic)
`;
        sendSafeMessage(bot, msg.chat.id, plan, true);
    });

    // /hooks - category selection inline keyboard
    bot.onText(/\/hooks/, (msg) => {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{1F52E} Vibe Coding', callback_data: 'hook_vibe_coding' },
                        { text: '\u{1F916} Algorithm God', callback_data: 'hook_algorithm_god' }
                    ],
                    [
                        { text: '\u{1F310} Virtual Entity', callback_data: 'hook_virtual_entity' },
                        { text: '\u{1F4AA} Disiplin & Motivasyon', callback_data: 'hook_discipline_motivation' }
                    ]
                ]
            }
        };
        sendSafeMessage(bot, msg.chat.id, '\u{1FA9D} *Hangi konuda viral giris cumlesi (Hook) istiyorsun?*', true);
        bot.sendMessage(msg.chat.id, 'Secim yap:', opts);
    });

    // /fikir - category selection inline keyboard
    bot.onText(/\/fikir/, (msg) => {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{1F52E} Vibe Coding', callback_data: 'idea_vibe_coding' },
                        { text: '\u{1F916} Algorithm God', callback_data: 'idea_algorithm_god' }
                    ],
                    [
                        { text: '\u{1F310} Virtual Entity', callback_data: 'idea_virtual_entity' },
                        { text: '\u{1F4AA} Disiplin & Motivasyon', callback_data: 'idea_discipline_motivation' }
                    ]
                ]
            }
        };
        sendSafeMessage(bot, msg.chat.id, '\u{1F4A1} *Hangi konuda icerik fikri istiyorsun?*', true);
        bot.sendMessage(msg.chat.id, 'Secim yap:', opts);
    });

    // /sablon - category selection
    bot.onText(/\/sablon/, (msg) => {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{1F525} Viral', callback_data: 'sablon_viral' },
                        { text: '\u{1F9F5} Thread', callback_data: 'sablon_thread' }
                    ],
                    [
                        { text: '\u{26A1} Kisa & Oz', callback_data: 'sablon_kisa' }
                    ]
                ]
            }
        };
        sendSafeMessage(bot, msg.chat.id, '\u{1F4DD} *Hangi turde tweet sablonu istersin?*', true);
        bot.sendMessage(msg.chat.id, 'Secim yap:', opts);
    });

    // /prompt - reply-based image prompt generator
    bot.onText(/\/prompt/, (msg) => {
        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Bir tweete yanitlayarak `/prompt` yazmalisin.', true);
        }

        const text = msg.reply_to_message.text;

        const prompt = `
\u{1F3A8} *Midjourney / Flux Prompt Onerisi:*

\`code aesthetics, futuristic interface showing "${text.substring(0, 50)}...", cyber punk neon lighting, matrix digital rain background, high quality, 8k, cinematic lighting, photorealistic --ar 16:9 --v 6.0\`

---
\u{1F4A1} *Tavsiye:* Bunu kopyalayip Midjourney veya Flux'a yapistir.
`;
        sendSafeMessage(bot, msg.chat.id, prompt, true);
    });

    // /clean - delete message + spacer + auto-delete
    bot.onText(/\/clean/, async (msg) => {
        try {
            bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});

            const spacer = '\u3164\n'.repeat(60);
            const sent = await bot.sendMessage(msg.chat.id, `${spacer}\u{1F9F9} *Sayfa Temizlendi*`, { parse_mode: 'Markdown' });

            setTimeout(() => {
                bot.deleteMessage(msg.chat.id, sent.message_id).catch(() => {});
            }, 4000);
        } catch (e) {
            console.error('Clean hatasi:', e);
        }
    });

    // /yayinla - simulated publish
    bot.onText(/\/yayinla/, async (msg) => {
        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Yayinlamak istedigin tweete yanitlayarak (Reply) `/yayinla` yaz.', true);
        }

        const { targetTwitterUsername } = state.getState();
        sendSafeMessage(bot, msg.chat.id, '\u{1F680} *X\'e gonderiliyor...*', true);

        setTimeout(() => {
            sendSafeMessage(bot, msg.chat.id, `\u{2705} *Tweet Basariyla Yayinlandi!* \n\n\u{1F517} [Tweeti Goruntule](https://x.com/${targetTwitterUsername})`, true);
        }, 2000);
    });

    // /hesaplar - GET /credits/balance, list accounts
    bot.onText(/\/hesaplar/, async (msg) => {
        try {
            const response = await xpatlaApi.get('/credits/balance');
            const accounts = response.data.data.accounts || [];

            if (accounts.length > 0) {
                let list = '\u{1F464} *Bagli Hesaplariniz:*\n\n';
                accounts.forEach((acc, i) => {
                    const primary = acc.is_primary ? ' \u{2B50}' : '';
                    list += `${i + 1}. @${acc.twitter_username}${primary}\n`;
                });
                list += '\n\u{1F504} Degistirmek icin: \`/setuser <username>\`';
                sendSafeMessage(bot, msg.chat.id, list, true);
            } else {
                sendSafeMessage(bot, msg.chat.id, '\u{274C} Hic bagli hesap bulunamadi.');
            }
        } catch (e) {
            sendSafeMessage(bot, msg.chat.id, '\u{274C} Hesaplar cekilemedi.');
        }
    });

    // /kredi - GET /credits/balance, show balance
    bot.onText(/\/kredi/, async (msg) => {
        try {
            const response = await xpatlaApi.get('/credits/balance');
            const balance = response.data.data.credits_balance;
            sendSafeMessage(bot, msg.chat.id, `\u{1F4B3} *Mevcut Krediniz:* ${balance}`, true);
        } catch (e) {
            sendSafeMessage(bot, msg.chat.id, '\u{274C} Kredi bilgisi alinamadi.');
        }
    });

    // /voice - info message
    bot.onText(/\/voice/, (msg) => {
        sendSafeMessage(bot, msg.chat.id, '\u{1F399}\u{FE0F} *Sesli Tweet Ozelligi*\n\nBu ozelligi kullanmak icin bota dogrudan bir **ses kaydi** gondermeniz yeterlidir. \n\nBot sesinizi yaziya dokecek ve ardindan secili persona/format ile harika bir tweet taslagi hazirlayacaktir. \u{1F4B3}', true);
    });

    // Voice message handler - mockTranscribe with 4 random sentences
    bot.on('voice', async (msg) => {
        const chatId = msg.chat.id;
        sendSafeMessage(bot, chatId, "\u{1F399}\u{FE0F} *Ses kaydi aliniyor ve yaziya dokuluyor...*", true);

        const transcriptions = [
            "Bugun vibe coding hakkinda harika bir gun!",
            "Twitter algoritmasi gercekten bazen cok acimasiz olabiliyor.",
            "Yeni bir proje uzerinde calisiyorum, cok heyecanliyim.",
            "Yapay zeka araclari is akisimi inanilmaz hizlandirdi."
        ];
        const text = transcriptions[Math.floor(Math.random() * transcriptions.length)];

        setTimeout(() => {
            sendSafeMessage(bot, chatId, `\u{270D}\u{FE0F} *Transcription Tamamlandi:*\n\n"${text}"\n\nBu metni tweet'e donusturmek icin konuyu onayliyor musun? \`/tweet ${text}\` yazarak veya duzenleyerek devam edebilirsin.`, true);
        }, 2000);
    });
}

module.exports = { register };
