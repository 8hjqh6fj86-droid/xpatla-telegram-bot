/**
 * Stats & Gamification Commands
 * /stats, /rutbe, /hedef, /slot, /sabah
 */

const state = require('../state');
const xpatlaApi = require('../services/xpatlaApi');
const { sendSafeMessage } = require('../utils/helpers');
const { TREND_TOPICS } = require('../utils/constants');

function register(bot) {
    // /stats - full stats panel with API balance check
    bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;
        const { targetTwitterUsername, currentFormat, currentPersona } = state.getState();
        const statsData = state.getStats();

        try {
            const response = await xpatlaApi.get('/credits/balance');
            const balance = response.data.data.credits_balance;

            const statsMsg = `
\u{1F4CA} *Bot Istatistikleri*

\u{1F426} *Uretim Sayilari (Bu Oturum):*
\u{2022} Tweet: ${statsData.session_tweets}
\u{2022} Thread: ${statsData.session_threads}
\u{2022} Reply: ${statsData.session_replies}
\u{2022} Remix: ${statsData.session_remixes}

\u{1F4B3} *Kredi Bakiyesi:* ${balance}
\u{1F464} *Aktif Profil:* @${targetTwitterUsername}
\u{1F3A8} *Format:* ${currentFormat}
\u{1F3AD} *Persona:* ${currentPersona}

\u{23F0} *Son Aktivite:* ${statsData.last_activity || 'Yok'}

---
\u{1F3C6} *Rutbe:* ${state.getRank(statsData.total_xp || 0)}
\u{1F525} *Streak:* ${statsData.current_streak || 0} Gun
\u{26A1} *XP:* ${statsData.total_xp || 0}
\u{1F3AF} *Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 0}
`;
            sendSafeMessage(bot, chatId, statsMsg, true);
        } catch (e) {
            sendSafeMessage(bot, chatId, '\u{274C} Istatistikler yuklenemedi.');
        }
    });

    // /rutbe - rank and streak info
    bot.onText(/\/rutbe/, (msg) => {
        const statsData = state.getStats();
        const rank = state.getRank(statsData.total_xp || 0);

        const msgRank = `
\u{1F3C6} *Oyunlastirma Durumu*

\u{1F451} *Rutbe:* ${rank}
\u{2728} *Total XP:* ${statsData.total_xp || 0}
\u{1F525} *Gunluk Streak:* ${statsData.current_streak || 0} Gun

\u{1F3AF} *Bugunku Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 'Yok'}
`;
        sendSafeMessage(bot, msg.chat.id, msgRank, true);
    });

    // /hedef <num> - set daily goal
    bot.onText(/\/hedef (\d+)/, (msg, match) => {
        const target = parseInt(match[1], 10);

        if (isNaN(target) || target <= 0) {
            return sendSafeMessage(bot, msg.chat.id, '\u{26A0}\u{FE0F} Gecerli bir sayi girin.');
        }

        state.setDailyGoal(target);
        state.saveStats();

        sendSafeMessage(bot, msg.chat.id, `\u{1F3AF} *Gunluk Hedef Ayarlandi: ${target} Tweet*\nHadi calismaya baslayalim! \u{1F680}`, true);
    });

    // /slot - motivation slot machine
    bot.onText(/\/slot/, (msg) => {
        const slots = ['\u{1F48E}', '\u{1F680}', '\u{1F525}', '\u{1F4B0}', '\u{1F9E0}', '\u{26A1}'];
        const r1 = slots[Math.floor(Math.random() * slots.length)];
        const r2 = slots[Math.floor(Math.random() * slots.length)];
        const r3 = slots[Math.floor(Math.random() * slots.length)];

        let result = `\u{1F3B0} *Vibe Slot Machine*\n\n[ ${r1} | ${r2} | ${r3} ]\n\n`;

        const jackpotQuotes = [
            "\u{1F389} *JACKPOT!* Bugun senin gunun! Evren sana \"YURU!\" diyor. \u{1F680}",
            "\u{1F308} *HAYALLERIN GERCEGE DONUSUYOR!* Bu enerjiyle durdurulamazsin! \u{1F525}",
            "\u{1F947} *SAMPIYON!* Algoritma bugun senin icin calisiyor! \u{1F48E}"
        ];

        const nearMissQuotes = [
            "\u{2728} *Guzel Enerji!* Cok yaklastin, calismaya devam et!",
            "\u{26A1} *Neredeyse Oluyordu!* Vibe'in cok yuksek, sakin birakma.",
            "\u{1F7E0} *Sinyal Yakindi!* Algoritma seni seviyor ama henuz tam zamani degil."
        ];

        const lossQuotes = [
            "\u{1F4C9} *Kaybettin ama vazgecme.* Sans degil, disiplin kazanir. Tekrar dene!",
            "\u{1F4A1} *Hata yapmaktan korkma*, denememekten kork. Vibe'ini yuksek tut.",
            "\u{1F30A} *Dalgalar cekiliyor ama deniz hep orada.* Yarin senin gunun olabilir.",
            "\u{1F6E1}\u{FE0F} *Disiplin Sansi Yener.* Bir tweet daha at, bir sans daha yarat!"
        ];

        if (r1 === r2 && r2 === r3) {
            result += jackpotQuotes[Math.floor(Math.random() * jackpotQuotes.length)];
        } else if (r1 === r2 || r2 === r3 || r1 === r3) {
            result += nearMissQuotes[Math.floor(Math.random() * nearMissQuotes.length)];
        } else {
            result += lossQuotes[Math.floor(Math.random() * lossQuotes.length)];
        }

        sendSafeMessage(bot, msg.chat.id, result, true);
    });

    // /sabah - morning briefing
    bot.onText(/\/sabah/, (msg) => {
        const today = new Date().toLocaleDateString('tr-TR');
        const statsData = state.getStats();
        const rank = state.getRank(statsData.total_xp || 0);
        const randomTrend = TREND_TOPICS[Math.floor(Math.random() * TREND_TOPICS.length)];

        const briefing = `
\u{2600}\u{FE0F} *Gunaydin Asistan!* Bugun ${today}

\u{1F525} *Streak Durumu:* ${statsData.current_streak || 0} Gundur aktifsin!
\u{1F3C6} *Mevcut Rutbe:* ${rank}
\u{26A1} *Toplam XP:* ${statsData.total_xp || 0}

\u{1F3AF} *Bugunku Hedef:* ${statsData.daily_progress}/${statsData.daily_goal || 'Ayarlanmamis'}
\u{1F4C8} *Trend Onerisi:* Bugun *#${randomTrend.replace(/\s+/g, '')}* uzerine bir seyler yazabilirsin.

\u{1F4A1} *Fikir:* "Yapay zeka ve ${randomTrend} kombinasyonu gelecegin is modelini nasil degistirir?" konulu bir thread hazirla.
`;
        sendSafeMessage(bot, msg.chat.id, briefing, true);
    });
}

module.exports = { register };
