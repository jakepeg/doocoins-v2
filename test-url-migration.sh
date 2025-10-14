#!/bin/bash

echo "🧪 Testing URL-Based Migration Integration"
echo "========================================"

# Get canister IDs
FRONTEND_ID=$(dfx canister id frontend)
BACKEND_ID=$(dfx canister id backend)

echo "📦 Frontend Canister: $FRONTEND_ID"
echo "🔧 Backend Canister: $BACKEND_ID"

echo ""
echo "🌐 Testing URLs:"
echo "================================"

# Test URL with migration parameters
TEST_NFID_PRINCIPAL="fmyfu-zlkw6-iiv2q-ljj34-2d5ye-xehgs-qddl7-ys4au-i5ohq-pxco6-jqe"
MIGRATION_URL="http://localhost:4943/?canisterId=$FRONTEND_ID&migrate=true&nfid=$TEST_NFID_PRINCIPAL"

echo ""
echo "1. 🧪 **Test Automatic Migration from V1:**"
echo "   $MIGRATION_URL"
echo ""
echo "   Expected behavior:"
echo "   - URL parameters detected and stored in localStorage"
echo "   - Redirected to /login for authentication" 
echo "   - After login, migration parameters retrieved from localStorage"
echo "   - Shows 'Migrating your data from NFID to Internet Identity...'"
echo "   - Should link principals automatically and show success message"
echo ""

echo "2. 🧪 **Test Normal V2 Usage (no migration):**"
echo "   http://localhost:4943/?canisterId=$FRONTEND_ID"
echo ""
echo "   Expected behavior:"
echo "   - Login with Internet Identity"
echo "   - Should show empty child list with 'Go to V1 to upgrade' option"
echo "   - Link redirects to V1 frontend for upgrade process"
echo ""

echo "3. 🧪 **Test V1 Upgrade Instructions:**"
echo "   - Use normal URL with empty child list"
echo "   - Should show 'Go to V1 to upgrade' button"
echo "   - Button should link to: https://fube5-gqaaa-aaaah-qdbfa-cai.icp0.io"
echo ""

echo "4. 🧪 **Test V1 → V2 Flow Simulation:**"
echo "   In V1 project, redirect users to:"
echo "   https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/?migrate=true&nfid=USER_NFID_PRINCIPAL"
echo ""

echo "🔧 **Testing Commands:**"
echo "========================"
echo ""
echo "# Check migration status via backend:"
echo "dfx canister call $BACKEND_ID getMigrationStatus"
echo ""
echo "# Check if principals are linked:"
echo "dfx canister call $BACKEND_ID linkPrincipals '(principal \"$TEST_NFID_PRINCIPAL\", principal \"$(dfx identity get-principal)\")'"
echo ""
echo "🛠️ **Debug Migration Flow:**"
echo "1. Open browser console before testing"
echo "2. Look for: 'Migration parameters detected and preserved for post-auth processing'"
echo "3. Check localStorage for 'pendingMigration' key"
echo "4. After login, look for: 'Migration detected for NFID: [principal]'"
echo ""

echo "📋 **V1 Integration Code for Copilot:**"
echo "====================================="
echo ""
cat << 'EOF'
// V1 Frontend - Add this redirect logic
const handleUpgradeToV2 = () => {
  // Get current NFID principal (from your auth system)
  const nfidPrincipal = getCurrentNFIDPrincipal(); // Your existing function
  
  // Redirect to V2 with migration parameters
  const v2Url = `https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/?migrate=true&nfid=${encodeURIComponent(nfidPrincipal)}`;
  window.location.href = v2Url;
};

// Add to your UpgradeNotice component's "Upgrade Now" button
<button onClick={handleUpgradeToV2}>
  Upgrade Now
</button>
EOF

echo ""
echo "✅ V2 is ready for URL-based migration!"
echo "🔄 Next: Implement V1 redirect with the code above"