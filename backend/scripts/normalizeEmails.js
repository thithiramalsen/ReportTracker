const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/reporttracker';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const users = await User.find().lean();
  console.log(`Found ${users.length} users`);

  // detect duplicates when lowercased
  const map = {};
  for (const u of users) {
    const lower = (u.email || '').trim().toLowerCase();
    if (!map[lower]) map[lower] = [];
    map[lower].push(u);
  }

  let duplicateCount = 0;
  for (const [lower, arr] of Object.entries(map)) {
    if (arr.length > 1) {
      duplicateCount++;
      console.warn(`Duplicate emails when lowercased: ${lower} -> ${arr.map(a=>a._id).join(', ')}`);
    }
  }

  if (duplicateCount > 0) {
    console.error('Aborting: please resolve duplicates before running automatic normalization.');
    process.exit(1);
  }

  // update emails to lowercased
  for (const u of users) {
    const lower = (u.email || '').trim().toLowerCase();
    if (u.email !== lower) {
      console.log(`Updating ${u._id}: ${u.email} -> ${lower}`);
      await User.updateOne({ _id: u._id }, { $set: { email: lower } });
    }
  }

  console.log('Email normalization complete');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
