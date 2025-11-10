// Run this script to create an initial admin user in the database.
// Usage: node createAdmin.js "Admin Name" "admin@example.com" "password123"

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

async function main() {
  const [,, name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node createAdmin.js "Name" "email" "password"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('User already exists:', existing.email);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hash, role: 'admin' });
  await user.save();
  console.log('Admin created:', user.email);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
