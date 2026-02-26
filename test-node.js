const crypto = require('crypto');
function createHash(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}
console.log(createHash("test1234"));
