/**
 * Analysis Commands
 * /analiz, /vibe, /hesapla, /viral
 */

const state = require('../state');
const { sendSafeMessage, analyzeVibe } = require('../utils/helpers');
const services = require('../services');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');

function register(bot) {
    // /analiz <text>
    bot.onText(/\/analiz (.+)/s, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const text = match[1];
        const viralData = services.calculateViralScore(text);
        const result = services.formatScoreMessage(viralData);
        sendSafeMessage(bot, msg.chat.id, result, true);
    });

    // /vibe (reply-based)
    bot.onText(/\/vibe/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const chatId = msg.chat.id;
        const replyTo = msg.reply_to_message;
        const text = replyTo
            ? (replyTo.text || replyTo.caption)
            : msg.text.replace(/\/vibe/, '').trim();

        if (!text) {
            return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} Lutfen bir tweete yanitlayarak `/vibe` yazin veya analiz edilecek metni yanina ekleyin.', true);
        }

        const analysis = analyzeVibe(text);

        const report = `
\u{1F9E0} *VIBE CHECK REPORT*

\u{2728} *Genel Enerji:* ${analysis.tone}
\u{1F4CA} *Duygu Dagilimi:*
\u{2022} \u{1F4A1} Ilham: %${analysis.scores.inspiration}
\u{2022} \u{1F525} Provokasyon: %${analysis.scores.provocation}
\u{2022} \u{1F6E0}\u{FE0F} Fayda: %${analysis.scores.utility}
\u{2022} \u{1F3AD} Eglence: %${analysis.scores.entertainment}

\u{1F4A1} *Viral Tavsiyesi:*
${analysis.suggestion}
`;
        sendSafeMessage(bot, chatId, report, true);
    });

    // /hesapla (reply-based)
    bot.onText(/\/hesapla/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        if (!msg.reply_to_message || !msg.reply_to_message.text) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Analiz edilecek metne yanitlayarak (Reply) `/hesapla` yaz.', true);
        }

        const text = msg.reply_to_message.text;
        const charCount = text.length;
        const wordCount = text.trim().split(/\s+/).length;
        const readTime = Math.ceil(wordCount / 200 * 60);

        let status = '';
        if (charCount < 100) {
            status = '\u{1F7E1} Cok kisa (Etkilesim zor)';
        } else if (charCount < 280) {
            status = '\u{1F7E2} Ideal Tweet uzunlugu';
        } else {
            status = '\u{1F535} Uzun (Thread veya Longform icin uygun)';
        }

        const report = `
\u{1F9EE} *Metin Analizi*

\u{1F4CF} *Karakter:* ${charCount}
\u{1F4DD} *Kelime:* ${wordCount}
\u{23F1}\u{FE0F} *Okuma Suresi:* ~${readTime} sn
\u{1F4CA} *Durum:* ${status}

\u{1F4A1} *Bilgi:* Ideal bir tweet genellikle 200-260 karakter arasindadir.
`;
        sendSafeMessage(bot, msg.chat.id, report, true);
    });

    // /viral - time-based posting recommendation
    bot.onText(/\/viral/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const now = new Date();
        const hour = now.getHours();
        let recommendation = '';
        let nextBest = '';

        if (hour >= 8 && hour < 10) {
            recommendation = '\u{1F7E2} *SU AN IDEAL!* Sabah erken saatler, aktif kullanicilar uyaniyor.';
            nextBest = 'Sonraki ideal: 12:00-14:00';
        } else if (hour >= 12 && hour < 14) {
            recommendation = '\u{1F7E2} *SU AN IDEAL!* Ogle molasi, scroll time.';
            nextBest = 'Sonraki ideal: 19:00-22:00';
        } else if (hour >= 19 && hour < 22) {
            recommendation = '\u{1F7E2} *SU AN IDEAL!* Primetime! En yuksek engagement.';
            nextBest = 'Sonraki ideal: Yarin 08:00-10:00';
        } else if (hour >= 22 || hour < 8) {
            recommendation = '\u{1F7E1} *ORTA SEVIYE* Gece kuslari online ama dusuk hacim.';
            nextBest = 'Sonraki ideal: 08:00-10:00';
        } else {
            recommendation = '\u{1F7E0} *DUSUK AKTIVITE* Is saatleri, insanlar mesgul.';
            nextBest = 'Sonraki ideal: 12:00-14:00 veya 19:00-22:00';
        }

        const viralMsg = `
\u{1F4C8} *X Algoritmasi Saat Analizi*

\u{1F550} Su an: *${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}*

${recommendation}

---
*Turkiye Icin Ideal Saatler:*
\u{2022} \u{2600}\u{FE0F} 08:00-10:00 (Sabah acilis)
\u{2022} \u{1F37D}\u{FE0F} 12:00-14:00 (Ogle molasi)
\u{2022} \u{1F319} 19:00-22:00 (Primetime) \u{2B50}

\u{23F0} ${nextBest}
`;
        sendSafeMessage(bot, msg.chat.id, viralMsg, true);
    });
}

module.exports = { register };
