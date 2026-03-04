'use strict';

const PATH_RE = /^\/([A-Za-z0-9]{2,3})\/(s|r)\/(\d+)x(\d+)\.(png|jpg|gif|svg)$/;

/**
 * Create an Express/Connect-compatible middleware that proxies airline logo
 * requests to the AirlineStream API.
 *
 * Mount it on a route prefix (e.g. app.use('/logos', middleware)) and then
 * use <img src="/logos/UA/s/200x200.png"> in your HTML templates.
 *
 * @param {object} client  Client returned by createClient()
 * @returns {function}     (req, res, next) middleware
 */
function createMiddleware(client) {
  return async function airlinestreamMiddleware(req, res, next) {
    // Only handle GET requests
    if (req.method !== 'GET') {
      if (typeof next === 'function') return next();
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    // Parse the URL path (strip query string)
    const urlPath = (req.url || '').split('?')[0];
    const match = PATH_RE.exec(urlPath);

    if (!match) {
      if (typeof next === 'function') return next();
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const [, code, type, w, h, format] = match;
    const width = parseInt(w, 10);
    const height = parseInt(h, 10);

    // Parse theme from query string
    const qs = (req.url || '').split('?')[1] || '';
    const params = new URLSearchParams(qs);
    const theme = params.get('theme') || undefined;

    try {
      const { buffer, contentType } = await client.logo(code, {
        type,
        width,
        height,
        format,
        theme,
      });

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(buffer);
    } catch (err) {
      const status = err.statusCode || 502;

      // Map upstream errors to appropriate client-facing responses
      if (status === 401) {
        // Don't leak auth details to the browser
        res.writeHead(502);
        res.end('Logo service configuration error — check your API key');
      } else if (status === 403) {
        // Plan limit errors — pass through so developers/users see what to upgrade
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else if (status === 429) {
        // Rate limit — pass through with upgrade hint
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else if (status === 404) {
        res.writeHead(404);
        res.end('Airline not found');
      } else if (status === 400) {
        res.writeHead(400);
        res.end(err.message);
      } else {
        res.writeHead(502);
        res.end('Failed to fetch logo');
      }
    }
  };
}

module.exports = { createMiddleware };
