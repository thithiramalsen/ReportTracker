// Simple smoke test: pings /api/health
const axios = require('axios');

const PORT = process.env.PORT || 5000;
const base = `http://localhost:${PORT}/api`;

async function main() {
  try {
    const res = await axios.get(`${base}/health`);
    console.log('Health:', res.data);
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err.message);
    if (err.response) console.error('Status:', err.response.status, err.response.data);
    process.exit(2);
  }
}

main();
