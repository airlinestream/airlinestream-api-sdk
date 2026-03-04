# AirlineStream API SDK

[![npm version](https://img.shields.io/npm/v/airlinestream-api-sdk.svg)](https://www.npmjs.com/package/airlinestream-api-sdk)
[![license](https://img.shields.io/npm/l/airlinestream-api-sdk.svg)](https://github.com/airlinestream/airlinestream-api-sdk/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/airlinestream-api-sdk.svg)](https://nodejs.org)

**Official Node.js SDK for the [AirlineStream](https://airlinestream.dev) Airline Logo API.**

Serve high-quality airline logos on your website, booking platform, or travel app — without exposing your API key to the browser. The SDK acts as a server-side proxy: your HTML templates reference your own `/logos/UA/s/200x200.png` path and the SDK fetches the image from AirlineStream with proper authentication behind the scenes.

No extra server. No extra port. No exposed secrets. Just one middleware call.

---

## What is AirlineStream?

[AirlineStream](https://airlinestream.dev) is a fast, reliable API that delivers airline logos on-demand for travel platforms, booking engines, flight trackers, airports, and travel agencies. It covers hundreds of airlines worldwide with daily database updates, supporting square and rectangular logos in PNG, JPG, GIF, and SVG formats.

- **Website:** [airlinestream.dev](https://airlinestream.dev)
- **API Docs:** [airlinestream.dev/docs](https://airlinestream.dev/docs)
- **Pricing:** [airlinestream.dev/pricing](https://airlinestream.dev/pricing)
- **Get a Free API Key:** [airlinestream.dev/pricing](https://airlinestream.dev/pricing)

---

## Quick Start

```bash
npm install airlinestream-api-sdk
```

```js
const express = require('express');
const airlinestream = require('airlinestream-api-sdk');

const app = express();

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

// Mount the logo proxy — that's it
app.use('/logos', logos.middleware());

app.listen(3000);
```

Now use standard `<img>` tags in your HTML:

```html
<img src="/logos/UA/s/200x200.png" alt="United Airlines logo">
<img src="/logos/EK/r/350x100.png" alt="Emirates logo">
<img src="/logos/LH/s/64x64.png"  alt="Lufthansa logo">
```

The SDK forwards each request to the AirlineStream API with your `Authorization: Bearer` header attached server-side. The browser never sees your API key.

---

## Why Use This SDK?

| | |
|---|---|
| **Secure** | API key stays on your server — never exposed in HTML source or browser network tab |
| **Simple** | One `app.use()` call. Use `<img>` tags like normal. No client-side JavaScript needed |
| **Zero Dependencies** | Uses Node.js built-in `fetch` (Node 18+). Nothing extra to install or audit |
| **Framework Agnostic** | Works with Express, Connect, Fastify, Next.js, and any `(req, res)` compatible server |
| **Always Fresh** | Every request fetches live from the AirlineStream API — logos reflect the latest airline branding |

---

## Installation

```bash
npm install airlinestream-api-sdk
```

Requires **Node.js 18** or later (for built-in `fetch`).

---

## Usage

### Express / Connect Middleware

The recommended approach. Mount the middleware on a route prefix and use `<img>` tags in your templates:

```js
const express = require('express');
const airlinestream = require('airlinestream-api-sdk');

const app = express();

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

app.use('/logos', logos.middleware());

// In your EJS/Pug/Handlebars templates:
// <img src="/logos/UA/s/200x200.png" alt="United Airlines">
// <img src="/logos/DL/r/350x100.png" alt="Delta Air Lines">
```

### Next.js API Route

Create `pages/api/logos/[...path].js`:

```js
const airlinestream = require('airlinestream-api-sdk');

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

export default async function handler(req, res) {
  const [code, type, sizeFormat] = req.query.path;
  const dotIdx = sizeFormat.lastIndexOf('.');
  const [w, h] = sizeFormat.substring(0, dotIdx).split('x').map(Number);
  const format = sizeFormat.substring(dotIdx + 1);

  try {
    const { buffer, contentType } = await logos.logo(code, {
      type, width: w, height: h, format,
      theme: req.query.theme || undefined,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buffer);
  } catch (err) {
    res.status(err.statusCode || 502).end(err.message);
  }
}
```

Then in your components: `<img src="/api/logos/UA/s/200x200.png" />`

### Programmatic (PDFs, Emails, Image Processing)

Fetch logo buffers directly for use in PDF generation, email templates, or image pipelines:

```js
const airlinestream = require('airlinestream-api-sdk');
const fs = require('fs');

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

const { buffer, contentType } = await logos.logo('UA', {
  type: 's',
  width: 200,
  height: 200,
  format: 'png',
});

// Use in a PDF
// pdfDoc.image(buffer, 50, 50, { width: 100 });

// Or save to disk
fs.writeFileSync('ua-logo.png', buffer);
```

### Dark Theme

Request dark-background logos (available on Professional and Enterprise plans):

```html
<img src="/logos/EK/s/200x200.png?theme=dark" alt="Emirates dark logo">
```

```js
const { buffer } = await logos.logo('EK', {
  type: 's', width: 200, height: 200, format: 'png', theme: 'dark',
});
```

---

## API Reference

### `airlinestream(options)`

Creates an SDK instance.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | — | Your AirlineStream API key (starts with `sk_`) |
| `baseUrl` | `string` | No | `https://airlinestream.dev/api/v1` | Override the API base URL |

Returns an object with `logo()` and `middleware()` methods.

### `logos.logo(code, options)`

Fetch an airline logo as a Buffer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | `string` | Yes | IATA (2-letter) or ICAO (3-letter) airline code |
| `options.type` | `string` | Yes | `'s'` (square) or `'r'` (rectangular) |
| `options.width` | `number` | Yes | Width in pixels |
| `options.height` | `number` | Yes | Height in pixels |
| `options.format` | `string` | Yes | `'png'`, `'jpg'`, `'gif'`, or `'svg'` |
| `options.theme` | `string` | No | `'light'` (default) or `'dark'` |

Returns `Promise<{ buffer: Buffer, contentType: string }>`.

### `logos.middleware()`

Creates an Express/Connect-compatible `(req, res, next)` middleware that proxies logo requests.

**URL pattern:** `/:code/:type/:widthxheight.:format`

**Examples:**
- `/UA/s/200x200.png` — United Airlines, square, 200×200, PNG
- `/EK/r/350x100.png` — Emirates, rectangular, 350×100, PNG
- `/LH/s/64x64.png?theme=dark` — Lufthansa, square, 64×64, dark theme

### Error Handling

The SDK throws `AirlineStreamError` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Human-readable error message |
| `statusCode` | `number` | HTTP status code from the API |
| `code` | `string` | Machine-readable error code |

Error codes: `INVALID_CODE`, `INVALID_TYPE`, `INVALID_DIMENSIONS`, `INVALID_FORMAT`, `HTTP_400`, `HTTP_401`, `HTTP_403`, `HTTP_404`, `HTTP_429`, `HTTP_502`.

The middleware translates errors to safe HTTP responses:
- `401`/`403` upstream → `502 Logo service configuration error` (doesn't leak auth details)
- `429` upstream → `503 Logo service temporarily unavailable`
- `404` upstream → `404 Airline not found`

---

## Supported Airline Codes

The API accepts both **IATA** (2-letter) and **ICAO** (3-letter) airline codes:

| Airline | IATA | ICAO |
|---------|------|------|
| United Airlines | UA | UAL |
| Delta Air Lines | DL | DAL |
| American Airlines | AA | AAL |
| Emirates | EK | UAE |
| British Airways | BA | BAW |
| Lufthansa | LH | DLH |
| Singapore Airlines | SQ | SIA |
| Qatar Airways | QR | QTR |

Hundreds more supported. Browse the full list at [airlinestream.dev/airlines](https://airlinestream.dev/airlines).

---

## Pricing

| Plan | Price | Max Resolution | Logo Types | Formats | Rate Limit |
|------|-------|----------------|------------|---------|------------|
| **Free** | $0/year | 64×64 px | Square | PNG | 1 req/s |
| **Starter** | $390/year | 256×256 px | Square + Rectangular | PNG | 25 req/s |
| **Professional** | $1,990/year | 512×512 px | Square + Rectangular | PNG | 500 req/s |
| **Enterprise** | $4,990/year | Unlimited | Square + Rectangular | PNG + SVG | 5,000 req/s |

Dark theme is available on Professional and Enterprise plans. All plans include daily database updates and global CDN delivery.

**[Get your free API key →](https://airlinestream.dev/pricing)**

---

## Use Cases

- **Flight booking platforms** — Display airline logos in search results, itineraries, and e-tickets
- **FIDS & airport displays** — Crisp logos on departure/arrival boards and gate displays
- **Travel metasearch engines** — Airline branding in fare comparison results
- **Flight tracking apps** — Recognizable logos in route maps and notifications
- **Travel agencies** — Branded travel proposals and itinerary documents
- **Aviation software** — Crew management, ground handling, and cargo dashboards

---

## Examples

See the [`examples/`](examples/) directory for complete working examples:

- **[express.js](examples/express.js)** — Full Express server with HTML demo page
- **[nextjs-route.js](examples/nextjs-route.js)** — Next.js Pages Router and App Router examples
- **[programmatic.js](examples/programmatic.js)** — Fetch logos as Buffers for PDFs and emails

---

## Links

- **Website:** [airlinestream.dev](https://airlinestream.dev)
- **API Documentation:** [airlinestream.dev/docs](https://airlinestream.dev/docs)
- **Pricing & Free Tier:** [airlinestream.dev/pricing](https://airlinestream.dev/pricing)
- **Browse Airlines:** [airlinestream.dev/airlines](https://airlinestream.dev/airlines)
- **Airline Logo Gallery:** [airlinestream.dev/airline-logos](https://airlinestream.dev/airline-logos)
- **Contact:** [airlinestream.dev/contact](https://airlinestream.dev/contact)

---

## License

[MIT](LICENSE)
