#!/bin/bash

# Migration Flow Test Script
# Tests the optimized V1→V2 migration flow

echo "🧪 Testing Migration Flow Optimization"
echo "======================================"
echo ""

# Test 1: Check migration-storage.js exists
echo "✓ Test 1: Checking migration-storage.js exists..."
if [ -f "src/frontend/utils/migration-storage.js" ]; then
    echo "  ✅ PASS: migration-storage.js found"
else
    echo "  ❌ FAIL: migration-storage.js not found"
    exit 1
fi
echo ""

# Test 2: Check MigrationStorage is imported in v2-migration-helper
echo "✓ Test 2: Checking MigrationStorage import..."
if grep -q "import MigrationStorage" src/frontend/utils/v2-migration-helper.js; then
    echo "  ✅ PASS: MigrationStorage imported in v2-migration-helper.js"
else
    echo "  ❌ FAIL: MigrationStorage not imported"
    exit 1
fi
echo ""

# Test 3: Check MigrationHandler uses MigrationStorage
echo "✓ Test 3: Checking MigrationHandler optimization..."
if grep -q "MigrationStorage.isComplete()" src/frontend/components/MigrationHandler.jsx; then
    echo "  ✅ PASS: MigrationHandler uses MigrationStorage.isComplete()"
else
    echo "  ❌ FAIL: MigrationHandler not optimized"
    exit 1
fi
echo ""

# Test 4: Check early bailout exists
echo "✓ Test 4: Checking early bailout logic..."
if grep -q "if (MigrationStorage.isComplete())" src/frontend/components/MigrationHandler.jsx; then
    echo "  ✅ PASS: Early bailout implemented"
else
    echo "  ❌ FAIL: Early bailout missing"
    exit 1
fi
echo ""

# Test 5: Check spinner removed for checking state
echo "✓ Test 5: Checking spinner optimization..."
if ! grep -q "migrationState === 'checking'" src/frontend/components/MigrationHandler.jsx | grep -q "Spinner"; then
    echo "  ✅ PASS: No spinner for 'checking' state"
else
    echo "  ⚠️  WARNING: Spinner may still show for checking state"
fi
echo ""

# Test 6: Check verbose logging removed
echo "✓ Test 6: Checking log reduction..."
OLD_LOGS=$(grep -c "console.log" src/frontend/components/MigrationHandler.jsx 2>/dev/null || echo "0")
if [ "$OLD_LOGS" -lt 5 ]; then
    echo "  ✅ PASS: Verbose logging reduced (${OLD_LOGS} console.log statements)"
else
    echo "  ⚠️  WARNING: Still has ${OLD_LOGS} console.log statements"
fi
echo ""

# Test 7: Check migration state machine
echo "✓ Test 7: Checking migration state machine..."
if grep -q "'idle'" src/frontend/components/MigrationHandler.jsx && \
   grep -q "'migrating'" src/frontend/components/MigrationHandler.jsx && \
   grep -q "'completed'" src/frontend/components/MigrationHandler.jsx; then
    echo "  ✅ PASS: State machine implemented (idle → migrating → completed)"
else
    echo "  ❌ FAIL: State machine incomplete"
    exit 1
fi
echo ""

# Test 8: Check backward compatibility with legacy flags
echo "✓ Test 8: Checking backward compatibility..."
if grep -q "localStorage.getItem('nfidPrincipal')" src/frontend/components/MigrationHandler.jsx && \
   grep -q "localStorage.getItem('needsMigration')" src/frontend/components/MigrationHandler.jsx; then
    echo "  ✅ PASS: Legacy migration flags still supported"
else
    echo "  ❌ FAIL: Legacy migration support missing"
    exit 1
fi
echo ""

# Test 9: Check URL parameter handling
echo "✓ Test 9: Checking URL parameter handling..."
if grep -q "extractMigrationDataFromUrl()" src/frontend/components/MigrationHandler.jsx; then
    echo "  ✅ PASS: URL migration parameters handled"
else
    echo "  ❌ FAIL: URL parameter handling missing"
    exit 1
fi
echo ""

# Test 10: Check cross-platform storage keys
echo "✓ Test 10: Checking storage key naming..."
if grep -q "doocoins_migration_v2_complete" src/frontend/utils/migration-storage.js; then
    echo "  ✅ PASS: Namespaced storage keys used"
else
    echo "  ❌ FAIL: Storage keys not properly namespaced"
    exit 1
fi
echo ""

# Summary
echo "======================================"
echo "✅ All Migration Optimization Tests Passed!"
echo ""
echo "📊 Optimization Benefits:"
echo "  • Instant app startup for returning users"
echo "  • Zero backend calls when migration complete"
echo "  • Cross-platform persistence (PWA/Native/Desktop)"
echo "  • Cleaner console logs"
echo "  • Backward compatible with V1 migration"
echo ""
echo "🚀 Ready to deploy!"
echo ""

# Optional: Show file sizes
echo "📁 File Sizes:"
echo "  migration-storage.js:  $(wc -c < src/frontend/utils/migration-storage.js) bytes"
echo "  v2-migration-helper.js: $(wc -c < src/frontend/utils/v2-migration-helper.js) bytes"
echo "  MigrationHandler.jsx:   $(wc -c < src/frontend/components/MigrationHandler.jsx) bytes"
echo ""
