// tools/sign.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const pkg = require(path.join(ROOT, 'package.json'));

const APP_NAME = (pkg.build && (pkg.build.productName || pkg.build.appId)) || pkg.name;
const VERSION  = pkg.version;

const KEY_PATH = path.join(ROOT, 'release_sign_key.pem');
const OUT_DIR  = path.join(ROOT, 'resources');
const OUT_FILE = path.join(OUT_DIR, 'official.sig');

if (!fs.existsSync(KEY_PATH)) {
  console.error('✖ Не найден release_sign_key.pem в корне проекта.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const data = `${APP_NAME}|${VERSION}`;
const key  = fs.readFileSync(KEY_PATH);
const sig  = crypto.sign('RSA-SHA256', Buffer.from(data), key).toString('base64');

fs.writeFileSync(OUT_FILE, sig);
console.log(`✔ Подпись сгенерирована для: ${data}`);
console.log(`→ ${path.relative(ROOT, OUT_FILE)}`);