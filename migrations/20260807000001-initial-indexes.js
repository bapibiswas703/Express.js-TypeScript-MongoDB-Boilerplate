/**
 * Initial migration — codifies all indexes defined in Mongoose schemas.
 *
 * This ensures indexes exist even if Mongoose autoIndex is disabled in production.
 * Running this migration is idempotent: createIndex is a no-op if the index already exists.
 */

module.exports = {
  async up(db) {
    // --- Users ---
    const users = db.collection('users');
    await users.createIndex({ name: 'text', email: 'text' });
    await users.createIndex({ deletedAt: 1, email: 1 });
    await users.createIndex({ passwordResetToken: 1 }, { sparse: true });
    await users.createIndex({ emailVerificationToken: 1 }, { sparse: true });
    await users.createIndex({ firebaseUid: 1 }, { sparse: true });
    await users.createIndex({ deletedAt: 1 });

    // --- Products ---
    const products = db.collection('products');
    await products.createIndex({ name: 'text', description: 'text' });
    await products.createIndex({ category: 1, isActive: 1 });
    await products.createIndex({ category: 1, price: 1 });
    await products.createIndex({ isActive: 1, price: 1 });
    await products.createIndex({ price: 1 });

    // --- Categories ---
    const categories = db.collection('categories');
    await categories.createIndex({ isActive: 1 });

    // --- Refresh Tokens ---
    const refreshTokens = db.collection('refreshtokens');
    await refreshTokens.createIndex({ user: 1, revoked: 1 });
    await refreshTokens.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 7 * 24 * 60 * 60 },
    );

    // --- Devices ---
    const devices = db.collection('devices');
    await devices.createIndex({ user: 1, isActive: 1 });
    await devices.createIndex({ refreshToken: 1 });

    // --- Media ---
    const media = db.collection('media');
    await media.createIndex({ folder: 1, uploadedBy: 1 });

    // --- Webhooks ---
    const webhooks = db.collection('webhooks');
    await webhooks.createIndex({ createdBy: 1 });

    // --- IP Blocklist ---
    const blockedIps = db.collection('blockedips');
    await blockedIps.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, sparse: true },
    );
  },

  async down(db) {
    // Drop only the compound/custom indexes (not _id or unique email).
    // Each dropIndex call is wrapped in try/catch so a missing index doesn't block rollback.

    const drop = async (collection, indexSpec) => {
      try {
        await db.collection(collection).dropIndex(indexSpec);
      } catch {
        // Index may not exist — safe to ignore
      }
    };

    // Users
    await drop('users', { name: 'text', email: 'text' });
    await drop('users', { deletedAt: 1, email: 1 });
    await drop('users', { passwordResetToken: 1 });
    await drop('users', { emailVerificationToken: 1 });
    await drop('users', { firebaseUid: 1 });
    await drop('users', { deletedAt: 1 });

    // Products
    await drop('products', { name: 'text', description: 'text' });
    await drop('products', { category: 1, isActive: 1 });
    await drop('products', { category: 1, price: 1 });
    await drop('products', { isActive: 1, price: 1 });
    await drop('products', { price: 1 });

    // Categories
    await drop('categories', { isActive: 1 });

    // Refresh Tokens
    await drop('refreshtokens', { user: 1, revoked: 1 });
    await drop('refreshtokens', { expiresAt: 1 });

    // Devices
    await drop('devices', { user: 1, isActive: 1 });
    await drop('devices', { refreshToken: 1 });

    // Media
    await drop('media', { folder: 1, uploadedBy: 1 });

    // Webhooks
    await drop('webhooks', { createdBy: 1 });

    // IP Blocklist
    await drop('blockedips', { expiresAt: 1 });
  },
};
