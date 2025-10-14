#!/bin/bash

# V2 Frontend Migration Test Script
echo "🧪 Testing V2 Frontend Migration Flow"
echo "====================================="

# Build and start the frontend
echo "📦 Building and starting V2 frontend..."

# Generate backend declarations first
dfx generate backend

# Build frontend
cd src/frontend && npm run build && cd ../..

# Deploy frontend
dfx deploy frontend

echo ""
echo "✅ V2 Frontend deployed with migration handling!"
echo ""
echo "🧪 Manual Testing Instructions:"
echo "================================"
echo ""
echo "1. **Test Automatic Migration:**"
echo "   - Open browser dev console"
echo "   - Run: localStorage.setItem('nfidPrincipal', 'fmyfu-zlkw6-iiv2q-ljj34-2d5ye-xehgs-qddl7-ys4au-i5ohq-pxco6-jqe')"
echo "   - Run: localStorage.setItem('needsMigration', 'true')"
echo "   - Refresh page"
echo "   - Login with Internet Identity"
echo "   - Should show migration process"
echo ""
echo "2. **Test Manual Migration Modal:**"
echo "   - Clear localStorage: localStorage.clear()"
echo "   - Refresh and login with II"
echo "   - Should see manual migration modal"
echo "   - Enter NFID principal and test migration"
echo ""
echo "3. **Test Migration Skip:**"
echo "   - Click 'Skip for Now' in modal"
echo "   - Should proceed to main app"
echo "   - Modal shouldn't appear again"
echo ""
echo "4. **Test Error Handling:**"
echo "   - Try invalid principal format"
echo "   - Try principal with no data"
echo "   - Should show appropriate errors"
echo ""
echo "🌐 Frontend URL: http://localhost:4943/?canisterId=$(dfx canister id frontend)"
echo "🔧 Candid UI: http://localhost:4943/?canisterId=u6s2n-gx777-77774-qaaba-cai&id=$(dfx canister id backend)"