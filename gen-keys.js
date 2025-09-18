const { generateKeyPairSync } = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
});

fs.writeFileSync('release_sign_key.pem', privateKey);
fs.writeFileSync('release_sign_pub.pem', publicKey);
console.log('Keys written: release_sign_key.pem, release_sign_pub.pem');