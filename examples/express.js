/**
 * Express.js integration example for airlinestream-api-sdk.
 *
 * This creates a simple Express server that proxies airline logo requests
 * to the AirlineStream API. Your HTML templates use local <img> tags and
 * the SDK handles authentication server-side, keeping your API key secure.
 *
 * Usage:
 *   AIRLINESTREAM_API_KEY=sk_your_key node examples/express.js
 *   Open http://localhost:3000
 */

'use strict';

const express = require('express');
const airlinestream = require('airlinestream-api-sdk');

const app = express();

// Initialize the SDK with your API key
const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

// Mount the logo proxy middleware — all requests to /logos/* are forwarded
// to the AirlineStream API with your Bearer token attached server-side
app.use('/logos', logos.middleware());

// Serve a demo page with airline logos
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>AirlineStream SDK Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 20px; }
    .card { text-align: center; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .card img { width: 80px; height: 80px; object-fit: contain; }
    .card p { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Airline Logos</h1>
  <p>Served via the AirlineStream SDK middleware — images load from your own server.</p>
  <div class="grid">
    <div class="card">
      <img src="/logos/UA/s/200x200.png" alt="United Airlines">
      <p>United Airlines</p>
    </div>
    <div class="card">
      <img src="/logos/DL/s/200x200.png" alt="Delta Air Lines">
      <p>Delta</p>
    </div>
    <div class="card">
      <img src="/logos/AA/s/200x200.png" alt="American Airlines">
      <p>American</p>
    </div>
    <div class="card">
      <img src="/logos/EK/s/200x200.png" alt="Emirates">
      <p>Emirates</p>
    </div>
    <div class="card">
      <img src="/logos/BA/s/200x200.png" alt="British Airways">
      <p>British Airways</p>
    </div>
    <div class="card">
      <img src="/logos/LH/s/200x200.png" alt="Lufthansa">
      <p>Lufthansa</p>
    </div>
  </div>

  <h2 style="margin-top: 40px;">Rectangular Logos</h2>
  <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
    <div class="card">
      <img src="/logos/UA/r/250x80.png" alt="United Airlines" style="width: 160px; height: 50px;">
      <p>United Airlines</p>
    </div>
    <div class="card">
      <img src="/logos/DL/r/250x80.png" alt="Delta Air Lines" style="width: 160px; height: 50px;">
      <p>Delta</p>
    </div>
  </div>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
});
