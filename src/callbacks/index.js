/**
 * XPatla Bot - Callback Query Handler
 * Handles ALL callback_query events from inline keyboards
 */

const path = require('path');
const state = require('../state');
const xpatlaApi = require('../services/xpatlaApi');
const { sendSafeMessage, formatAnalysis } = require('../utils/helpers');
const { VIRAL_FRAMEWORKS } = require('../utils/constants');

const hooksData = require(path.join(__dirname, '..', '..', 'data', 'hooks.json'));
const ideasData = require(path.join(__dirname, '..', '..', 'data', 'ideas.json'));
const templatesData = require(path.join(__dirname, '..', '..', 'data', 'templates.json'));

// ---------------------------------------------------------------------------
// Reply type prompt map for cevap_* callbacks
// ---------------------------------------------------------------------------
const REPLY_PROMPTS = {
    normal: 'Bu tweete kisa ve etkili bir reply yaz',
    quote: 'Bu tweeti quote tweet olarak paylasmak icin yorum yaz',
    agree: 'Bu tweete katildigini belirten kisa bir cevap yaz',
    disagree: 'Bu tweete karsi gorus belirten bir cevap yaz',
    question: 'Bu tweete dusundurucucu bir soru ile cevap yaz',
    funny: 'Bu tweete mizahi ve esprili bir cevap yaz'
};

// ---------------------------------------------------------------------------
// Utility: pick a random element from an array
// ---------------------------------------------------------------------------
function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Menu system callback handlers
// ---------------------------------------------------------------------------
function handleMenuCallbacks(bot, chatId, action) {
    switch (action) {
        case 'quick_tweet':
            return sendSafeMessage(
                bot, chatId,
                '\u{1F4DD} *Konu yaz:*\n\nOrnek: `/tweet yapay zeka gelecekte isleri nasil degistirecek`',
                true
            );

        case 'quick_thread':
            return sendSafeMessage(
                bot, chatId,
                '\u{1F9F5} *Thread konusu yaz:*\n\nOrnek: `/thread mass adoption neden 2025te olacak`',
                true
            );

        case 'quick_remix':
            return sendSafeMessage(
                bot, chatId,
                '\u{1F504} *Remix kullanimi:*\n\nBir tweete yanitlayarak `/remix` yaz. Bot farkli bir persona ile yeniden yazacak.',
                true
            );

        case 'quick_reply':
            return sendSafeMessage(
                bot, chatId,
                '\u{1F4AC} *Cevap kullanimi:*\n\nBir tweete yanitlayarak `/cevap` yaz. Cevap menusu acilacak.',
                true
            );

        case 'random_idea': {
            const categories = Object.keys(ideasData);
            const randomCategory = pickRandom(categories);
            const idea = pickRandom(ideasData[randomCategory]);

            if (idea) {
                return sendSafeMessage(
                    bot, chatId,
                    `\u{1F4A1} *Rastgele Icerik Fikri:*\n\n${idea}`,
                    true
                );
            }
            return sendSafeMessage(bot, chatId, '\u{274C} Fikir bulunamadi.');
        }

        case 'show_frameworks': {
            const buttons = [
                [{ text: '\u{1F3AC} Viral Hikaye', callback_data: 'fw_viral_story' }],
                [{ text: '\u{1F525} Unpopular Opinion', callback_data: 'fw_unpopular' }],
                [{ text: '\u{1F3AF} Problem-Cozum', callback_data: 'fw_problem_solution' }],
                [{ text: '\u{2753} Dikkat Cekici Soru', callback_data: 'fw_attention_question' }]
            ];

            return bot.sendMessage(chatId, '\u{1F3D7}\u{FE0F} *Viral Iskelet Secin:*', {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            });
        }

        case 'show_hooks':
            return bot.emit('text', {
                chat: { id: chatId },
                text: '/hooks',
                from: { id: chatId }
            });

        case 'quick_analyze':
            return sendSafeMessage(
                bot, chatId,
                '\u{1F50D} *Analiz kullanimi:*\n\nOrnek: `/analiz Yapay zeka dunyayi degistirecek`\n\nveya bir tweete yanitlayarak `/vibe` yaz.',
                true
            );

        case 'show_stats': {
            const statsData = state.getStats();
            const rank = state.getRank(statsData.total_xp || 0);

            const statsMsg = `\u{1F4CA} *Hizli Istatistikler*

\u{1F426} Tweet: ${statsData.session_tweets} | Thread: ${statsData.session_threads}
\u{1F4AC} Reply: ${statsData.session_replies} | Remix: ${statsData.session_remixes}
\u{1F3C6} Rutbe: ${rank}
\u{26A1} XP: ${statsData.total_xp || 0} | \u{1F525} Streak: ${statsData.current_streak || 0} Gun

\u{1F4CB} Detay icin: \`/stats\``;

            return sendSafeMessage(bot, chatId, statsMsg, true);
        }

        case 'show_credits':
            return bot.emit('text', {
                chat: { id: chatId },
                text: '/kredi',
                from: { id: chatId }
            });

        case 'show_rank':
            return bot.emit('text', {
                chat: { id: chatId },
                text: '/rutbe',
                from: { id: chatId }
            });

        case 'show_help':
            return bot.emit('text', {
                chat: { id: chatId },
                text: '/nasil',
                from: { id: chatId }
            });

        case 'show_settings': {
            const { targetTwitterUsername, currentFormat, currentPersona } = state.getState();

            const settingsMsg = `\u{2699}\u{FE0F} *Mevcut Ayarlar*

\u{1F464} *Profil:* @${targetTwitterUsername}
\u{1F3A8} *Format:* ${currentFormat}
\u{1F3AD} *Persona:* ${currentPersona}

\u{1F504} Degistirmek icin:
\`/setuser <kadi>\`
\`/setformat <tip>\`
\`/setpersona <tip>\``;

            return sendSafeMessage(bot, chatId, settingsMsg, true);
        }

        default:
            return null;
    }
}

