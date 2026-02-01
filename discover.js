const axios = require('axios');

const xpatlaApiKey = 'xp_live_jjzGbNY3FjQL5MULgg_m1RnhdpeM2UTI';
const xpatlaBaseUrl = 'https://xpatla.com/api/v1';

async function discover() {
    const checkList = [
        { method: 'GET', path: '/credits' },
        { method: 'GET', path: '/user/credits' },
        { method: 'GET', path: '/balance' },
        { method: 'GET', path: '/user/balance' },
        { method: 'POST', path: '/tweet', data: { topic: 'test' } },
        { method: 'POST', path: '/tweet/create', data: { topic: 'test' } },
        { method: 'POST', path: '/generate/tweet', data: { topic: 'test' } },
        { method: 'POST', path: '/generate-tweet', data: { topic: 'test' } },
        { method: 'POST', path: '/generate', data: { topic: 'test' } },
    ];

    for (const item of checkList) {
        try {
            console.log(`Trying ${item.method} ${item.path}...`);
            const config = {
                headers: { 'Authorization': `Bearer ${xpatlaApiKey}` }
            };
            const res = (item.method === 'GET'
                ? await axios.get(`${xpatlaBaseUrl}${item.path}`, config)
                : await axios.post(`${xpatlaBaseUrl}${item.path}`, item.data, config)
            );
            console.log(`SUCCESS ${item.path}:`, res.data);
            return;
        } catch (e) {
            // console.log(`FAILED ${item.path}: ${e.response?.status || e.message}`);
        }
    }
    console.log('Discovery failed.');
}

discover();
