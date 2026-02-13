/**
 * Centralized Logger
 * console.log'u yakalar, buffer'da tutar, SSE client'lara yayinlar
 */

const MAX_BUFFER = 500;
const logBuffer = [];
const sseClients = new Set();

function addLog(level, message) {
    const entry = {
        time: new Date().toISOString(),
        level,
        message
    };
    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER) logBuffer.shift();

    // SSE client'lara yayinla
    const data = JSON.stringify(entry);
    for (const client of sseClients) {
        client.write(`data: ${data}\n\n`);
    }
}

function getBuffer() {
    return [...logBuffer];
}

function addClient(res) {
    sseClients.add(res);
    res.on('close', () => sseClients.delete(res));
}

// Orijinal console metodlarini sakla ve override et
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

function install() {
    console.log = (...args) => {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        originalLog(...args);
        addLog('info', msg);
    };
    console.error = (...args) => {
        const msg = args.map(a => typeof a === 'string' ? a : (a instanceof Error ? a.message : JSON.stringify(a))).join(' ');
        originalError(...args);
        addLog('error', msg);
    };
}

module.exports = { install, getBuffer, addClient };
