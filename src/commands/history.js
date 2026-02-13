/**
 * History Commands
 * /gecmis, /favoriler, /ara
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');
const historyDao = require('../db/dao/historyDao');

const PAGE_SIZE = 5;

/**
 * Tweet'i kisa ozet olarak formatlar (ilk 80 karakter)
 */
function truncate(text, maxLen = 80) {
    if (!text || text.length <= maxLen) return text || '';
    return text.slice(0, maxLen) + '...';
}

/**
 * Tweet listesini formatlayip mesaj + keyboard olusturur
 */
function formatTweetList(tweets, title, page, totalCount, callbackPrefix) {
    if (tweets.length === 0) {
        return { text: `${title}\n\nHenuz kayit yok.`, keyboard: null };
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const lines = tweets.map((t, i) => {
        const num = page * PAGE_SIZE + i + 1;
        const fav = t.is_favorite ? ' [FAV]' : '';
        const typeLabel = t.type === 'thread' ? 'Thread' : t.type === 'remix' ? 'Remix' : t.type === 'reply' ? 'Reply' : 'Tweet';
        return `*${num}.* [${typeLabel}]${fav}\n${truncate(t.content)}`;
    });

    const text = `${title}\n\nSayfa ${page + 1}/${totalPages}\n\n${lines.join('\n\n')}`;

    const navButtons = [];
    if (page > 0) {
        navButtons.push({ text: 'Onceki', callback_data: `${callbackPrefix}_${page - 1}` });
    }
    if (page < totalPages - 1) {
        navButtons.push({ text: 'Sonraki', callback_data: `${callbackPrefix}_${page + 1}` });
    }

    const tweetButtons = tweets.map(t => ([
        { text: `${t.is_favorite ? 'Favoriden Cikar' : 'Favori'}`, callback_data: `fav_${t.id}` },
        { text: 'Kopyala', callback_data: `copy_${t.id}` }
    ]));

    const keyboard = {
        inline_keyboard: [
            ...tweetButtons,
            ...(navButtons.length > 0 ? [navButtons] : [])
        ]
    };

    return { text, keyboard };
}

function register(bot) {
    // /gecmis [sayfa] - Son tweetleri listele
    bot.onText(/\/gecmis(?: (\d+))?/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const page = match[1] ? Math.max(0, parseInt(match[1], 10) - 1) : 0;
        const offset = page * PAGE_SIZE;
        const tweets = state.getTweetHistory(userId, PAGE_SIZE, offset);
        const totalCount = historyDao.getCount(userId);

        const { text, keyboard } = formatTweetList(tweets, 'Tweet Gecmisin', page, totalCount, 'histpage');

        sendSafeMessage(bot, msg.chat.id, text, true, keyboard ? { reply_markup: keyboard } : {});
    });

    // /favoriler - Favori tweetleri listele
    bot.onText(/\/favoriler/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const favorites = state.getFavorites(userId);

        if (favorites.length === 0) {
            return sendSafeMessage(bot, msg.chat.id, 'Henuz favori tweetin yok.\n\nTweet uretildikten sonra Favori butonuna tiklayarak ekleyebilirsin.');
        }

        const lines = favorites.map((t, i) => {
            const typeLabel = t.type === 'thread' ? 'Thread' : t.type === 'remix' ? 'Remix' : t.type === 'reply' ? 'Reply' : 'Tweet';
            return `*${i + 1}.* [${typeLabel}]\n${truncate(t.content)}`;
        });

        const tweetButtons = favorites.map(t => ([
            { text: 'Favoriden Cikar', callback_data: `fav_${t.id}` },
            { text: 'Kopyala', callback_data: `copy_${t.id}` }
        ]));

        sendSafeMessage(bot, msg.chat.id, `Favori Tweetlerin\n\n${lines.join('\n\n')}`, true, {
            reply_markup: { inline_keyboard: tweetButtons }
        });
    });

    // /ara <kelime> - Tweet ara
    bot.onText(/\/ara (.+)/, (msg, match) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const keyword = match[1].trim();
        const results = state.searchTweets(userId, keyword);

        if (results.length === 0) {
            return sendSafeMessage(bot, msg.chat.id, `"${keyword}" icin sonuc bulunamadi.`);
        }

        const lines = results.map((t, i) => {
            const typeLabel = t.type === 'thread' ? 'Thread' : t.type === 'remix' ? 'Remix' : t.type === 'reply' ? 'Reply' : 'Tweet';
            const fav = t.is_favorite ? ' [FAV]' : '';
            return `*${i + 1}.* [${typeLabel}]${fav}\n${truncate(t.content)}`;
        });

        const tweetButtons = results.map(t => ([
            { text: `${t.is_favorite ? 'Favoriden Cikar' : 'Favori'}`, callback_data: `fav_${t.id}` },
            { text: 'Kopyala', callback_data: `copy_${t.id}` }
        ]));

        sendSafeMessage(bot, msg.chat.id, `"${keyword}" Arama Sonuclari (${results.length})\n\n${lines.join('\n\n')}`, true, {
            reply_markup: { inline_keyboard: tweetButtons }
        });
    });
}

module.exports = { register };
