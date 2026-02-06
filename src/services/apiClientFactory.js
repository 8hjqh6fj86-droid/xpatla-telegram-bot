/**
 * XPatla Bot - Per-User API Client Factory
 * Her kullanicinin kendi API key'i ile ayri axios instance'i
 */

const axios = require('axios');
const { xpatlaBaseUrl, TEST_MODE } = require('../config');

// API key bazli cache
const clientCache = new Map();

function getApiClient(apiKey) {
    if (!apiKey) return null;

    if (clientCache.has(apiKey)) {
        return clientCache.get(apiKey);
    }

    let client = axios.create({
        baseURL: xpatlaBaseUrl,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 60000
    });

    if (TEST_MODE) {
        client.post = async (url, data) => {
            console.log(`[DRY RUN] API POST: ${url}`, data);
            return {
                data: {
                    success: true,
                    data: {
                        tweets: [{ text: `[TEST] Simule tweet. Konu: ${data.topic || 'Genel'}` }],
                        credits_balance: 999
                    }
                }
            };
        };
        client.get = async (url) => {
            console.log(`[DRY RUN] API GET: ${url}`);
            if (url.includes('balance')) {
                return { data: { data: { credits_balance: 999, accounts: [{ twitter_username: 'test_user' }] } } };
            }
            return { data: { success: true, data: [] } };
        };
    }

    clientCache.set(apiKey, client);
    return client;
}

function invalidateClient(apiKey) {
    clientCache.delete(apiKey);
}

module.exports = { getApiClient, invalidateClient };
