/**
 * XPatla Bot - Middleware Index
 * Tüm middleware'leri tek yerden export et
 */

const errorHandler = require('./errorHandler');
const rateLimiter = require('./rateLimiter');

module.exports = {
    ...errorHandler,
    ...rateLimiter
};
