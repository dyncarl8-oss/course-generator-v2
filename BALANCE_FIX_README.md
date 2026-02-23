# Balance Fields Fix - Summary

## The Problem

Your database had confusing balance fields because:

1. **`adminBalance` was being added to ALL users with role "admin" OR "creator"** - This was WRONG!
2. Creators were getting `adminBalance` in their User document (which they shouldn't)
3. Creators also had `CreatorEarnings` records (which was correct)
4. This caused confusion about which field was actually being used

## The Solution

The system should work like this:

### For Admin Users (platform owners):
- **Only** `User.adminBalance` field exists in their User document
- Used to track the platform's 30% fee from every sale
- Fields: `totalEarnings`, `availableBalance`, `updatedAt`

### For Creator Users (course creators):
- **Only** `CreatorEarnings` collection record exists
- Used to track their 70% share from every sale
- Fields: `totalEarnings`, `availableBalance`, `pendingBalance`

### For Member Users (regular users):
- **No** balance fields at all
- They just buy courses

## Changes Made

### 1. Fixed `storage.ts` - `ensureUserBalanceFields()` function
**Before:** Added adminBalance to users with role "admin" OR "creator"
**After:**
- Removes adminBalance from ALL non-admin users (creators, members)
- Only adds adminBalance to admin users who don't have it

### 2. Fixed `/api/experiences/:experienceId/withdraw-request` endpoint
**Before:** Only checked CreatorEarnings
**After:** Now correctly checks both:
- If admin → uses adminBalance
- If creator → uses CreatorEarnings

This matches the logic already in `/api/dashboard/:companyId/withdraw-request`

### 3. Created migration script
`server/migrations/cleanup-admin-balance.ts` - Cleans up existing incorrect data

## How to Apply the Fix

### Step 1: Run the migration
```bash
npx tsx server/migrations/cleanup-admin-balance.ts
```

This will:
- Remove `adminBalance` from all creator and member users
- Initialize `adminBalance` for admin users who don't have it
- Show you a summary of the changes

### Step 2: Restart your server
The `ensureUserBalanceFields()` function runs on server startup, so restart to ensure it runs with the new logic.

## What "Your Total Earnings" Shows

The dashboard now correctly displays:

**For Admin Users (role="admin"):**
- Shows: `user.adminBalance.totalEarnings`
- This is the platform's 30% fee from all sales

**For Creator Users (role="creator"):**
- Shows: `creatorEarnings.totalEarnings`
- This is their 70% share from their course sales

**Code locations:**
- `/api/dashboard/:companyId` (lines 151-171 in routes.ts)
- `/api/experiences/:experienceId` admin view (lines 881-900 in routes.ts)

## Database Schema

### User Collection
```javascript
{
  _id: string,
  whopUserId: string,
  email?: string,
  username?: string,
  profilePicUrl?: string,
  role: string,           // "admin", "creator", or "member"
  whopCompanyId?: string,
  adminBalance?: {         // ONLY for role="admin"
    totalEarnings: number,
    availableBalance: number,
    updatedAt: Date
  },
  createdAt: Date
}
```

### CreatorEarnings Collection
```javascript
{
  _id: string,
  creatorId: string,      // Links to User._id
  totalEarnings: number,   // Creator's 70% share
  availableBalance: number,
  pendingBalance: number,
  updatedAt: Date
}
```

## Payment Split Logic

When a payment of $100 is completed:

```
$100 total sale
  ├─ $70 (70%) → CreatorEarnings (for the course creator)
  └─ $30 (30%) → User.adminBalance (for the platform admin)
```

This happens in `/api/payments/:checkoutId/verify` (lines 1549-1557 in routes.ts)

## Verification

After running the migration, you can verify:

1. **Admin users** should have `adminBalance` in their User document
2. **Creator users** should NOT have `adminBalance` but should have a CreatorEarnings record
3. **Member users** should have NO balance fields

Use MongoDB Compass or run:
```javascript
db.users.find({ role: "admin" }, { username: 1, adminBalance: 1 })
db.users.find({ role: "creator" }, { username: 1, adminBalance: 1 })
db.creatorEarnings.find()
```
