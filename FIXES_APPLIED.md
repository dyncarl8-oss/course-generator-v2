# Balance Fields Fix - Complete

## What Was Fixed

### 1. ✅ Fixed `storage.ts` - `ensureUserBalanceFields()` function
**Location:** `server/storage.ts`, lines 165-196

**Problem:** Was adding `adminBalance` to users with role "admin" OR "creator"
**Fix:** Now:
- Removes `adminBalance` from ALL non-admin users (creators, members)
- Only adds `adminBalance` to admin users who don't have it

**Code:**
```typescript
async ensureUserBalanceFields(): Promise<void> {
  const now = new Date();
  // Remove adminBalance from non-admin users (creators, members, etc.)
  await UserModel.updateMany(
    { role: { $ne: "admin" }, adminBalance: { $exists: true } },
    { $unset: { adminBalance: "" } }
  );

  // Only initialize adminBalance for admin users (platform owners)
  await UserModel.updateMany(
    { role: "admin", adminBalance: { $exists: false } },
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
}
```

### 2. ✅ Fixed `/api/experiences/:experienceId/withdraw-request` endpoint
**Location:** `server/routes.ts`, lines 1027-1078

**Problem:** Only checked CreatorEarnings, didn't handle adminBalance
**Fix:** Now correctly checks both adminBalance (for admins) and CreatorEarnings (for creators)

**Code:**
```typescript
// For admin users, use adminBalance; for creators, use CreatorEarnings
let availableBalance: number;
let totalEarnings: number;

if (req.user.role === "admin" && req.user.adminBalance) {
  availableBalance = req.user.adminBalance.availableBalance;
  totalEarnings = req.user.adminBalance.totalEarnings;
} else {
  const earnings = await storage.getCreatorEarnings(req.user.id);
  // ... use CreatorEarnings
}
```

### 3. ✅ Created Migration Script
**Location:** `server/migrations/cleanup-admin-balance.ts`

**What it does:**
- Removes `adminBalance` from all creator and member users
- Initializes `adminBalance` for admin users who don't have it
- Shows summary of changes
- Lists all admins with their balances
- Lists all CreatorEarnings records

**How to run:**
```bash
# Make sure MONGODB_URI is set in your environment
npx tsx server/migrations/cleanup-admin-balance.ts
```

## How the System Works Now

### 🎯 Clear Separation of Concerns

**Admin Users (role="admin"):**
- ✅ Have `adminBalance` in User document
- ✅ NO CreatorEarnings record
- ✅ Display uses `user.adminBalance.totalEarnings`
- ✅ Gets 30% platform fee from every sale

**Creator Users (role="creator"):**
- ✅ NO `adminBalance` in User document
- ✅ Have CreatorEarnings collection record
- ✅ Display uses `creatorEarnings.totalEarnings`
- ✅ Gets 70% share from their course sales

**Member Users (role="member"):**
- ✅ NO `adminBalance` in User document
- ✅ NO CreatorEarnings record
- ✅ Just buy courses, no earnings

### 📊 Dashboard Display Logic

**"Your Total Earnings" stat shows:**

**For Admins:**
- Source: `user.adminBalance.totalEarnings`
- This is the platform's 30% fee from all sales

**For Creators:**
- Source: `creatorEarnings.totalEarnings`
- This is their 70% share from their course sales

**Endpoints updated:**
- `/api/dashboard/:companyId` ✅ (was already correct)
- `/api/experiences/:experienceId` ✅ (was already correct)
- `/api/dashboard/:companyId/withdraw-request` ✅ (was already correct)
- `/api/experiences/:experienceId/withdraw-request` ✅ (fixed!)

## What Happens on Payment

When a course sells for $100:

```
$100 Sale
  ├─ $70 (70%) → CreatorEarnings (creator's share)
  └─ $30 (30%) → User.adminBalance (platform fee)
```

**Location:** `server/routes.ts`, lines 1549-1557

```typescript
const CREATOR_PERCENTAGE = 0.70; // Creator gets 70%
const PLATFORM_PERCENTAGE = 0.30; // Platform gets 30%
const creatorEarnings = totalAmount * CREATOR_PERCENTAGE;
const platformEarnings = totalAmount * PLATFORM_PERCENTAGE;

await storage.addCreatorEarnings(payment.creatorId, creatorEarnings);
await storage.addAdminEarnings(platformEarnings);
```

## Database Schema

### User Collection
```javascript
{
  _id: string,
  role: "admin" | "creator" | "member",
  adminBalance?: {              // ONLY for role="admin"
    totalEarnings: number,
    availableBalance: number,
    updatedAt: Date
  }
  // ... other fields
}
```

### CreatorEarnings Collection
```javascript
{
  _id: string,
  creatorId: string,
  totalEarnings: number,       // Creator's 70% share
  availableBalance: number,
  pendingBalance: number,
  updatedAt: Date
}
```

## How to Apply the Fix

### Step 1: Run the migration (cleans existing data)
```bash
# Set your MongoDB URI first
export MONGODB_URI="mongodb://..."

# Run migration
npx tsx server/migrations/cleanup-admin-balance.ts
```

### Step 2: Restart your server
```bash
# The ensureUserBalanceFields() runs on startup
npm run dev
```

### Step 3: Verify in MongoDB
```javascript
// Check admins (should have adminBalance)
db.users.find({ role: "admin" }, { username: 1, adminBalance: 1 })

// Check creators (should NOT have adminBalance)
db.users.find({ role: "creator" }, { username: 1, adminBalance: 1 })

// Check CreatorEarnings records
db.creatorEarnings.find({}, { creatorId: 1, totalEarnings: 1 })
```

## Files Changed

1. **server/storage.ts** - Fixed `ensureUserBalanceFields()` function
2. **server/routes.ts** - Fixed `/api/experiences/:experienceId/withdraw-request`
3. **server/migrations/cleanup-admin-balance.ts** - NEW migration script
4. **BALANCE_FIX_README.md** - NEW detailed explanation
5. **FIXES_APPLIED.md** - This file

## Frontend (No Changes Needed)

The frontend is already using the correct data:
- `client/src/pages/dashboard.tsx` ✅ Uses `data.earnings.totalEarnings`
- `client/src/pages/experience.tsx` ✅ Uses `data.earnings.totalEarnings`

The backend now correctly populates `data.earnings` based on user role!

## Memory Updated

Updated memory in the repository to document:
- Correct separation between adminBalance (for admins) and CreatorEarnings (for creators)
- Migration script usage
- Proper earnings display logic across all endpoints

## Summary

✅ **Problem Fixed:** Creators had both adminBalance (wrong) and CreatorEarnings (correct)
✅ **Solution Applied:** Removed adminBalance from all non-admin users
✅ **Migration Created:** Script to clean up existing incorrect data
✅ **Endpoint Fixed:** Withdraw request now works for both admins and creators
✅ **Documentation:** Clear explanation of how the system works

**"Your Total Earnings" is no longer confusing!** It shows:
- Admin's platform earnings (30% fee) for admins
- Creator's course earnings (70% share) for creators
