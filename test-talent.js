const fs = require('fs');
const axios = require('axios');

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyLine = envFile.split('\n').find(l => l.startsWith('TALENT_API_KEY='));
const API_KEY = apiKeyLine ? apiKeyLine.split('=')[1].trim() : null;

if (!API_KEY) {
  console.log('NO API KEY');
  process.exit(1);
}

const client = axios.create({ baseURL: 'https://api.talentprotocol.com', headers: { 'X-API-KEY': API_KEY } });

async function test() {
  try {
    const { data } = await client.get('/search/advanced/profiles', {
      params: { per_page: 5 }
    });
    console.log('SUCCESS search/advanced/profiles (no sort):', data.profiles.length, 'profiles found');
    console.log('Images:', data.profiles.map(p => p.image_url));
    console.log('Usernames:', data.profiles.map(p => p.username));
    
    // Test socials for the first profile
    if (data.profiles.length > 0) {
      const { data: socialsData } = await client.get('/socials', { params: { id: data.profiles[0].id } });
      console.log('SOCIALS:', socialsData.socials.map(s => s.image_url));
    }
  } catch (err) {
    console.log('ERR search/advanced/profiles:', err.response?.data || err.message);
  }
}
test();
