# Insurance Management Feature - Setup Guide

## Overview
This guide walks through the implementation of the Insurance Management feature for ReadyTMS, including a new Insurance page, insurance tabs in truck/trailer modals, and database integration.

## New Files Created

### Frontend (Client)

1. **`client/src/pages/insurance.tsx`**
   - Main Insurance Management page
   - Displays editable table of insurance records (trucks and trailers)
   - Features: search, sort, add, edit, delete
   - Matches UI style of Truck/Trailer Management pages

2. **`client/src/components/insurance-dialog.tsx`**
   - Insurance record dialog form
   - Fields: Unit #, Type (truck/trailer), Year, Make, Model, VIN, Status
   - Used for both creating and editing insurance records

### Backend (Server)

3. **`server/routes-insurance.ts`** (Reference - add to routes.ts)
   - API endpoints for insurance CRUD operations:
     - `GET /api/insurance` - List all records
     - `GET /api/insurance/:id` - Get single record
     - `POST /api/insurance` - Create record
     - `PATCH /api/insurance/:id` - Update record
     - `DELETE /api/insurance/:id` - Delete record

### Database

Insurance tables already created (via schema deployment):
- `insurance_trucks` - Insurance coverage for trucks
- `insurance_trailers` - Insurance coverage for trailers
- `insurance_sync_log` - Audit log of insurance file uploads
- `insurance_claims` - Claim/incident tracking
- `insurance_audit_trail` - Detailed change history

## Implementation Steps

### Step 1: Add Insurance Routes to `server/routes.ts`

Find the truck routes section (around line 681) and add the insurance routes after the truck DELETE route (after line 717):

```typescript
// Insurance Management Routes
app.get("/api/insurance", async (req: any, res) => {
  try {
    const records = await storage.db.query(
      'SELECT * FROM insurance_trucks UNION ALL SELECT * FROM insurance_trailers ORDER BY unit_number'
    );
    res.json(records);
  } catch (error) {
    console.error("Failed to fetch insurance records:", error);
    res.status(500).json({ message: "Failed to fetch insurance records" });
  }
});

// ... [See routes-insurance.ts for complete implementation]
```

### Step 2: Add Insurance Navigation Link

In `client/src/components/sidebar.tsx` (or your navigation file), add:

```typescript
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link to="/insurance" className="flex items-center gap-2">
      <Shield className="h-4 w-4" />
      Insurance
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### Step 3: Add Insurance Route to App Router

In `client/src/App.tsx` (or your routing configuration):

```typescript
import Insurance from "@/pages/insurance";

// Add to routes array:
{
  path: "/insurance",
  component: Insurance,
  // ... other route config
}
```

### Step 4: Add Insurance Tab to Truck Dialog (Optional)

In `client/src/components/truck-dialog.tsx`:

1. Change TabsList grid from `grid-cols-5` to `grid-cols-6`
2. Add Insurance trigger:
```typescript
<TabsTrigger value="insurance" data-testid="tab-insurance">
  <Shield className="mr-2 h-4 w-4" />
  Insurance
</TabsTrigger>
```

3. Add Insurance content:
```typescript
<TabsContent value="insurance" className="space-y-4 mt-4">
  <div className="space-y-4">
    <h3 className="font-medium text-lg">Insurance Information</h3>
    <p className="text-sm text-muted-foreground">
      Manage insurance coverage details for this truck. 
      View full insurance records in the <Link to="/insurance">Insurance Management</Link> page.
    </p>
    <Link to="/insurance">View Insurance Records →</Link>
  </div>
</TabsContent>
```

### Step 5: Add Insurance Tab to Trailer Dialog (Optional)

Repeat Step 4 for `client/src/components/trailer-dialog.tsx`

## File Structure

```
readytms/
├── client/
│   └── src/
│       ├── pages/
│       │   └── insurance.tsx (NEW)
│       └── components/
│           └── insurance-dialog.tsx (NEW)
├── server/
│   ├── routes.ts (MODIFY - add insurance routes)
│   └── routes-insurance.ts (REFERENCE)
└── INSURANCE_SETUP.md (THIS FILE)
```

## Features Included

### Insurance Management Page
- ✅ Responsive table view (truck and trailer records)
- ✅ Search by unit #, make, VIN
- ✅ Sort by unit number numerically
- ✅ Add new insurance record
- ✅ Edit existing records
- ✅ Delete records
- ✅ Status tracking (active, inactive, expired, pending)
- ✅ Date tracking (created, updated)

### Insurance Dialog
- ✅ Form fields: Unit #, Type, Year, Make, Model, VIN, Status
- ✅ Validation
- ✅ Loading states
- ✅ Error handling
- ✅ Success notifications

### API Endpoints
- ✅ Full CRUD operations
- ✅ Error handling
- ✅ Authentication-ready (add isAuthenticated middleware as needed)

## Testing

After implementation:

1. **Test Insurance Page**
   - Navigate to `/insurance`
   - Add a new record (e.g., Truck #450)
   - Edit the record
   - Delete the record
   - Verify search works
   - Verify sort works

2. **Test API Endpoints**
   ```bash
   # Get all records
   curl http://localhost:5000/api/insurance
   
   # Create record
   curl -X POST http://localhost:5000/api/insurance \
     -H "Content-Type: application/json" \
     -d '{"unitNumber":"450","unitType":"truck","year":2020,"make":"Freightliner","status":"active"}'
   ```

3. **Test Truck/Trailer Modals** (if tabs added)
   - Edit a truck
   - Navigate to Insurance tab
   - Should show link to Insurance Management page

## Database Verification

Verify insurance tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name LIKE 'insurance%';
```

Should return:
- insurance_trucks
- insurance_trailers
- insurance_sync_log
- insurance_claims
- insurance_audit_trail

## Next Steps

1. Push changes to GitHub
2. Deploy to Replit (git pull + npm install + npm run build)
3. Test all features
4. Optional: Add insurance document upload functionality
5. Optional: Add insurance expiration alerts
6. Optional: Add integration with insurance synchronization (from email attachments)

## Troubleshooting

**Q: Insurance page not found**
- A: Verify route is added to App.tsx and import is correct

**Q: API endpoints return 500 error**
- A: Check that database tables exist and routes-insurance.ts code is properly integrated into routes.ts

**Q: Insurance tab not showing in truck/trailer modal**
- A: Verify TabsList grid changed to grid-cols-6 and TabsTrigger/TabsContent are added

**Q: Records not saving**
- A: Check browser console for validation errors and ensure POST request payload matches schema

## Support

For questions or issues, check:
- Browser console for client-side errors
- Server logs for API errors
- Database schema (readytms_insurance_schema.sql)
