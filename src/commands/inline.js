/**
 * Inline Mode Handler
 * @botismi kelime yazinca favori/gecmis tweet'lerden arama
 */

const { requireAuth } = require('../middleware/auth');
const historyDao = require('../db/dao/historyDao');

/**
 * Inline query handler'i bot'a baglar
 */
function register(bot) {
    bot.on('inline_query', async (query) => {
        const userId = query.from.id;
        const searchText = (query.query || '').trim();

        // Auth check - inline'da unauthorized kullaniciya sessizce bos donus
        const auth = requireAuth(userId);
        if (!auth.authorized) {
            return bot.answerInlineQuery(query.id, []);
        }

        try {
            let tweets;

            if (searchText.length > 0) {
                // Arama yapildi
                tweets = historyDao.searchTweets(userId, searchText);
            } else {
                // Bos query - son favori tweetleri goster
                tweets = historyDao.getFavorites(userId);
                if (tweets.length === 0) {
                    tweets = historyDao.getTweets(userId, 10, 0);
                }
            }

            // Telegram inline query max 50 sonuc
            const results = tweets.slice(0, 50).map((t, i) => {
                const title = t.type === 'thread' ? 'Thread' : t.type === 'remix' ? 'Remix' : t.type === 'reply' ? 'Reply' : 'Tweet';
                const fav = t.is_favorite ? ' [FAV]' : '';
                const description = t.content && t.content.length > 100
                    ? t.content.slice(0, 100) + '...'
                    : (t.content || '');

                return {
                    type: 'article',
                    id: String(t.id || i),
                    title: `${title}${fav}`,
                    description,
                    input_message_content: {
                        message_text: t.content || '',
                        parse_mode: 'Markdown'
                    }
                };
            });

            await bot.answerInlineQuery(query.id, results, {
                cache_time: 10,
                is_personal: true
            });
        } catch (err) {
            console.error('Inline query hatasi:', err.message);
            await bot.answerInlineQuery(query.id, []);
        }
    });
}

module.exports = { register };
