// sign.js — делает подпись версии app для "официальной" сборки
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const privKeyPem = process.env.RELEASE_SIGN_KEY;
if (!privKeyPem) {
  console.error('RELEASE_SIGN_KEY is empty');
  process.exit(1);
}
const pkg = require('./package.json');
const payload = JSON.stringify({
  name: pkg.name,
  version: pkg.version,
  ts: Date.now()
});

const sign = crypto.createSign('RSA-SHA256');
sign.update(payload);
sign.end();
const signature = sign.sign(privKeyPem).toString('base64');

// кладём в resources, чтобы попало в билд
fs.mkdirSync(path.join(__dirname, 'resources'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'resources', 'official.json'), payload);
fs.writeFileSync(path.join(__dirname, 'resources', 'official.sig'), signature);
console.log('Official signature prepared for', pkg.version);