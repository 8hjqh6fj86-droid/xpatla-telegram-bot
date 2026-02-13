/**
 * XPatla Bot - Tweet History DAO
 * Uretilen tweetlerin gecmisi ve favoriler
 */

const { getDb } = require('../connection');

function addTweet(userId, { content, type = 'tweet', topic, persona, format, viralScore }) {
    const db = getDb();
    const result = db.prepare(`
        INSERT INTO tweet_history (user_id, content, type, topic, persona, format, viral_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, content, type, topic || null, persona || null, format || null, viralScore || null);
    return result.lastInsertRowid;
}

function getTweets(userId, limit = 10, offset = 0) {
    const db = getDb();
    return db.prepare(
        'SELECT * FROM tweet_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset);
}

function getFavorites(userId) {
    const db = getDb();
    return db.prepare(
        'SELECT * FROM tweet_history WHERE user_id = ? AND is_favorite = 1 ORDER BY created_at DESC'
    ).all(userId);
}

function toggleFavorite(userId, tweetId) {
    const db = getDb();
    const tweet = db.prepare(
        'SELECT id, is_favorite FROM tweet_history WHERE id = ? AND user_id = ?'
    ).get(tweetId, userId);
    if (!tweet) return null;

    const newVal = tweet.is_favorite ? 0 : 1;
    db.prepare('UPDATE tweet_history SET is_favorite = ? WHERE id = ?').run(newVal, tweetId);
    return { id: tweetId, is_favorite: newVal };
}

function searchTweets(userId, keyword) {
    const db = getDb();
    return db.prepare(
        'SELECT * FROM tweet_history WHERE user_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT 20'
    ).all(userId, `%${keyword}%`);
}

function deleteTweet(userId, tweetId) {
    const db = getDb();
    return db.prepare('DELETE FROM tweet_history WHERE id = ? AND user_id = ?').run(tweetId, userId);
}

function getCount(userId) {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM tweet_history WHERE user_id = ?').get(userId);
    return row.count;
}

function getById(tweetId) {
    const db = getDb();
    return db.prepare('SELECT * FROM tweet_history WHERE id = ?').get(tweetId);
}

module.exports = {
    addTweet,
    getTweets,
    getFavorites,
    toggleFavorite,
    searchTweets,
    deleteTweet,
    getCount,
    getById
};
