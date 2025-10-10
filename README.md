# DooCoins V2

A modern kids rewards app built on the Internet Computer with Internet Identity authentication.

## Features

- 🔐 **Internet Identity Auth** - Social login with Google, Apple, Email, Passkeys
- 👨‍👩‍👧‍👦 **Family Management** - Parents create children profiles and manage rewards
- 🪙 **Virtual Currency** - Parent-controlled DooCoins economy
- 📱 **Dual Apps** - Separate parent and kids interfaces
- 🔄 **Migration Ready** - Import data from DooCoins V1

## Quick Start

```bash
# Install dependencies
npm install

# Start local IC replica
dfx start --background --clean

# Deploy canisters
dfx deploy

# Start development server
npm start          # Parent app at http://localhost:5173
npm run startkids  # Kids app at http://localhost:5174
```

## Migration from V1

If you're upgrading from DooCoins V1 (NFID version), use the migration feature to transfer your family's data.

## Tech Stack

- **Backend**: Motoko on Internet Computer
- **Frontend**: React + Chakra UI
- **Auth**: Internet Identity
- **Build**: Webpack + Vite

## Development

- `npm run build` - Build parent app
- `npm run buildkids` - Build kids app
- `dfx generate backend` - Generate type declarations
