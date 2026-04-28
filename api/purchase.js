const https = require("https");

function post(host, path, headers, body) {
  return new Promise(function(resolve, reject) {
    const req = https.request({ hostname: host, path: path, method: "POST", headers: headers }, function(resp) {
      let data = "";
      resp.on("data", function(c) { data += c; });
      resp.on("end", function() { resolve(JSON.parse(data)); });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentMethodId, email, name, amount } = req.body;
  if (!paymentMethodId || !email || !name || !amount) return res.status(400).json({ error: "Missing fields" });

  try {
    const key = process.env.STRIPE_SECRET_KEY;
    const auth = Buffer.from(key + ":").toString("base64");
    const params = new URLSearchParams({ amount: amount, currency: "usd", payment_method: paymentMethodId, confirm: "true", return_url: "https://eightfivecollective.com/success", receipt_email: email }).toString();
    const body = Buffer.from(params);

    const intent = await post("api.stripe.com", "/v1/payment_intents", {
      "Authorization": "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": body.length
    }, params​​​​​​​​​​​​​​​​
