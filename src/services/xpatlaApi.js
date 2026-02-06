const axios = require('axios');
const { xpatlaApiKey, xpatlaBaseUrl, TEST_MODE } = require('../config');

let xpatlaApi = axios.create({
    baseURL: xpatlaBaseUrl,
    headers: {
        'Authorization': `Bearer ${xpatlaApiKey}`,
        'Content-Type': 'application/json'
    },
    timeout: 60000
});

// TEST_MODE MOCKING (Kredi yakmamak için)
if (TEST_MODE) {
    console.log('🧪 TEST_MODE AKTİF: API çağrıları simüle edilecek, kredi harcanmayacak.');
    xpatlaApi.post = async (url, data) => {
        console.log(`[DRY RUN] API POST: ${url}`, data);
        return {
            data: {
                success: true,
                data: {
                    tweets: [{ text: `[TEST ÇIKTISI] Bu bir simülasyon tweetidir. Konu: ${data.topic || 'Genel'}` }],
                    credits_balance: 999
                }
            }
        };
    };
    xpatlaApi.get = async (url) => {
        console.log(`[DRY RUN] API GET: ${url}`);
        if (url.includes('balance')) {
            return { data: { data: { credits_balance: 999, accounts: [{ twitter_username: 'test_user' }] } } };
        }
        return { data: { success: true, data: [] } };
    };
}

module.exports = xpatlaApi;
