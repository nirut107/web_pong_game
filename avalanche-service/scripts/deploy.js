const fs = require("fs");
const hre = require("hardhat");
const path = require("path");

async function main() {
  const Tournament = await hre.ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy();
  await tournament.waitForDeployment();

  const contractAddress = tournament.target;
  console.log("✅ Contract deployed to:", contractAddress);

  const config = { contractAddress };
  fs.writeFileSync(
    path.join(__dirname, "../config/contract.json"),
    JSON.stringify(config, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
