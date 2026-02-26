import md5 from "npm:md5@2.3.0";

const merchantCode = "D12345";
const amount = 10000;
const orderId = "UPG-12345678-12345678";
const apiKey = "12345678";

const expectedData = merchantCode + amount + orderId + apiKey;
const expectedSignature = md5(expectedData);

console.log(expectedSignature);
