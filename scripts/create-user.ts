import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Default admin credentials
const email = process.argv[2] || 'admin@warungku.com';
const password = process.argv[3] || 'admin123';

const passwordHash = bcrypt.hashSync(password, 10);
const userId = randomUUID();
const timestamp = Date.now();

console.log('\n='.repeat(60));
console.log('🔐 USER CREATION SQL COMMAND');
console.log('='.repeat(60));
console.log('\nCopy and run this command in Cloudflare D1 Console:\n');
console.log(`npx wrangler d1 execute warungku_db --remote --command "INSERT INTO users (id, email, password_hash, role, created_at) VALUES ('${userId}', '${email}', '${passwordHash}', 'admin', ${timestamp});"`);
console.log('\n' + '='.repeat(60));
console.log('\n📧 Email:', email);
console.log('🔑 Password:', password);
console.log('👤 Role: admin');
console.log('\n⚠️  Save these credentials! You will need them to login.\n');
