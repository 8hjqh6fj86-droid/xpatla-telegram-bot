/**
 * X Algoritması Karakter ve İçerik Puanlama Mantığı
 */

function calculateViralScore(text) {
    let score = 50;

    // Uzunluk kontrolü (200-260 karakter X algoritması için "sweet spot")
    if (text.length >= 200 && text.length <= 260) score += 15;
    else if (text.length >= 150 && text.length <= 280) score += 5;
    else if (text.length < 100) score -= 10;

    // Etkileşim artırıcı unsurlar (soru, hitap)
    if (/\?/.test(text)) score += 10;
    if (/\b(sen|siz|sizce|arkadaşlar|herkes)\b/i.test(text)) score += 10;

    // Sayısal veriler ve listeler
    if (/\d+/.test(text)) score += 5;
    if (/[\+\-•]\s/.test(text)) score += 10;

    // Negatif Sinyaller
    if (/https?:\/\//.test(text)) score -= 25; // Dış link algoritma düşmanıdır
    const hashtagCount = (text.match(/#/g) || []).length;
    if (hashtagCount > 2) score -= 15; // 2'den fazla hashtag spam algısı yaratır

    return Math.min(100, Math.max(0, score));
}

function calculateHookScore(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const firstLine = lines[0] || '';

    let score = 40;

    // İlk cümle uzunluğu (vurucu olmalı)
    if (firstLine.length >= 30 && firstLine.length <= 80) score += 30;

    // Tetikleyici kelimeler
    const hooks = /^(herkes|kimse|oysa|aslında|geçen|dikkat|bakın|şimdi|belki)/i;
    if (hooks.test(firstLine)) score += 20;

    // Soru ile başlama
    if (/\?/.test(firstLine)) score += 10;

    return Math.min(100, score);
}

function getScoreEmoji(score) {
    if (score >= 80) return '🔥 (Mükemmel)';
    if (score >= 60) return '📈 (İyi)';
    if (score >= 40) return '⚖️ (Orta)';
    return '⚠️ (Zayıf)';
}

function getOptimizationTips(text) {
    const tips = [];
    if (text.length < 150) tips.push('🔹 Biraz daha detay ekleyerek 200 karakter bandına çık.');
    if (text.length > 280) tips.push('🔹 280 karakter sınırını zorluyorsun, budamaya çalış.');
    if (!/\?/.test(text)) tips.push('🔹 Soru sorarak etkileşimi tetikleyebilirsin.');
    if (/https?:\/\//.test(text)) tips.push('⚠️ Dış link erişimi düşürür, yorumlara eklemeyi dene.');
    if ((text.match(/#/g) || []).length > 2) tips.push('⚠️ Çok fazla hashtag kullanmak algoritma puanını düşürür.');

    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines[0] && lines[0].length > 100) tips.push('🔹 Hook (ilk cümle) çok uzun, daha vurucu yap.');

    return tips;
}

module.exports = {
    calculateViralScore,
    calculateHookScore,
    getScoreEmoji,
    getOptimizationTips
};
