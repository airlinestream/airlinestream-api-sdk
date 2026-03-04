'use strict';

const DEFAULT_BASE_URL = 'https://airlinestream.dev/api/v1';

class AirlineStreamError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'AirlineStreamError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const VALID_TYPES = new Set(['s', 'r']);
const VALID_FORMATS = new Set(['png', 'jpg', 'gif', 'svg']);

function createClient({ apiKey, baseUrl } = {}) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('airlinestream-api-sdk: apiKey is required');
  }

  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

  /**
   * Fetch an airline logo from the AirlineStream API.
   *
   * @param {string} code   IATA (2-letter) or ICAO (3-letter) airline code
   * @param {object} opts
   * @param {string} opts.type    Logo type: 's' (square) or 'r' (rectangular)
   * @param {number} opts.width   Width in pixels
   * @param {number} opts.height  Height in pixels
   * @param {string} opts.format  Image format: 'png', 'jpg', 'gif', or 'svg'
   * @param {string} [opts.theme] Theme: 'light' (default) or 'dark'
   * @returns {Promise<{ buffer: Buffer, contentType: string }>}
   */
  async function logo(code, { type, width, height, format, theme } = {}) {
    if (!code || typeof code !== 'string') {
      throw new AirlineStreamError('Airline code is required', 400, 'INVALID_CODE');
    }
    if (!VALID_TYPES.has(type)) {
      throw new AirlineStreamError(`Invalid logo type "${type}". Use "s" (square) or "r" (rectangular)`, 400, 'INVALID_TYPE');
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new AirlineStreamError('Width and height must be positive integers', 400, 'INVALID_DIMENSIONS');
    }
    if (!VALID_FORMATS.has(format)) {
      throw new AirlineStreamError(`Invalid format "${format}". Use png, jpg, gif, or svg`, 400, 'INVALID_FORMAT');
    }

    let url = `${base}/logos/${encodeURIComponent(code)}/${type}/${width}x${height}.${format}`;
    if (theme && theme !== 'light') {
      url += `?theme=${encodeURIComponent(theme)}`;
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const messages = {
        400: body || 'Bad request — invalid parameters',
        401: 'Unauthorized — check your API key',
        403: body || 'Forbidden — your plan does not allow this resource',
        404: 'Airline not found',
        429: 'Rate limit exceeded — upgrade your plan or reduce request rate',
        502: 'AirlineStream upstream error',
      };
      throw new AirlineStreamError(
        messages[res.status] || `API error: ${res.status}`,
        res.status,
        `HTTP_${res.status}`,
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    return { buffer, contentType };
  }

  return { logo };
}

module.exports = { createClient, AirlineStreamError };
