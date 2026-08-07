import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from '../config';
import Role from '../modules/role/role.model';
import User from '../modules/user/user.model';
import Category from '../modules/category/category.model';
import Product from '../modules/product/product.model';
import { SEED_ROLES, SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS } from './seed-data';

// ── CLI argument parsing ───────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = new Set(args.map((a) => a.replace(/^--/, '')));

const showHelp = flags.has('help') || flags.has('h');
const isFresh = flags.has('fresh');
const seedTargets = ['roles', 'users', 'categories', 'products'] as const;
const selectedTargets = seedTargets.filter((t) => flags.has(t));
const seedAll = selectedTargets.length === 0 && !showHelp;
const targets = seedAll ? [...seedTargets] : selectedTargets;

// ── Helpers ────────────────────────────────────────────────────────────
const log = (msg: string) => console.log(`  ${msg}`); // eslint-disable-line no-console
const header = (msg: string) => console.log(`\n${msg}`); // eslint-disable-line no-console

function printHelp() {
  header('Usage: npx ts-node src/scripts/seed.ts [options]');
  log('');
  log('Options:');
  log('  --roles        Seed roles only');
  log('  --users        Seed users only');
  log('  --categories   Seed categories only');
  log('  --products     Seed products only');
  log('  --fresh        Drop existing data before seeding');
  log('  --help, -h     Show this help message');
  log('');
  log('Examples:');
  log('  npm run seed                       # Seed all data');
  log('  npm run seed -- --fresh            # Drop and re-seed all data');
  log('  npm run seed -- --users --fresh    # Drop users and re-seed');
  log('  npm run seed -- --categories       # Seed categories only');
  log('');
}

// ── Seeders ────────────────────────────────────────────────────────────
async function seedRoles(fresh: boolean) {
  if (fresh) {
    await Role.deleteMany({});
    log('Cleared roles collection');
  }

  let created = 0;
  for (const roleData of SEED_ROLES) {
    const exists = await Role.findOne({ name: roleData.name });
    if (!exists) {
      await Role.create(roleData);
      created++;
      log(`Created role: ${roleData.name}`);
    } else {
      log(`Role already exists: ${roleData.name}`);
    }
  }
  log(`Roles: ${created} created, ${SEED_ROLES.length - created} skipped`);
}

async function seedUsers(fresh: boolean) {
  if (fresh) {
    await User.deleteMany({});
    log('Cleared users collection');
  }

  let created = 0;
  for (const userData of SEED_USERS) {
    const exists = await User.findOne({ email: userData.email, includeSoftDeleted: true });
    if (!exists) {
      const role = await Role.findOne({ name: userData.roleName });
      if (!role) {
        log(
          `Skipping user ${userData.email}: role "${userData.roleName}" not found (seed roles first)`,
        );
        continue;
      }
      await User.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: role._id,
        isEmailVerified: userData.isEmailVerified,
      });
      created++;
      log(`Created user: ${userData.email} (${userData.roleName})`);
    } else {
      log(`User already exists: ${userData.email}`);
    }
  }
  log(`Users: ${created} created, ${SEED_USERS.length - created} skipped`);
}

async function seedCategories(fresh: boolean) {
  if (fresh) {
    await Category.deleteMany({});
    log('Cleared categories collection');
  }

  let created = 0;
  for (const catData of SEED_CATEGORIES) {
    const exists = await Category.findOne({ name: catData.name });
    if (!exists) {
      await Category.create(catData);
      created++;
      log(`Created category: ${catData.name}`);
    } else {
      log(`Category already exists: ${catData.name}`);
    }
  }
  log(`Categories: ${created} created, ${SEED_CATEGORIES.length - created} skipped`);
}

async function seedProducts(fresh: boolean) {
  if (fresh) {
    await Product.deleteMany({});
    log('Cleared products collection');
  }

  let created = 0;
  for (const prodData of SEED_PRODUCTS) {
    const exists = await Product.findOne({ name: prodData.name });
    if (!exists) {
      const category = await Category.findOne({ name: prodData.categoryName });
      if (!category) {
        log(
          `Skipping product "${prodData.name}": category "${prodData.categoryName}" not found (seed categories first)`,
        );
        continue;
      }
      await Product.create({
        name: prodData.name,
        description: prodData.description,
        price: prodData.price,
        stock: prodData.stock,
        category: category._id,
      });
      created++;
      log(`Created product: ${prodData.name}`);
    } else {
      log(`Product already exists: ${prodData.name}`);
    }
  }
  log(`Products: ${created} created, ${SEED_PRODUCTS.length - created} skipped`);
}

// ── Main ───────────────────────────────────────────────────────────────
const seederMap = {
  roles: seedRoles,
  users: seedUsers,
  categories: seedCategories,
  products: seedProducts,
} as const;

async function main() {
  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  header(`Seed CLI — ${isFresh ? 'FRESH ' : ''}seeding: ${targets.join(', ')}`);
  log(`Database: ${config.mongoUri}`);

  await mongoose.connect(config.mongoUri);
  log('Connected to MongoDB');

  for (const target of targets) {
    header(`Seeding ${target}...`);
    await seederMap[target](isFresh);
  }

  await mongoose.disconnect();
  header('Done! Database disconnected.\n');
}

main().catch((err) => {
  console.error('Seed failed:', err); // eslint-disable-line no-console
  process.exit(1);
});
