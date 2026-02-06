/**
 * Thread Command
 * /thread <topic>
 */

const state = require('../state');
const xpatlaApi = require('../services/xpatlaApi');
const { sendSafeMessage } = require('../utils/helpers');

function register(bot) {
    bot.onText(/\/thread (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const topic = match[1];
        const { targetTwitterUsername, currentPersona } = state.getState();

        sendSafeMessage(bot, chatId, `\u{231B} *@${targetTwitterUsername}* stiliyle thread hazirlaniyor...`, true);

        try {
            const response = await xpatlaApi.post('/tweets/generate', {
                twitter_username: targetTwitterUsername,
                topic: topic,
                format: 'thread',
                persona: currentPersona
            });

            if (response.data.success && response.data.data.tweets) {
                const tweets = response.data.data.tweets;
                state.updateStats('session_threads');

                let threadText = `\u{1F9F5} *Hazirlanan Thread*\n\n`;
                tweets.forEach((t, i) => {
                    threadText += `${i + 1}/${tweets.length}\n${t.text}\n\n`;
                });

                sendSafeMessage(bot, chatId, threadText, true);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            sendSafeMessage(bot, chatId, `\u{274C} *Hata:* ${errorMsg}`);
        }
    });
}

module.exports = { register };
