console.log('Hello, World!');
console.log('Node.js is working!');

// Simple QR code generation test
const qrcode = require('qrcode-terminal');
qrcode.generate('https://wa.me/00967771750533', {small: true}, function (qrcode) {
    console.log('\nTest QR Code:');
    console.log(qrcode);
});
