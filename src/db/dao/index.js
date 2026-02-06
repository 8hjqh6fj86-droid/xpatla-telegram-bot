const userDao = require('./userDao');
const inviteDao = require('./inviteDao');
const draftsDao = require('./draftsDao');
const snippetsDao = require('./snippetsDao');
const watchdogDao = require('./watchdogDao');
const schedulesDao = require('./schedulesDao');
const statsDao = require('./statsDao');
const rateLimitDao = require('./rateLimitDao');

module.exports = {
    userDao,
    inviteDao,
    draftsDao,
    snippetsDao,
    watchdogDao,
    schedulesDao,
    statsDao,
    rateLimitDao
};