// ---------------------------------------------------------------------------
// Hook callback handler (hook_*)
// ---------------------------------------------------------------------------
function handleHookCallback(bot, chatId, action) {
    const category = action.replace('hook_', '');
    const hooks = hooksData[category];

    if (!hooks || hooks.length === 0) {
        return sendSafeMessage(bot, chatId, '\u{274C} Bu kategoride hook bulunamadi.');
    }

    const hook = pickRandom(hooks);
    return sendSafeMessage(
        bot, chatId,
        `\u{1FA9D} *Viral Giris Cumlesi:*\n\n"${hook}"\n\n\u{1F4A1} Bunu tweet girisinde kullan!`,
        true
    );
}

// ---------------------------------------------------------------------------
// Idea callback handler (idea_*)
// ---------------------------------------------------------------------------
function handleIdeaCallback(bot, chatId, action) {
    const category = action.replace('idea_', '');
    const ideas = ideasData[category];

    if (!ideas || ideas.length === 0) {
        return sendSafeMessage(bot, chatId, '\u{274C} Bu kategoride fikir bulunamadi.');
    }

    const idea = pickRandom(ideas);
    return sendSafeMessage(
        bot, chatId,
        `\u{1F4A1} *Icerik Fikri:*\n\n${idea}`,
        true
    );
}

// ---------------------------------------------------------------------------
// Remix callback handler (remix_*)
// ---------------------------------------------------------------------------
async function handleRemixCallback(bot, chatId, action) {
    const persona = action.replace('remix_', '');
    const originalText = state.getRemixContext(chatId);

    if (!originalText) {
        return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} Remix icin metin bulunamadi. Lutfen `/remix` komutunu tekrar kullanin.', true);
    }

    const { targetTwitterUsername, currentFormat } = state.getState();
    sendSafeMessage(bot, chatId, `\u{231B} *${persona}* personasi ile yeniden yaziliyor...`, true);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: `Su tweeti yeniden yaz ve bana sadece tweeti ver: "${originalText}"`,
            format: currentFormat,
            persona: persona,
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0].text;
            const { goalCompleted, newStreak } = state.updateStats('session_remixes');
            const analysis = formatAnalysis(tweet);

            let result = `\u{1F504} *Remix Sonucu (${persona}):*\n\n${tweet}\n\n---${analysis}`;

            if (goalCompleted) {
                result += `\n\n\u{1F389} *Gunluk hedefe ulastin!*`;
            }
            if (newStreak > 1) {
                result += `\n\u{1F525} *Streak:* ${newStreak} gun!`;
            }

            sendSafeMessage(bot, chatId, result, true);
        } else {
            sendSafeMessage(bot, chatId, '\u{274C} Remix uretilemedi, lutfen tekrar deneyin.');
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(bot, chatId, `\u{274C} Remix hatasi: ${errorMsg}`);
    } finally {
        state.deleteRemixContext(chatId);
    }
}

// ---------------------------------------------------------------------------
// Cevap/Reply callback handler (cevap_*)
// ---------------------------------------------------------------------------
async function handleCevapCallback(bot, chatId, action) {
    const type = action.replace('cevap_', '');
    const originalText = state.getReplyContext(chatId);

    if (!originalText) {
        return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} Cevap icin metin bulunamadi. Lutfen `/cevap` komutunu tekrar kullanin.', true);
    }

    const promptInstruction = REPLY_PROMPTS[type];
    if (!promptInstruction) {
        return sendSafeMessage(bot, chatId, '\u{274C} Gecersiz cevap tipi.');
    }

    const { targetTwitterUsername, currentPersona } = state.getState();
    sendSafeMessage(bot, chatId, '\u{231B} Cevap uretiliyor...', false);

    try {
        const response = await xpatlaApi.post('/tweets/generate', {
            twitter_username: targetTwitterUsername,
            topic: `${promptInstruction}: "${originalText}"`,
            format: 'micro',
            persona: currentPersona,
            count: 1
        });

        if (response.data.success && response.data.data.tweets) {
            const tweet = response.data.data.tweets[0].text;
            const { goalCompleted, newStreak } = state.updateStats('session_replies');
            const analysis = formatAnalysis(tweet);

            let result = `\u{1F4AC} *Cevap (${type}):*\n\n${tweet}\n\n---${analysis}`;

            if (goalCompleted) {
                result += `\n\n\u{1F389} *Gunluk hedefe ulastin!*`;
            }
            if (newStreak > 1) {
                result += `\n\u{1F525} *Streak:* ${newStreak} gun!`;
            }

            sendSafeMessage(bot, chatId, result, true);
        } else {
            sendSafeMessage(bot, chatId, '\u{274C} Cevap uretilemedi, lutfen tekrar deneyin.');
        }
    } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        sendSafeMessage(bot, chatId, `\u{274C} Cevap hatasi: ${errorMsg}`);
    } finally {
        state.deleteReplyContext(chatId);
    }
}

