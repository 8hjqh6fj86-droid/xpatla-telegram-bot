/**
 * XPatla Bot - Invite Code DAO
 * Davet kodu olusturma ve kullanma
 */

const crypto = require('crypto');
const { getDb } = require('../connection');

function generateCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function createInviteCode(createdBy) {
    const db = getDb();
    const code = generateCode();

    db.prepare(`
        INSERT INTO invite_codes (code, created_by)
        VALUES (?, ?)
    `).run(code, createdBy);

    return { code };
}

function useInviteCode(code, usedBy) {
    const db = getDb();
    const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(code);

    if (!invite) {
        return { valid: false, reason: 'Kod bulunamadi' };
    }

    if (invite.used_by) {
        return { valid: false, reason: 'Bu kod zaten kullanilmis' };
    }

    db.prepare(`
        UPDATE invite_codes SET used_by = ?, used_at = datetime('now')
        WHERE code = ?
    `).run(usedBy, code);

    return { valid: true, invitedBy: invite.created_by };
}

function getInvitesByUser(createdBy) {
    const db = getDb();
    return db.prepare('SELECT * FROM invite_codes WHERE created_by = ? ORDER BY created_at DESC').all(createdBy);
}

function isValidCode(code) {
    const db = getDb();
    const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ? AND used_by IS NULL').get(code);
    return !!invite;
}

module.exports = {
    createInviteCode,
    useInviteCode,
    getInvitesByUser,
    isValidCode
};
