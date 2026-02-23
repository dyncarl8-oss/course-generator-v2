/**
 * Migration: Cleanup adminBalance fields from non-admin users
 * 
 * This script:
 * 1. Removes adminBalance from all users who are NOT admins
 * 2. Ensures adminBalance exists for admin users
 * 
 * Run: npx tsx server/migrations/cleanup-admin-balance.ts
 */

import { connectDB } from "../db";
import { UserModel, CreatorEarningsModel } from "@shared/schema";

async function cleanupAdminBalance() {
  console.log("Starting adminBalance cleanup...");

  // Remove adminBalance from all non-admin users
  const nonAdminRemovalResult = await UserModel.updateMany(
    {
      role: { $ne: "admin" },
      adminBalance: { $exists: true }
    },
    {
      $unset: { adminBalance: "" }
    }
  );
  console.log(`✓ Removed adminBalance from ${nonAdminRemovalResult.modifiedCount} non-admin users`);

  // Initialize adminBalance for admin users who don't have it
  const now = new Date();
  const adminInitResult = await UserModel.updateMany(
    {
      role: "admin",
      adminBalance: { $exists: false }
    },
    {
      $set: {
        adminBalance: {
          totalEarnings: 0,
          availableBalance: 0,
          updatedAt: now
        }
      }
    }
  );
  console.log(`✓ Initialized adminBalance for ${adminInitResult.modifiedCount} admin users`);

  // Display summary
  const adminCount = await UserModel.countDocuments({ role: "admin" });
  const creatorCount = await UserModel.countDocuments({ role: "creator" });
  const memberCount = await UserModel.countDocuments({ role: "member" });

  console.log("\n=== Summary ===");
  console.log(`Total admin users: ${adminCount}`);
  console.log(`Total creator users: ${creatorCount}`);
  console.log(`Total member users: ${memberCount}`);

  // Show admins with their adminBalance
  const admins = await UserModel.find({ role: "admin" });
  console.log("\n=== Admin Balances ===");
  for (const admin of admins) {
    console.log(`- ${admin.username || admin.email || admin.whopUserId}: ${admin.adminBalance ? `$${admin.adminBalance.availableBalance.toFixed(2)}` : 'No balance'}`);
  }

  console.log("\n=== CreatorEarnings Records ===");
  const creatorEarnings = await CreatorEarningsModel.find({});
  for (const earnings of creatorEarnings) {
    const creator = await UserModel.findById(earnings.creatorId);
    console.log(`- ${creator?.username || creator?.email || earnings.creatorId}: $${earnings.availableBalance.toFixed(2)} (total: $${earnings.totalEarnings.toFixed(2)})`);
  }

  console.log("\n✅ Migration complete!");
}

async function runMigration() {
  try {
    await connectDB();
    await cleanupAdminBalance();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