// ---------------------------------------------------------------------------
// Framework callback handler (fw_*)
// ---------------------------------------------------------------------------
function handleFrameworkCallback(bot, chatId, action) {
    const type = action.replace('fw_', '');
    const framework = VIRAL_FRAMEWORKS[type];

    if (!framework) {
        return sendSafeMessage(bot, chatId, '\u{274C} Gecersiz framework tipi.');
    }

    state.setFrameworkContext(chatId, { type, waitTopic: true });

    return sendSafeMessage(
        bot, chatId,
        `\u{1F3D7}\u{FE0F} *${framework.name}* tasarimi secildi.\n\nLutfen tweetin konusunu veya ana fikrini yazin:`,
        true
    );
}

// ---------------------------------------------------------------------------
// Template/Sablon callback handler (sablon_*)
// ---------------------------------------------------------------------------
function handleSablonCallback(bot, chatId, action) {
    const category = action.replace('sablon_', '');
    const templates = templatesData[category];

    if (!templates || templates.length === 0) {
        return sendSafeMessage(bot, chatId, '\u{274C} Bu kategoride sablon bulunamadi.');
    }

    const template = pickRandom(templates);
    return sendSafeMessage(
        bot, chatId,
        `\u{1F4DD} *Sablon (${category}):*\n\n${template}\n\n\u{1F4A1} *[KONU]* kisimlarini kendi konunla degistir!`,
        true
    );
}

// ---------------------------------------------------------------------------
// A/B Test callback handler (ab_*)
// ---------------------------------------------------------------------------
function handleAbCallback(bot, chatId, action) {
    const selectedIndex = parseInt(action.replace('ab_', ''), 10);
    const versions = state.getAbContext(chatId);

    if (!versions || !versions[selectedIndex]) {
        return sendSafeMessage(bot, chatId, '\u{26A0}\u{FE0F} A/B test verisi bulunamadi. Lutfen `/ab` komutunu tekrar kullanin.', true);
    }

    const selectedTweet = versions[selectedIndex];
    const { goalCompleted, newStreak } = state.updateStats('session_tweets');
    const analysis = formatAnalysis(selectedTweet);

    let result = `\u{2705} *Secimin: Versiyon ${selectedIndex + 1}*\n\n${selectedTweet}\n\n---${analysis}`;

    if (goalCompleted) {
        result += `\n\n\u{1F389} *Gunluk hedefe ulastin!*`;
    }
    if (newStreak > 1) {
        result += `\n\u{1F525} *Streak:* ${newStreak} gun!`;
    }

    state.deleteAbContext(chatId);
    return sendSafeMessage(bot, chatId, result, true);
}

// ===========================================================================
// Main register function
// ===========================================================================

function register(bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const action = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;

        try {
            await bot.answerCallbackQuery(callbackQuery.id);

            // ----- Menu system callbacks -----
            const menuResult = handleMenuCallbacks(bot, chatId, action);
            if (menuResult !== null) return;

            // ----- Hook callbacks (hook_*) -----
            if (action.startsWith('hook_')) {
                return handleHookCallback(bot, chatId, action);
            }

            // ----- Idea callbacks (idea_*) -----
            if (action.startsWith('idea_')) {
                return handleIdeaCallback(bot, chatId, action);
            }

            // ----- Remix callbacks (remix_*) -----
            if (action.startsWith('remix_')) {
                return handleRemixCallback(bot, chatId, action);
            }

            // ----- Cevap/Reply callbacks (cevap_*) -----
            if (action.startsWith('cevap_')) {
                return handleCevapCallback(bot, chatId, action);
            }

            // ----- Framework callbacks (fw_*) -----
            if (action.startsWith('fw_')) {
                return handleFrameworkCallback(bot, chatId, action);
            }

            // ----- Template/Sablon callbacks (sablon_*) -----
            if (action.startsWith('sablon_')) {
                return handleSablonCallback(bot, chatId, action);
            }

            // ----- A/B Test callbacks (ab_*) -----
            if (action.startsWith('ab_')) {
                return handleAbCallback(bot, chatId, action);
            }

        } catch (err) {
            console.error('Callback query hatasi:', err);
            sendSafeMessage(bot, chatId, `\u{274C} Bir hata olustu: ${err.message}`);
        }
    });
}

module.exports = { register };
