/**
 * XPatla Bot - Ana Modül
 * Tüm modülleri bir araya getirir ve export eder
 * 
 * Kullanım:
 * const xpatla = require('./src');
 * veya
 * const { keyboards, services, middleware } = require('./src');
 */

const keyboards = require('./keyboards');
const services = require('./services');
const middleware = require('./middleware');

module.exports = {
    keyboards,
    services,
    middleware,
    // Sık kullanılanları direkt export et
    ...keyboards,
    ...services,
    ...middleware
};
