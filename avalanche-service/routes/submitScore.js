require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const tournamentAbi =
  require("../artifacts/contracts/score.sol/Tournament.json").abi;

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
);

let wallet;
if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.trim() !== "") {
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("✅ Wallet loaded from environment");
} else {
  console.log(`📝 Wallet info saved to `);
}

const contractConfigPath = path.join(__dirname, "../config/contract.json");
const contract = JSON.parse(fs.readFileSync(contractConfigPath, "utf-8"));
const contractAddress = contract.contractAddress;

const tournament = new ethers.Contract(contractAddress, tournamentAbi, wallet);

const activeTxs = new Set();
const txQueue = [];
let txProcessing = false;

// Track nonce state more carefully
let nonceCache = {
  value: null,
  lastUpdated: 0,
  CACHE_TTL: 5000, // 5 seconds
};

function queueTx(fn) {
  return new Promise((resolve, reject) => {
    txQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function getSafeNonce(forceRefresh = false) {
  const now = Date.now();

  if (
    forceRefresh ||
    nonceCache.value === null ||
    now - nonceCache.lastUpdated > nonceCache.CACHE_TTL
  ) {
    try {
      const [pendingNonce, latestNonce] = await Promise.all([
        wallet.getNonce("pending"),
        wallet.getNonce("latest"),
      ]);

      nonceCache.value = Math.max(pendingNonce, latestNonce);
      nonceCache.lastUpdated = now;

      console.log(
        `🔄 Refreshed nonce: ${nonceCache.value} (pending: ${pendingNonce}, latest: ${latestNonce})`
      );
    } catch (error) {
      console.error("Failed to get nonce:", error);
      if (nonceCache.value === null) {
        throw error;
      }
    }
  }

  return nonceCache.value++;
}

function resetNonceCache() {
  nonceCache.value = null;
  nonceCache.lastUpdated = 0;
  console.log("🔄 Nonce cache reset");
}

async function processQueue() {
  if (txProcessing || txQueue.length === 0) return;
  txProcessing = true;

  const { fn, resolve, reject } = txQueue.shift();
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      const result = await fn();
      resolve(result);
      break;
    } catch (err) {
      console.error(
        `Transaction attempt ${retryCount + 1} failed:`,
        err.message
      );

      if (
        err.code === "NONCE_EXPIRED" ||
        err.code === "REPLACEMENT_UNDERPRICED" ||
        err.message.includes("nonce too low") ||
        err.message.includes("nonce has already been used")
      ) {
        resetNonceCache();
        retryCount++;

        if (retryCount <= maxRetries) {
          console.log(
            `🔄 Retrying transaction (${retryCount}/${maxRetries}) after nonce error`
          );
          await wait(1000 * retryCount);
          continue;
        }
      }
      reject(err);
      break;
    }
  }

  txProcessing = false;
  processQueue();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tournamentRoute(fastify) {
  fastify.post("/submitScore", async (request, reply) => {
    const { tournamentId, position, playerId, score } = request.body;
    const key = `${tournamentId}-${playerId}-${position}`;

    console.log(
      "BLOCKCHAIN_SUBMITSCORE_DEBUG",
      tournamentId,
      position,
      playerId,
      score
    );

    if (activeTxs.has(key)) {
      return reply.status(429).send({
        error: "A transaction is already in progress for this player",
      });
    }

    activeTxs.add(key);

    try {
      const tx = await queueTx(async () => {
        const nonce = await getSafeNonce();

        console.log(`📤 Submitting transaction with nonce: ${nonce}`);

        return await tournament.submitScore(
          tournamentId,
          position,
          playerId,
          score,
          {
            nonce,
            gasLimit: 300000,
            maxPriorityFeePerGas: ethers.parseUnits("4", "gwei"),
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
          }
        );
      });

      console.log(`⏳ Transaction submitted: ${tx.hash}`);

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), 60000)
        ),
      ]);

      console.log("✅ Confirmed:");

      await wait(2000);

      reply.send({
        message: "Transaction confirmed",
        txHash: receipt.transactionHash,
      });
    } catch (err) {
      console.error("❌ Failed to submit:", err);

      if (
        err.code === "NONCE_EXPIRED" ||
        err.message.includes("nonce too low") ||
        err.message.includes("nonce has already been used")
      ) {
        resetNonceCache();
      }

      reply
        .status(500)
        .send({
          error: err.shortMessage || err.message || "Failed to submit score",
        });
    } finally {
      activeTxs.delete(key);
    }
  });

  setInterval(() => {
    if (Date.now() - nonceCache.lastUpdated > nonceCache.CACHE_TTL * 2) {
      resetNonceCache();
    }
  }, 30000);

  fastify.post("/getscores", async (request, reply) => {
    try {
      const { tournamentId } = request.body;
      const positions = [
        "1L1vs1R1",
        "1L2vs1R2",
        "1L3vs1R3",
        "1L4vs1R4",
        "2L1vs2R1",
        "2L2vs2R2",
        "3L1vs3R1",
        "WINNER",
      ];

      const result = {};

      for (const position of positions) {
        const scores = await tournament.getScores(tournamentId, position);
        console.log("Position", position);
        result[position] = scores.map((entry) => ({
          [entry.playerId.toString()]: Number(entry.score),
        }));
        console.log("score", result[position]);
      }

      reply.send(result);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ error: "Failed to fetch scores" });
    }
  });

  (async () => {
    try {
      await fastify.listen({ port: 3000 });
      console.log("Server running at http://localhost:3000");
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  })();
}

module.exports = tournamentRoute;
