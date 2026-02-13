const services = require('../services');

/**
 * Güvenli mesaj gönderme - Markdown hatalarını otomatik düzeltir
 */
async function sendSafeMessage(bot, chatId, text, useMarkdown = false, extraOptions = {}) {
    try {
        const options = { ...(useMarkdown ? { parse_mode: 'Markdown' } : {}), ...extraOptions };
        await bot.sendMessage(chatId, text, options);
        console.log(`<<< [GÖNDERİLDİ] Chat: ${chatId}`);
    } catch (err) {
        console.error(`!!! [GÖNDERİM HATASI] Chat: ${chatId} - Hata: ${err.message}`);
        try {
            const cleanText = text.replace(/[*_`\[\]()]/g, '');
            await bot.sendMessage(chatId, `⚠️ (Markdown Hatası Giderildi)\n\n${cleanText}`);
            console.log(`<<< [GÖNDERİLDİ - KURTARMA] Chat: ${chatId}`);
        } catch (innerErr) {
            console.error(`!!! [KRİTİK GÖNDERİM HATASI] ${innerErr.message}`);
        }
    }
}

/**
 * Viral skor analizi formatla
 */
function formatAnalysis(text) {
    const viralData = services.calculateViralScore(text);
    return services.formatScoreMessage(viralData);
}

/**
 * Vibe analizi
 */
function analyzeVibe(text) {
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
        tone,
        scores: { inspiration: isp, provocation: pro, utility: uti, entertainment: ent },
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
    };
}

module.exports = {
    sendSafeMessage,
    formatAnalysis,
    analyzeVibe
};
