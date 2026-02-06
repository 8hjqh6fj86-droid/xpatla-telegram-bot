/**
 * XPatla Bot - JSON -> SQLite Migration Script
 * Mevcut data/*.json dosyalarini admin kullaniciya migrate eder.
 *
 * Kullanim: node scripts/migrate-json-to-sqlite.js
 * Onkoşul: .env'de ADMIN_USER_ID ve XPATLA_API_KEY tanimli olmali
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('../src/db');
const userDao = require('../src/db/dao/userDao');

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
    ? parseInt(process.env.ADMIN_USER_ID, 10)
    : null;

const XPATLA_API_KEY = process.env.XPATLA_API_KEY || null;

function loadJSON(filePath, fallback) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (_err) {
        return fallback;
    }
}

function migrate() {
    if (!ADMIN_USER_ID) {
        console.error('HATA: .env dosyasinda ADMIN_USER_ID tanimlanmamis.');
        process.exit(1);
    }

    console.log(`Migration basliyor... Admin ID: ${ADMIN_USER_ID}`);

    const db = getDb();
    const dataDir = path.join(__dirname, '..', 'data');

    // 1. Admin kullanici olustur (yoksa)
    let admin = userDao.findByTelegramId(ADMIN_USER_ID);
    if (!admin) {
        admin = userDao.createUser({
            telegramId: ADMIN_USER_ID,
            username: 'hrrcnes',
            firstName: 'Admin'
        });
        userDao.setAdmin(ADMIN_USER_ID);
        console.log('Admin kullanici olusturuldu.');
    } else {
        console.log('Admin kullanici zaten mevcut.');
    }

    // API key varsa kaydet
    if (XPATLA_API_KEY && !admin.xpatla_api_key) {
        userDao.setApiKey(ADMIN_USER_ID, XPATLA_API_KEY);
        console.log('API key kaydedildi.');
    }

    // Twitter username ayarla
    userDao.updateUser(ADMIN_USER_ID, { twitter_username: 'hrrcnes' });

    // 2. Stats migrate
    const statsData = loadJSON(path.join(dataDir, 'stats.json'), {});
    if (Object.keys(statsData).length > 0) {
        db.prepare(`
            UPDATE stats SET
                session_tweets = ?, session_threads = ?, session_replies = ?, session_remixes = ?,
                total_xp = ?, current_streak = ?, last_streak_date = ?,
                daily_goal = ?, daily_progress = ?, last_goal_date = ?, last_activity = ?
            WHERE user_id = ?
        `).run(
            statsData.session_tweets || 0,
            statsData.session_threads || 0,
            statsData.session_replies || 0,
            statsData.session_remixes || 0,
            statsData.total_xp || 0,
            statsData.current_streak || 0,
            statsData.last_streak_date || null,
            statsData.daily_goal || 0,
            statsData.daily_progress || 0,
            statsData.last_goal_date || null,
            statsData.last_activity || null,
            ADMIN_USER_ID
        );
        console.log(`Stats migrate edildi: ${statsData.total_xp || 0} XP`);
    }

    // 3. Drafts migrate
    const drafts = loadJSON(path.join(dataDir, 'drafts.json'), []);
    if (drafts.length > 0) {
        const insertDraft = db.prepare('INSERT INTO drafts (user_id, content, created_at) VALUES (?, ?, ?)');
        for (const d of drafts) {
            insertDraft.run(ADMIN_USER_ID, d.content, d.created_at || new Date().toISOString());
        }
        console.log(`${drafts.length} taslak migrate edildi.`);
    }

    // 4. Snippets migrate
    const snippets = loadJSON(path.join(dataDir, 'snippets.json'), {});
    const snippetEntries = Object.entries(snippets);
    if (snippetEntries.length > 0) {
        const insertSnippet = db.prepare('INSERT OR REPLACE INTO snippets (user_id, key, value) VALUES (?, ?, ?)');
        for (const [key, value] of snippetEntries) {
            insertSnippet.run(ADMIN_USER_ID, key, value);
        }
        console.log(`${snippetEntries.length} snippet migrate edildi.`);
    }

    // 5. Watchdog migrate
    const watchdog = loadJSON(path.join(dataDir, 'watchdog.json'), {});
    const watchdogEntries = Object.entries(watchdog);
    if (watchdogEntries.length > 0) {
        const insertWatchdog = db.prepare('INSERT OR REPLACE INTO watchdog (user_id, target_username, added_at) VALUES (?, ?, ?)');
        for (const [username, data] of watchdogEntries) {
            insertWatchdog.run(ADMIN_USER_ID, username, data.added_at || new Date().toISOString());
        }
        console.log(`${watchdogEntries.length} watchdog kaydi migrate edildi.`);
    }

    // 6. Schedules migrate
    const schedules = loadJSON(path.join(dataDir, 'schedules.json'), []);
    if (schedules.length > 0) {
        const insertSchedule = db.prepare(
            'INSERT INTO schedules (user_id, chat_id, content, time, notified) VALUES (?, ?, ?, ?, ?)'
        );
        for (const s of schedules) {
            insertSchedule.run(ADMIN_USER_ID, s.chatId || ADMIN_USER_ID, s.content, s.time, s.notified ? 1 : 0);
        }
        console.log(`${schedules.length} zamanlanmis tweet migrate edildi.`);
    }

    closeDb();
    console.log('\nMigration tamamlandi!');
}

migrate();
