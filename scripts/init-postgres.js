#!/usr/bin/env node
// Run this script once after provisioning Vercel Postgres to initialize the schema.
// Usage: node scripts/init-postgres.js
// Requires DATABASE_URL to be set in .env.local

import { initializeSchema } from '../lib/db.js';

async function main() {
  console.log('🔧 Initializing Postgres schema...');
  try {
    await initializeSchema();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

main();
