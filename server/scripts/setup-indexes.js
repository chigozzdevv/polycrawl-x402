import { getDb } from '../src/config/db.js';

async function setupIndexes() {
  console.log('Setting up MongoDB indexes...\n');

  try {
    const db = await getDb();

    console.log('1. TAP nonces collection...');
    await db.collection('tap_nonces').createIndex(
      { expires_at: 1 },
      { expireAfterSeconds: 0 }
    );
    await db.collection('tap_nonces').createIndex({ _id: 1 });
    console.log('   ✓ TTL index on expires_at');
    console.log('   ✓ Index on _id\n');

    console.log('2. Requests collection (for caps calculation)...');
    await db.collection('requests').createIndex({ user_id: 1, status: 1, ts: -1 });
    await db.collection('requests').createIndex({ user_id: 1, resource_id: 1, status: 1, ts: -1 });
    await db.collection('requests').createIndex({ user_id: 1, mode: 1, status: 1 });
    console.log('   ✓ Index on user_id + status + ts');
    console.log('   ✓ Index on user_id + resource_id + status + ts');
    console.log('   ✓ Index on user_id + mode + status\n');

    console.log('3. Resources collection (text search)...');
    try {
      await db.collection('resources').createIndex(
        { title: 'text', summary: 'text', tags: 'text' },
        { weights: { title: 10, tags: 5, summary: 1 } }
      );
      console.log('   ✓ Text index on title, summary, tags\n');
    } catch (e) {
      if (e.codeName === 'IndexOptionsConflict') {
        console.log('   ℹ Text index already exists\n');
      } else {
        throw e;
      }
    }

    console.log('4. Users collection...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('   ✓ Unique index on email\n');

    console.log('5. Agents collection...');
    await db.collection('agents').createIndex({ client_key: 1 });
    console.log('   ✓ Index on client_key\n');

    console.log('6. Wallets collection...');
    await db.collection('wallets').createIndex({ owner_user_id: 1, role: 1 });
    console.log('   ✓ Index on owner_user_id + role\n');

    console.log('7. Receipts collection...');
    await db.collection('receipts').createIndex({ request_id: 1 });
    console.log('   ✓ Index on request_id\n');

    console.log('8. Ledger entries collection...');
    await db.collection('ledger_entries').createIndex({ wallet_id: 1, ts: -1 });
    console.log('   ✓ Index on wallet_id + ts\n');

    console.log('✅ All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
    process.exit(1);
  }
}

setupIndexes();
