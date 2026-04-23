const http = require('http');

const payload = JSON.stringify({
  type: 'medical',
  zone: 'Lobby',
  description: 'Guest feeling dizzy near front desk',
  reporter_name: 'Test Runner',
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

async function sendRequest(i) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', e => reject(e));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Sending 3 rapid SOS requests...');
  const promises = [1, 2, 3].map(i => {
    const start = Date.now();
    return sendRequest(i).then(res => {
      const end = Date.now();
      console.log(`Request ${i} completed in ${end - start}ms - Status: ${res.status}`);
    });
  });
  
  await Promise.all(promises);
  console.log('Load test completed.');
}

run();
