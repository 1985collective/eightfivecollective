const https = require(‘https’);

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const { paymentMethodId, email, name, amount } = req.body;

if (!paymentMethodId || !email || !name || !amount) {
return res.status(400).json({ error: ‘Missing required fields’ });
}

try {
// Create payment intent via Stripe REST API
const paymentIntent = await stripeRequest(‘POST’, ‘/v1/payment_intents’, {
amount: amount,
currency: ‘usd’,
payment_method: paymentMethodId,
confirm: ‘true’,
return_url: ‘https://eightfivecollective.com/success’,
receipt_email: email,
description: ‘Eight Five Collective — Wedding Toolkit’,
‘metadata[customer_name]’: name,
‘metadata[customer_email]’: email
}, process.env.STRIPE_SECRET_KEY);

```
if (paymentIntent.error) {
  return res.status(400).json({ error: paymentIntent.error.message });
}

if (paymentIntent.status !== 'succeeded') {
  return res.status(400).json({ error: 'Payment did not complete. Please try again.' });
}

// Generate access token
const accessToken = generateToken();

// Save to Supabase
await supabaseInsert({
  email: email,
  name: name,
  stripe_payment_id: paymentIntent.id,
  access_token: accessToken,
  created_at: new Date().toISOString()
});

return res.status(200).json({ success: true });
```

} catch (err) {
console.error(‘Purchase error:’, err.message);
return res.status(500).json({ error: ‘Something went wrong. Please try again.’ });
}
};

function stripeRequest(method, path, params, secretKey) {
return new Promise((resolve, reject) => {
const body = new URLSearchParams(params).toString();
const auth = Buffer.from(secretKey + ‘:’).toString(‘base64’);

```
const options = {
  hostname: 'api.stripe.com',
  path: path,
  method: method,
  headers: {
    'Authorization': 'Basic ' + auth,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (resp) => {
  let data = '';
  resp.on('data', (chunk) => data += chunk);
  resp.on('end', () => {
    try { resolve(JSON.parse(data)); }
    catch (e) { reject(new Error('Invalid Stripe response')); }
  });
});

req.on('error', reject);
req.write(body);
req.end();
```

});
}

function supabaseInsert(data) {
return new Promise((resolve, reject) => {
const body = JSON.stringify(data);
const url = new URL(process.env.SUPABASE_URL);

```
const options = {
  hostname: url.hostname,
  path: '/rest/v1/purchases',
  method: 'POST',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Prefer': 'return=minimal'
  }
};

const req = https.request(options, (resp) => {
  let data = '';
  resp.on('data', (chunk) => data += chunk);
  resp.on('end', () => resolve(data));
});

req.on('error', reject);
req.write(body);
req.end();
```

});
}

function generateToken() {
const chars = ‘ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789’;
let token = ‘’;
for (let i = 0; i < 32; i++) {
token += chars.charAt(Math.floor(Math.random() * chars.length));
}
return token;
}
