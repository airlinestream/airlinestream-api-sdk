'use strict';

const { createClient, AirlineStreamError } = require('./client');
const { createMiddleware } = require('./middleware');

/**
 * Create an AirlineStream SDK instance.
 *
 * @param {object} options
 * @param {string} options.apiKey   Your AirlineStream API key (starts with sk_)
 * @param {string} [options.baseUrl] Override the API base URL (default: https://airlinestream.dev/api/v1)
 * @returns {{ logo: Function, middleware: Function }}
 *
 * @example
 * const airlinestream = require('airlinestream-api-sdk');
 * const logos = airlinestream({ apiKey: process.env.AIRLINESTREAM_API_KEY });
 *
 * // Mount as Express middleware
 * app.use('/logos', logos.middleware());
 *
 * // Or fetch programmatically
 * const { buffer, contentType } = await logos.logo('UA', {
 *   type: 's', width: 200, height: 200, format: 'png'
 * });
 */
function airlinestream(options) {
  const client = createClient(options);

  return {
    /**
     * Fetch an airline logo as a Buffer.
     * @param {string} code   IATA or ICAO airline code
     * @param {object} opts   { type, width, height, format, theme? }
     * @returns {Promise<{ buffer: Buffer, contentType: string }>}
     */
    logo: client.logo,

    /**
     * Create Express/Connect middleware that proxies logo requests
     * to the AirlineStream API server-side.
     *
     * Usage: app.use('/logos', logos.middleware())
     * HTML:  <img src="/logos/UA/s/200x200.png">
     *
     * @returns {function} (req, res, next) handler
     */
    middleware() {
      return createMiddleware(client);
    },
  };
}

// Main export is the factory function
module.exports = airlinestream;

// Named exports for granular imports
module.exports.airlinestream = airlinestream;
module.exports.createClient = createClient;
module.exports.createMiddleware = createMiddleware;
module.exports.AirlineStreamError = AirlineStreamError;
