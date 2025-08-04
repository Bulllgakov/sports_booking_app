# Testing cleanupWebBookings Cloud Function

This document provides multiple methods to test the `cleanupWebBookings` Cloud Function that was deployed to clean up web bookings with online payment.

## Function Overview

The `cleanupWebBookings` function searches for and deletes bookings that match any of these criteria:
- `source="web"` AND `paymentMethod="online"`
- `paymentStatus="online_payment"`
- `createdBy.userId="web-client"`

It also deletes related payments for these bookings.

## Prerequisites

1. **Authentication**: The function requires user authentication
2. **Admin Privileges**: The authenticated user must be either:
   - A super admin (role="super_admin" in users collection)
   - An admin (email exists in admins collection)
3. **Firebase Setup**: Proper Firebase project configuration

## Testing Methods

### Method 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to your project > Functions
3. Find the `cleanupWebBookings` function
4. Click on it, then go to the "Testing" tab
5. Use empty data: `{}`
6. Click "Test the function"
7. View the results in the output panel

### Method 2: Node.js Test Script

Install dependencies first:
```bash
npm install firebase-functions-test
```

#### Check what data would be affected (Dry Run):
```bash
npm run test:cleanup:check
# or
node test-cleanup-web-bookings.js check
```

#### Run the actual function test:
```bash
npm run test:cleanup:run
# or
node test-cleanup-web-bookings.js test
```

**Important**: Before running the test script, update these values in `test-cleanup-web-bookings.js`:
- `projectId`: Your actual Firebase project ID
- `adminEmail`: Email of an admin user
- `adminUid`: UID of an admin user (optional)

### Method 3: curl/HTTP Request

First, get your ID token:
```bash
firebase auth:print-access-token
```

Then use the shell script:
```bash
./test-cleanup-curl.sh YOUR_ID_TOKEN_HERE
```

Or manual curl:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"data":{}}' \
  "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/cleanupWebBookings"
```

### Method 4: Firebase CLI Functions Shell

```bash
npm run shell
# In the shell:
cleanupWebBookings({})
```

Note: This method requires proper authentication setup in the shell environment.

## Configuration

Before testing, make sure to update these configuration values:

### In `test-cleanup-web-bookings.js`:
```javascript
const adminEmail = 'admin@example.com'; // Replace with actual admin email
const adminUid = 'admin-user-id'; // Replace with actual admin UID
// ...
admin.initializeApp({
  projectId: 'sports-booking-app', // Replace with your actual project ID
});
```

### In `test-cleanup-curl.sh`:
```bash
PROJECT_ID="sports-booking-app"  # Replace with your actual project ID
ADMIN_EMAIL="admin@example.com"  # Replace with actual admin email
```

## Expected Response

Successful response:
```json
{
  "success": true,
  "deletedBookings": 5,
  "deletedPayments": 3,
  "message": "Successfully deleted 5 web bookings and 3 related payments"
}
```

No data found:
```json
{
  "success": true,
  "deletedCount": 0,
  "message": "No web bookings found to delete"
}
```

## Error Handling

### Authentication Errors
- **unauthenticated**: User must be authenticated
- **permission-denied**: User doesn't have admin privileges

### Common Issues
1. **Function not found**: Check deployment status and function name
2. **Permission denied**: Verify user has admin role in database
3. **Invalid token**: Get a fresh ID token

## Viewing Logs

View function execution logs:
```bash
firebase functions:log --only cleanupWebBookings
```

View real-time logs:
```bash
firebase functions:log --only cleanupWebBookings --follow
```

## Safety Measures

1. **Dry Run First**: Always run the `check` command to see what data would be affected
2. **Backup**: Consider backing up data before running cleanup in production
3. **Test Environment**: Test in a development environment first
4. **Limited Scope**: The function only targets specific booking types

## Troubleshooting

### Service Account Issues
Make sure you have proper service account credentials:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
```

### Project ID Issues
Verify your project ID:
```bash
firebase projects:list
firebase use --list
```

### Permission Issues
Check user roles in Firestore:
- Users collection: Look for role="super_admin"
- Admins collection: Check if user email exists

## Files Created

1. `test-cleanup-web-bookings.js` - Main Node.js test script
2. `test-cleanup-curl.sh` - Shell script for HTTP testing
3. `CLEANUP_TESTING.md` - This documentation
4. Updated `package.json` with test scripts