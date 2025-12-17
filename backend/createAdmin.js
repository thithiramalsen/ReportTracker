// Run this script to create an initial admin user in the database.
// Usage: node createAdmin.js "Admin Name" "division-code" "password123" [phone] [email]

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

async function main() {
  const [,, name, code, password, phone, email] = process.argv;
  if (!name || !code || !password) {
    console.error('Usage: node createAdmin.js "Name" "code" "password" [phone] [email]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const existing = await User.findOne({ code });
  if (existing) {
    console.log('User already exists for code:', existing.code);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = new User({ name, code: code.trim().toLowerCase(), phone, email: email ? email.trim().toLowerCase() : undefined, password: hash, role: 'admin' });
  await user.save();
  console.log('Admin created:', user.code);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
