#!/bin/bash

# Complete migration test - simulates the actual migration flow
echo "🧪 Complete Migration Flow Test"
echo "=============================="

# Get current principal (this will be our "II" principal)
II_PRINCIPAL=$(dfx identity get-principal)
echo "Current Identity (simulating II): $II_PRINCIPAL"

# Create a new identity to simulate NFID user
echo ""
echo "📝 Creating mock NFID identity..."
dfx identity new nfid_mock --storage-mode=plaintext || echo "Identity already exists"
dfx identity use nfid_mock
NFID_PRINCIPAL=$(dfx identity get-principal)
echo "Mock NFID Principal: $NFID_PRINCIPAL"

# Create test data as NFID user
echo ""
echo "🏗️ Creating test data as NFID user..."
dfx canister call backend createChild '(record { name = "Test Child" })' || echo "Child creation may require different parameters"

# Check what data exists for NFID user
echo ""
echo "🔍 Checking NFID user data..."
dfx canister call backend getChildren || echo "No children found or different method name"
dfx canister call backend getMigrationStatus

# Switch back to II identity
echo ""
echo "🔄 Switching to Internet Identity..."
dfx identity use default
echo "Current Identity (II): $(dfx identity get-principal)"

# Check migration status for II user (should be not linked)
echo ""
echo "🔍 Checking II migration status (should be not linked)..."
dfx canister call backend getMigrationStatus

# Try to link the principals
echo ""
echo "🔗 Attempting to link NFID to II..."
echo "NFID: $NFID_PRINCIPAL"  
echo "II: $II_PRINCIPAL"
dfx canister call backend linkPrincipals "(principal \"$NFID_PRINCIPAL\", principal \"$II_PRINCIPAL\")"

# Check migration status after linking
echo ""
echo "🔍 Checking migration status after linking..."
dfx canister call backend getMigrationStatus

# Test data access through migration
echo ""
echo "📊 Testing data access through migration..."
dfx canister call backend getChildrenWithMigration

echo ""
echo "✅ Migration test complete!"
echo "💾 To clean up: dfx identity remove nfid_mock"