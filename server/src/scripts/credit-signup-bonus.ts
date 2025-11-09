import { getDb } from '../config/db.js';
import { creditWallet } from '../features/wallets/wallets.model.js';

async function creditSignupBonusToExistingUsers() {
  const db = await getDb();
  const bonusAmount = 1000;

  const users = await db.collection('users').find({}).toArray();
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    const userId = String(user._id);

    const payerWallet = await db.collection('wallets').findOne({
      owner_user_id: userId,
      role: 'payer',
    } as any);

    if (!payerWallet) {
      console.log(`User ${userId} (${user.email}) has no payer wallet - skipping`);
      continue;
    }

    const hasBonus = await db.collection('ledger_entries').findOne({
      wallet_id: payerWallet._id,
      ref_type: 'signup_bonus',
      ref_id: 'initial_airdrop',
    } as any);

    if (hasBonus) {
      console.log(`User ${userId} (${user.email}) already has signup bonus - skipping`);
      continue;
    }

    if (payerWallet.available >= bonusAmount) {
      console.log(`User ${userId} (${user.email}) already has balance of $${payerWallet.available} - skipping`);
      continue;
    }

    try {
      await creditWallet(userId, 'payer', bonusAmount, 'signup_bonus', 'initial_airdrop');
      console.log(`✅ Credited $${bonusAmount} to user ${userId} (${user.email})`);
    } catch (err: any) {
      console.error(`❌ Failed to credit user ${userId}: ${err.message}`);
    }
  }

  console.log('\n✅ Done!');
  process.exit(0);
}

creditSignupBonusToExistingUsers().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
