const fs = require('fs');
const vaultClient = require('node-vault')({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });
  
  async function fetchSecrets() {
    const secret = await vaultClient.read('kv/data/avalanche-service/PRIVATE_KEY');
    console.log(secret.data.data.value);
    const content = `PRIVATE_KEY=${secret.data.data.value}\n`;
    fs.writeFileSync('.env', content);
  }
  
  fetchSecrets();
  