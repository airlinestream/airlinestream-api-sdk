/**
 * Programmatic usage example for airlinestream-api-sdk.
 *
 * Fetch airline logos as Buffers for use in PDF generation,
 * email templates, image processing, or saving to disk.
 *
 * Usage:
 *   AIRLINESTREAM_API_KEY=sk_your_key node examples/programmatic.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const airlinestream = require('airlinestream-api-sdk');

const logos = airlinestream({
  apiKey: process.env.AIRLINESTREAM_API_KEY,
});

async function main() {
  // Fetch a square United Airlines logo
  const { buffer, contentType } = await logos.logo('UA', {
    type: 's',
    width: 200,
    height: 200,
    format: 'png',
  });

  console.log(`Fetched logo: ${buffer.length} bytes, ${contentType}`);

  // Save to disk
  const outPath = path.join(__dirname, 'ua-logo.png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved to ${outPath}`);

  // Fetch a rectangular Emirates logo
  const emirates = await logos.logo('EK', {
    type: 'r',
    width: 350,
    height: 100,
    format: 'png',
  });

  const emiratesPath = path.join(__dirname, 'ek-logo-rect.png');
  fs.writeFileSync(emiratesPath, emirates.buffer);
  console.log(`Saved to ${emiratesPath}`);

  // Use in PDF generation (example with buffer)
  // const pdfDoc = new PDFDocument();
  // pdfDoc.image(buffer, 50, 50, { width: 100 });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
