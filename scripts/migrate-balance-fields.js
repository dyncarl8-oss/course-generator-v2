#!/usr/bin/env node

/**
 * Migration script to clean up balance fields
 * 
 * This script:
 * 1. Removes the old 'balance' field from all users (replaced by adminBalance)
 * 2. Ensures only admin users have proper adminBalance initialization
 * 3. Cleans up any inconsistent balance data
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import User model (need to compile TypeScript first)
// We'll run this after the build
const UserSchema = new mongoose.Schema({
  _id: String,
  whopUserId: String,
  email: String,
  username: String,
  profilePicUrl: String,
  role: String,
  whopCompanyId: String,
  balance: Number, // OLD FIELD - to be removed
  adminBalance: {
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);

async function migrateBalanceFields() {
  try {
    console.log('🔄 Starting balance field migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // 1. Remove the old balance field from all users
    console.log('🗑️  Removing old balance field from all users...');
    const updateResult = await User.updateMany(
      { balance: { $exists: true } },
      { $unset: { balance: 1 } }
    );
    console.log(`✅ Removed balance field from ${updateResult.modifiedCount} users`);

    // 2. Initialize adminBalance for admin users who don't have it
    console.log('💰 Initializing adminBalance for admin users...');
    const now = new Date();
    const adminInitResult = await User.updateMany(
      { 
        role: 'admin',
        $or: [
          { adminBalance: { $exists: false } },
          { adminBalance: { $exists: null } },
          { adminBalance: { $not: { $type: 'object' } } }
        ]
      },
      {
        $set: {
          adminBalance: {
            totalEarnings: 0,
            availableBalance: 0,
            updatedAt: now,
          },
        },
      }
    );
    console.log(`✅ Initialized adminBalance for ${adminInitResult.modifiedCount} admin users`);

    // 3. Show summary of remaining balance fields
    console.log('📊 Checking final state...');
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const usersWithBalance = await User.countDocuments({ balance: { $exists: true } });
    const adminsWithAdminBalance = await User.countDocuments({ 
      role: 'admin', 
      'adminBalance.totalEarnings': { $exists: true } 
    });

    console.log(`
📈 Migration Summary:
   Total users: ${totalUsers}
   Admin users: ${adminUsers}
   Users with old balance field: ${usersWithBalance}
   Admins with adminBalance: ${adminsWithAdminBalance}
    `);

    if (usersWithBalance > 0) {
      console.warn('⚠️  WARNING: Some users still have the old balance field!');
    }

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run migration
migrateBalanceFields();