/**
 * Next.js API Route example for airlinestream-js-sdk.
 *
 * File: pages/api/logos/[...path].js  (or app/api/logos/[...path]/route.js)
 *
 * This catches all requests to /api/logos/* and proxies them to the
 * AirlineStream API. Then in your components:
 *
 *   <img src="/api/logos/UA/s/200x200.png" alt="United Airlines" />
 */

const airlinestream = require('airlinestream-js-sdk');

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

// --- Pages Router (pages/api/logos/[...path].js) ---

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  // req.query.path is an array, e.g. ['UA', 's', '200x200.png']
  const segments = req.query.path;
  if (!segments || segments.length !== 3) {
    res.status(400).end('Invalid logo path');
    return;
  }

  const [code, type, sizeFormat] = segments;
  const dotIdx = sizeFormat.lastIndexOf('.');
  if (dotIdx === -1) {
    res.status(400).end('Invalid logo path — missing format extension');
    return;
  }

  const size = sizeFormat.substring(0, dotIdx);
  const format = sizeFormat.substring(dotIdx + 1);
  const [w, h] = size.split('x').map(Number);

  if (!w || !h) {
    res.status(400).end('Invalid dimensions');
    return;
  }

  try {
    const { buffer, contentType } = await logos.logo(code, {
      type,
      width: w,
      height: h,
      format,
      theme: req.query.theme || undefined,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buffer);
  } catch (err) {
    const status = err.statusCode || 502;
    res.status(status >= 500 ? 502 : status).end(err.message);
  }
};

/*
// --- App Router (app/api/logos/[...path]/route.js) ---
//
// export async function GET(request, { params }) {
//   const segments = params.path; // ['UA', 's', '200x200.png']
//   const [code, type, sizeFormat] = segments;
//   const dotIdx = sizeFormat.lastIndexOf('.');
//   const size = sizeFormat.substring(0, dotIdx);
//   const format = sizeFormat.substring(dotIdx + 1);
//   const [w, h] = size.split('x').map(Number);
//
//   const { searchParams } = new URL(request.url);
//
//   try {
//     const { buffer, contentType } = await logos.logo(code, {
//       type, width: w, height: h, format,
//       theme: searchParams.get('theme') || undefined,
//     });
//     return new Response(buffer, {
//       headers: {
//         'Content-Type': contentType,
//         'Cache-Control': 'public, max-age=86400',
//       },
//     });
//   } catch (err) {
//     return new Response(err.message, { status: err.statusCode || 502 });
//   }
// }
*/
