const { calculateViralScore, calculateHookScore } = require('./utils/scoring');
const fs = require('fs');
const text = fs.readFileSync('temp_text.txt', 'utf8');
console.log('Viral Score:', calculateViralScore(text));
console.log('Hook Score:', calculateHookScore(text));
