#!/bin/bash

# Test script for cleanupWebBookings Cloud Function using curl
# This script demonstrates how to call the function via HTTPS

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Cloud Function Test Script for cleanupWebBookings${NC}"
echo "=================================================="

# Configuration - UPDATE THESE VALUES
PROJECT_ID="sports-booking-app"  # Replace with your actual project ID
REGION="europe-west1"
FUNCTION_NAME="cleanupWebBookings"
ADMIN_EMAIL="admin@example.com"  # Replace with actual admin email

# Function URL
FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"

echo -e "\n${YELLOW}📋 Configuration:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Function: $FUNCTION_NAME"
echo "Admin Email: $ADMIN_EMAIL"
echo "Function URL: $FUNCTION_URL"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "\n${RED}❌ Firebase CLI is not installed${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo -e "\n${BLUE}🔐 Authentication Steps:${NC}"
echo "1. Make sure you're logged in to Firebase CLI:"
echo "   firebase login"
echo ""
echo "2. Get your ID token by running this command:"
echo "   firebase auth:print-access-token"
echo ""

# Check if user provided an ID token
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  No ID token provided${NC}"
    echo ""
    echo "Usage: $0 <ID_TOKEN>"
    echo ""
    echo "To get your ID token, run:"
    echo "  firebase auth:print-access-token"
    echo ""
    echo "Then run this script with the token:"
    echo "  $0 ya29.your-id-token-here"
    echo ""
    echo -e "${BLUE}💡 Alternative: Test via Firebase Console${NC}"
    echo "1. Go to Firebase Console > Functions"
    echo "2. Find 'cleanupWebBookings' function"
    echo "3. Click 'Test' tab"
    echo "4. Use empty data: {}"
    echo "5. Click 'Test the function'"
    exit 1
fi

ID_TOKEN="$1"

echo -e "\n${BLUE}🚀 Calling Cloud Function...${NC}"

# Make the request
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{"data":{}}' \
  "$FUNCTION_URL")

# Parse response and status code
HTTP_BODY=$(echo "$RESPONSE" | sed -n '1,/HTTP_STATUS/p' | sed 's/HTTP_STATUS.*//')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

echo -e "\n${BLUE}📡 Response Details:${NC}"
echo "HTTP Status: $HTTP_STATUS"
echo "Response Body:"
echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"

# Interpret the response
case $HTTP_STATUS in
    200)
        echo -e "\n${GREEN}✅ Success! Function executed successfully${NC}"
        ;;
    401)
        echo -e "\n${RED}❌ Authentication failed${NC}"
        echo "Check your ID token or admin permissions"
        ;;
    403)
        echo -e "\n${RED}❌ Permission denied${NC}"
        echo "Make sure the authenticated user has admin privileges"
        ;;
    404)
        echo -e "\n${RED}❌ Function not found${NC}"
        echo "Check the function name and deployment status"
        ;;
    500)
        echo -e "\n${RED}❌ Internal server error${NC}"
        echo "Check Firebase Functions logs for details"
        ;;
    *)
        echo -e "\n${YELLOW}⚠️  Unexpected status code: $HTTP_STATUS${NC}"
        ;;
esac

echo -e "\n${BLUE}🔍 Additional Commands:${NC}"
echo "View function logs:"
echo "  firebase functions:log --only $FUNCTION_NAME"
echo ""
echo "Check function status:"
echo "  firebase functions:list | grep $FUNCTION_NAME"
echo ""
echo "Test via Firebase Console:"
echo "  https://console.firebase.google.com/project/$PROJECT_ID/functions/list"