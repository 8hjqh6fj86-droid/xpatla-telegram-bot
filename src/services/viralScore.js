/**
 * XPatla Bot - Viral Score Servisi
 * Tweet'lerin viral potansiyelini hesaplar
 */

// Viral score hesaplama
function calculateViralScore(tweet) {
    let score = 500; // Base score
    const tips = [];

    // Uzunluk optimizasyonu (optimal: 100-200 karakter)
    const len = tweet.length;
    if (len >= 100 && len <= 200) {
        score += 100;
        tips.push('✓ Optimal uzunluk');
    } else if (len < 50) {
        score -= 50;
        tips.push('⚠️ Biraz kısa');
    } else if (len > 250) {
        score -= 30;
        tips.push('⚠️ Biraz uzun');
    }

    // Emoji bonus (1-2 emoji optimal)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojiCount = (tweet.match(emojiRegex) || []).length;
    if (emojiCount >= 1 && emojiCount <= 2) {
        score += 80;
        tips.push('✓ Doğru emoji kullanımı');
    } else if (emojiCount > 3) {
        score -= 30;
        tips.push('⚠️ Fazla emoji');
    }

    // Hook pattern'leri (dikkat çekiciler)
    const hookPatterns = [
        /^(bunu|bu|işte|dikkat|önemli|herkes|kimse|sır|gizli)/i,
        /\?$/,
        /!$/,
        /(👇|⬇️|🧵|📢)/,
        /(%\d+|\d+x|\d+k)/i
    ];
    const hasHook = hookPatterns.some(p => p.test(tweet));
    if (hasHook) {
        score += 100;
        tips.push('✓ Dikkat çekici hook');
    }

    // Tartışma/fikir işaretleri
    const opinionPatterns = [
        /(unpopular opinion|popüler olmayan|çoğu kişi|kimse söylemiyor)/i,
        /(aslında|gerçek şu ki|sana bir şey söyleyeyim)/i
    ];
    if (opinionPatterns.some(p => p.test(tweet))) {
        score += 80;
        tips.push('✓ Tartışma potansiyeli');
    }

    // Hikaye formatı bonus
    if (/^(geçen|dün|bugün|bir gün|hikaye|bizim)/i.test(tweet)) {
        score += 70;
        tips.push('✓ Hikaye formatı');
    }

    // Sayılar etkileşimi artırır
    if (/\d+/.test(tweet)) {
        score += 50;
        tips.push('✓ Sayısal veri');
    }

    // Soru işareti etkileşimi artırır
    if (/\?/.test(tweet)) {
        score += 40;
        tips.push('✓ Soru içeriyor');
    }

    // Thread işareti
    if (/👇|⬇️|🧵/.test(tweet)) {
        score += 60;
        tips.push('✓ Thread potansiyeli');
    }

    // Cap score between 100-1000
    score = Math.max(100, Math.min(1000, score));

    // Rozet belirle
    let badge = { text: '🌱 Başlangıç', level: 1 };
    if (score >= 900) badge = { text: '🔥 Viral Master', level: 6 };
    else if (score >= 800) badge = { text: '⚡ Trend Setter', level: 5 };
    else if (score >= 700) badge = { text: '💎 Diamond Tweet', level: 4 };
    else if (score >= 600) badge = { text: '🚀 Yükselen Yıldız', level: 3 };
    else if (score >= 500) badge = { text: '👍 İyi Potansiyel', level: 2 };

    return { score, tips, badge };
}

// Skor mesajı formatla
function formatScoreMessage(viralData) {
    const progressBar = generateProgressBar(viralData.score, 1000);

    return `📊 **Viral Score Analizi**

${viralData.badge.text}
━━━━━━━━━━━━━━━━━━━━
**Skor:** ${viralData.score}/1000
${progressBar}

**Analiz:**
${viralData.tips.join('\n')}
━━━━━━━━━━━━━━━━━━━━`;
}

// Progress bar oluştur
function generateProgressBar(current, max, length = 10) {
    const filled = Math.round((current / max) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    calculateViralScore,
    formatScoreMessage,
    generateProgressBar
};
