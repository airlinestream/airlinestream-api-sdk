'use strict';

const { describe, it, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createClient, AirlineStreamError } = require('../src/client');
const { createMiddleware } = require('../src/middleware');

// ---------------------------------------------------------------------------
// Client tests
// ---------------------------------------------------------------------------

describe('createClient', () => {
  it('throws if apiKey is missing', () => {
    assert.throws(() => createClient(), /apiKey is required/);
    assert.throws(() => createClient({}), /apiKey is required/);
    assert.throws(() => createClient({ apiKey: '' }), /apiKey is required/);
  });

  it('returns an object with a logo method', () => {
    const client = createClient({ apiKey: 'sk_test' });
    assert.equal(typeof client.logo, 'function');
  });
});

describe('client.logo()', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  it('constructs the correct URL and sends auth header', async (t) => {
    let capturedUrl, capturedOpts;
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return {
        ok: true,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };
    // Patch headers to work like a real Response
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return {
        ok: true,
        headers: { get: (key) => key === 'content-type' ? 'image/png' : null },
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };

    const client = createClient({ apiKey: 'sk_test123' });
    await client.logo('UA', { type: 's', width: 200, height: 200, format: 'png' });

    assert.equal(capturedUrl, 'https://airlinestream.dev/api/v1/logos/UA/s/200x200.png');
    assert.equal(capturedOpts.headers.Authorization, 'Bearer sk_test123');

    globalThis.fetch = originalFetch;
  });

  it('appends theme query param when not light', async (t) => {
    let capturedUrl;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };

    const client = createClient({ apiKey: 'sk_test' });
    await client.logo('DL', { type: 'r', width: 350, height: 100, format: 'png', theme: 'dark' });

    assert.equal(capturedUrl, 'https://airlinestream.dev/api/v1/logos/DL/r/350x100.png?theme=dark');

    globalThis.fetch = originalFetch;
  });

  it('does not append theme param for light theme', async (t) => {
    let capturedUrl;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };

    const client = createClient({ apiKey: 'sk_test' });
    await client.logo('EK', { type: 's', width: 100, height: 100, format: 'png', theme: 'light' });

    assert.equal(capturedUrl, 'https://airlinestream.dev/api/v1/logos/EK/s/100x100.png');

    globalThis.fetch = originalFetch;
  });

  it('respects custom baseUrl', async (t) => {
    let capturedUrl;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };

    const client = createClient({ apiKey: 'sk_test', baseUrl: 'https://custom.api.dev/api/v1' });
    await client.logo('LH', { type: 's', width: 64, height: 64, format: 'png' });

    assert.equal(capturedUrl, 'https://custom.api.dev/api/v1/logos/LH/s/64x64.png');

    globalThis.fetch = originalFetch;
  });

  it('throws AirlineStreamError on invalid params', async () => {
    const client = createClient({ apiKey: 'sk_test' });

    await assert.rejects(
      () => client.logo('', { type: 's', width: 200, height: 200, format: 'png' }),
      (err) => err instanceof AirlineStreamError && err.code === 'INVALID_CODE',
    );

    await assert.rejects(
      () => client.logo('UA', { type: 'x', width: 200, height: 200, format: 'png' }),
      (err) => err instanceof AirlineStreamError && err.code === 'INVALID_TYPE',
    );

    await assert.rejects(
      () => client.logo('UA', { type: 's', width: -1, height: 200, format: 'png' }),
      (err) => err instanceof AirlineStreamError && err.code === 'INVALID_DIMENSIONS',
    );

    await assert.rejects(
      () => client.logo('UA', { type: 's', width: 200, height: 200, format: 'bmp' }),
      (err) => err instanceof AirlineStreamError && err.code === 'INVALID_FORMAT',
    );
  });

  it('throws AirlineStreamError on HTTP errors', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const client = createClient({ apiKey: 'sk_bad' });

    await assert.rejects(
      () => client.logo('UA', { type: 's', width: 200, height: 200, format: 'png' }),
      (err) => err instanceof AirlineStreamError && err.statusCode === 401,
    );

    globalThis.fetch = originalFetch;
  });
});

// ---------------------------------------------------------------------------
// Middleware tests
// ---------------------------------------------------------------------------

describe('createMiddleware', () => {
  function mockReq(method, url) {
    return { method, url };
  }

  function mockRes() {
    const res = {
      _status: null,
      _headers: {},
      _body: null,
      writeHead(status, headers) {
        res._status = status;
        if (headers) Object.assign(res._headers, headers);
      },
      end(body) {
        res._body = body;
      },
    };
    return res;
  }

  it('returns 405 for non-GET requests', async () => {
    const mw = createMiddleware({ logo: async () => {} });
    const res = mockRes();
    await mw(mockReq('POST', '/UA/s/200x200.png'), res);
    assert.equal(res._status, 405);
  });

  it('returns 404 for invalid paths', async () => {
    const mw = createMiddleware({ logo: async () => {} });
    const res = mockRes();
    await mw(mockReq('GET', '/invalid'), res);
    assert.equal(res._status, 404);
  });

  it('calls next() for invalid paths when next is provided', async () => {
    const mw = createMiddleware({ logo: async () => {} });
    let nextCalled = false;
    await mw(mockReq('GET', '/invalid'), mockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it('proxies valid logo requests', async () => {
    const fakeBuffer = Buffer.from('PNG');
    const fakeClient = {
      logo: async (code, opts) => {
        assert.equal(code, 'UA');
        assert.equal(opts.type, 's');
        assert.equal(opts.width, 200);
        assert.equal(opts.height, 200);
        assert.equal(opts.format, 'png');
        return { buffer: fakeBuffer, contentType: 'image/png' };
      },
    };

    const mw = createMiddleware(fakeClient);
    const res = mockRes();
    await mw(mockReq('GET', '/UA/s/200x200.png'), res);

    assert.equal(res._status, 200);
    assert.equal(res._headers['Content-Type'], 'image/png');
    assert.equal(res._body, fakeBuffer);
  });

  it('passes theme query param', async () => {
    const fakeClient = {
      logo: async (code, opts) => {
        assert.equal(opts.theme, 'dark');
        return { buffer: Buffer.from('IMG'), contentType: 'image/png' };
      },
    };

    const mw = createMiddleware(fakeClient);
    const res = mockRes();
    await mw(mockReq('GET', '/EK/r/350x100.png?theme=dark'), res);
    assert.equal(res._status, 200);
  });

  it('returns 404 for upstream 404', async () => {
    const fakeClient = {
      logo: async () => { throw new AirlineStreamError('Not found', 404, 'HTTP_404'); },
    };

    const mw = createMiddleware(fakeClient);
    const res = mockRes();
    await mw(mockReq('GET', '/ZZ/s/200x200.png'), res);
    assert.equal(res._status, 404);
  });

  it('returns 502 for auth errors (does not leak)', async () => {
    const fakeClient = {
      logo: async () => { throw new AirlineStreamError('Unauthorized', 401, 'HTTP_401'); },
    };

    const mw = createMiddleware(fakeClient);
    const res = mockRes();
    await mw(mockReq('GET', '/UA/s/200x200.png'), res);
    assert.equal(res._status, 502);
    assert.ok(!res._body.includes('Unauthorized'));
  });

  it('returns 503 for rate limit errors', async () => {
    const fakeClient = {
      logo: async () => { throw new AirlineStreamError('Rate limited', 429, 'HTTP_429'); },
    };

    const mw = createMiddleware(fakeClient);
    const res = mockRes();
    await mw(mockReq('GET', '/UA/s/200x200.png'), res);
    assert.equal(res._status, 503);
  });
});
