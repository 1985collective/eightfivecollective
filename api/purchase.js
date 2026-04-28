const stripe = require(‘stripe’)(process.env.STRIPE_SECRET_KEY);
const { createClient } = require(’@supabase/supabase-js’);

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘https://eightfivecollective.com’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const { paymentMethodId, email, name, amount } = req.body;

if (!paymentMethodId || !email || !name || !amount) {
return res.status(400).json({ error: ‘Missing required fields’ });
}

try {
// Create and confirm payment intent
const paymentIntent = await stripe.paymentIntents.create({
amount: amount,
currency: ‘usd’,
payment_method: paymentMethodId,
confirm: true,
return_url: ‘https://eightfivecollective.com/success’,
receipt_email: email,
description: ‘Eight Five Collective — Wedding Toolkit’,
metadata: { customer_name: name, customer_email: email }
});

```
if (paymentIntent.status !== 'succeeded') {
  return res.status(400).json({ error: 'Payment failed. Please try again.' });
}

// Generate unique access token
const accessToken = generateToken();

// Save to Supabase
const { error: dbError } = await supabase
  .from('purchases')
  .insert({
    email: email,
    name: name,
    stripe_payment_id: paymentIntent.id,
    access_token: accessToken,
    created_at: new Date().toISOString()
  });

if (dbError) {
  console.error('Supabase error:', dbError);
}

// Send access email via Supabase
await sendAccessEmail(email, name, accessToken);

return res.status(200).json({
  success: true,
  message: 'Payment successful! Check your email for access.'
});
```

} catch (err) {
console.error(‘Purchase error:’, err);

```
if (err.type === 'StripeCardError') {
  return res.status(400).json({ error: err.message });
}

return res.status(500).json({ error: 'Something went wrong. Please try again.' });
```

}
};

function generateToken() {
const chars = ‘ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789’;
let token = ‘’;
for (let i = 0; i < 32; i++) {
token += chars.charAt(Math.floor(Math.random() * chars.length));
}
return token;
}

async function sendAccessEmail(email, name, token) {
const accessUrl = `https://eightfivecollective.com/access?token=${token}`;

await supabase.functions.invoke(‘send-email’, {
body: {
to: email,
subject: ‘Your Eight Five Collective Wedding Toolkit is ready’,
html: `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; color: #1a1814;"> <div style="text-align: center; margin-bottom: 40px;"> <p style="font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #9a7d4a; margin-bottom: 8px;">Eight Five Collective</p> <h1 style="font-weight: 300; font-size: 32px; margin: 0; line-height: 1.2;">You're in, ${name.split(' ')[0]}.</h1> </div> <p style="font-size: 14px; line-height: 1.9; color: #4a4540; margin-bottom: 32px;"> Thank you for your purchase. Your Wedding Photographer Toolkit is ready and waiting for you. Click the button below to access it instantly. </p> <div style="text-align: center; margin-bottom: 40px;"> <a href="${accessUrl}" style="display: inline-block; background: #1a1814; color: #f8f5f0; text-decoration: none; padding: 16px 40px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-family: sans-serif;"> Access Your Toolkit </a> </div> <p style="font-size: 12px; color: #8a857d; line-height: 1.8;"> Or copy this link: <a href="${accessUrl}" style="color: #9a7d4a;">${accessUrl}</a> </p> <hr style="border: none; border-top: 1px solid #ede8e0; margin: 40px 0;"> <p style="font-size: 11px; color: #8a857d; line-height: 1.8; text-align: center;"> Questions? Reply to this email or reach us at hello@eightfivecollective.com </p> </div>`
}
});
}
