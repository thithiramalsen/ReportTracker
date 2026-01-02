// Script to make the users.email index sparse (or drop and recreate)
// Usage (from backend/):
//   set MONGO_URI=mongodb://user:pass@host:port/dbname  (PowerShell: $env:MONGO_URI = '...')
//   node scripts/fix_email_index.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/test';

async function run() {
  console.log('Connecting to', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const collName = 'users';

  try {
    const indexes = await db.collection(collName).indexes();
    console.log('Existing indexes:', indexes.map(i => i.name));

    // If an index on email exists, drop it
    const emailIndex = indexes.find(i => i.key && i.key.email === 1);
    if (emailIndex) {
      console.log('Dropping index', emailIndex.name);
      try { await db.collection(collName).dropIndex(emailIndex.name); } catch (e) { console.error('dropIndex failed', e.message); }
    } else {
      console.log('No email index found, nothing to drop');
    }

    // Create sparse unique index on email
    console.log('Creating sparse unique index on email');
    await db.collection(collName).createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log('Index created successfully');
  } catch (err) {
    console.error('Error while updating indexes:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run().catch(err => {
  console.error('Unexpected error', err && err.stack ? err.stack : err);
  process.exit(1);
});
