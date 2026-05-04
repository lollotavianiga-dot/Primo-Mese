import http from 'http';

const req = http.request(
  'http://localhost:3000/api/auth/register',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  (res) => {
    console.log('StatusCode:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Body:', data));
  }
);
req.write(JSON.stringify({
  email: 'newuser@test.com',
  password: 'password',
  firstName: 'Lorenzo',
  lastName: 'Egli',
  phoneNumber: '1234567890'
}));
req.on('error', console.error);
req.end();
