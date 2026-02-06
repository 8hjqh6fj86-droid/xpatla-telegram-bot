/**
 * XPatla Bot - Services Index
 * Tüm servisleri tek yerden export et
 */

const viralScore = require('./viralScore');
const stats = require('./stats');

module.exports = {
    ...viralScore,
    ...stats
};
