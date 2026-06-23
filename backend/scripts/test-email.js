require('dotenv').config({ path: __dirname + '/../.env' });
const { sendVerificationEmail } = require('../src/services/emailService');

async function test() {
  const user = { email: 'sergamebm21@gmail.com', first_name: 'Sergio', username: 'sergio' };
  const token = 'test-token';
  console.log('Sending test email to', user.email);
  const result = await sendVerificationEmail(user, token);
  console.log('Result:', result);
}
test().catch(console.error);
