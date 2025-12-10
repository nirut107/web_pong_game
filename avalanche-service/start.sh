#!/bin/sh
node /app/scripts/fetch-vault-secrets.js
npx hardhat compile
npx hardhat run scripts/deploy.js --network fuji
node /app/index.js
