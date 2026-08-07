/**
 * Example migration — adds an optional `phone` field to existing users
 * and creates a sparse index on it.
 *
 * Use this as a template for future migrations:
 *   npx migrate-mongo create <description>
 *
 * Then edit the generated file with your up/down logic.
 */

module.exports = {
  async up(db) {
    // Add phone field (null) to all users that don't have it
    await db.collection('users').updateMany(
      { phone: { $exists: false } },
      { $set: { phone: null } },
    );

    // Create a sparse unique index on phone (only indexes non-null values)
    await db.collection('users').createIndex(
      { phone: 1 },
      { sparse: true, unique: true },
    );
  },

  async down(db) {
    // Drop the index
    try {
      await db.collection('users').dropIndex({ phone: 1 });
    } catch {
      // Index may not exist
    }

    // Remove the phone field from all users
    await db.collection('users').updateMany({}, { $unset: { phone: '' } });
  },
};
