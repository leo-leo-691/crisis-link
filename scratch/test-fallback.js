const http = require('http');

const payload = JSON.stringify({
  type: 'medical',
  zone: 'Gym & Spa',
  description: 'Guest fell on the treadmill',
  reporter_name: 'Fallback Tester',
  reporter_type: 'guest'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/incidents',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const parsed = JSON.parse(data);
    console.log('Provider:', parsed.provider);
    console.log('Triage:', parsed.triage);
  });
});
req.on('error', console.error);
req.write(payload);
req.end();
