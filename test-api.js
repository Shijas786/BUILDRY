require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const API_KEY = process.env.TALENT_API_KEY;
const client = axios.create({ baseURL: 'https://api.talentprotocol.com', headers: { 'X-API-KEY': API_KEY } });

client.get('/search/advanced/profiles', {
  params: {
    per_page: 5,
    sort: JSON.stringify({ score: { order: 'desc', scorer: 'builder_score' } })
  }
}).then(res => console.log('builder_score OK', res.data.profiles.length)).catch(err => {
  console.log('builder_score err:', err.response?.data || err.message);
});

client.get('/search/advanced/profiles', {
  params: {
    per_page: 5,
    sort: JSON.stringify({ score: { order: 'desc', scorer: 'Builder Score' } })
  }
}).then(res => console.log('Builder Score OK', res.data.profiles.length)).catch(err => {
  console.log('Builder Score err:', err.response?.data || err.message);
});
