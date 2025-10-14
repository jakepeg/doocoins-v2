#!/bin/bash

echo "🚀 **MAINNET V1→V2 Migration Testing Guide**"
echo "============================================"

echo ""
echo "📦 **Deployment Status:**"
echo "✅ V2 Backend: f5cpb-qyaaa-aaaah-qdbeq-cai"
echo "✅ V2 Frontend: https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/"
echo "🔄 V1 Frontend: https://fube5-gqaaa-aaaah-qdbfa-cai.icp0.io/ (needs V1 update)"

echo ""
echo "🧪 **Testing Scenarios:**"
echo ""

# Example NFID principal for testing
TEST_NFID="rdmx6-jaaaa-aaaaa-aaadq-cai"  # Replace with actual NFID principal

echo "1. **Test V2 Standalone (No Migration):**"
echo "   URL: https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/"
echo "   Expected: Login with II → Empty child list → 'Go to V1 to upgrade' button"
echo ""

echo "2. **Test V2 URL Parameter Migration:**"
echo "   URL: https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/?migrate=true&nfid=$TEST_NFID"
echo "   Expected: Parameters preserved → Login redirect → Automatic migration after auth"
echo ""

echo "3. **Test V1→V2 Integration (After V1 Update):**"
echo "   - Go to V1: https://fube5-gqaaa-aaaah-qdbfa-cai.icp0.io/"
echo "   - Login with NFID"
echo "   - Click 'Upgrade to V2' button"
echo "   - Expected: Redirect to V2 with migration parameters"
echo ""

echo "🔧 **Debug Tools:**"
echo ""
echo "# Check mainnet migration status:"
echo "dfx canister call f5cpb-qyaaa-aaaah-qdbeq-cai getMigrationStatus --network ic"
echo ""
echo "# Test principal linking (replace with actual principals):"
echo "dfx canister call f5cpb-qyaaa-aaaah-qdbeq-cai linkPrincipals '(principal \"NFID_PRINCIPAL\", principal \"II_PRINCIPAL\")' --network ic"
echo ""

echo "📋 **V1 Integration Code Needed:**"
echo ""
cat << 'EOF'
// Add this to V1 frontend upgrade button
const handleUpgradeToV2 = () => {
  // Get current NFID principal from your auth system
  const nfidPrincipal = getCurrentUserPrincipal(); // Your existing function
  
  // Redirect to V2 mainnet with migration parameters
  const v2Url = `https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/?migrate=true&nfid=${encodeURIComponent(nfidPrincipal)}`;
  window.location.href = v2Url;
};

// Update your upgrade button
<button onClick={handleUpgradeToV2}>
  Upgrade to DooCoins V2
</button>
EOF

echo ""
echo "🎯 **Next Steps:**"
echo "1. Test V2 mainnet functionality at: https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/"
echo "2. Update V1 frontend with redirect code above"
echo "3. Deploy V1 updates to mainnet"  
echo "4. Test complete V1→V2 migration flow"
echo ""

echo "✅ **V2 Ready for Testing!** 🚀"