import http from 'http';

const req = http.request(
  'http://localhost:3000/api/auth/anonymous',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  },
  (res) => {
    console.log('StatusCode:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Body:', data));
  }
);
req.write(JSON.stringify({ email: `anon_${Date.now()}@test.com`, password: 'test', username: 'anon1' }));
req.end();
