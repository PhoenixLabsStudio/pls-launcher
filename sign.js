// sign.js — готовит подпись версии перед сборкой (использует секрет RELEASE_SIGN_KEY)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const privPem = process.env.RELEASE_SIGN_KEY;
if (!privPem) {
  console.error('RELEASE_SIGN_KEY is empty');
  process.exit(1);
}

const pkg = require('./package.json');
const payload = JSON.stringify({ name: pkg.name, version: pkg.version, ts: Date.now() });

const sign = crypto.createSign('RSA-SHA256');
sign.update(payload);
sign.end();
const sig = sign.sign(privPem).toString('base64');

fs.mkdirSync(path.join(__dirname, 'resources'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'resources', 'official.json'), payload);
fs.writeFileSync(path.join(__dirname, 'resources', 'official.sig'), sig);
console.log('Official signature prepared for', pkg.version);