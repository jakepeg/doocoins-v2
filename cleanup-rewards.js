// Script to cleanup duplicate and archived rewards
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./src/declarations/backend/backend.did.js";
import fetch from "node-fetch";

// Replace with your actual child ID
const CHILD_ID = process.argv[2];

if (!CHILD_ID) {
  console.error("Usage: node cleanup-rewards.js <childId>");
  console.error("Example: node cleanup-rewards.js rdmx6-jaaaa-aaaaa-aaadq-cai-1");
  process.exit(1);
}

const canisterId = "f5cpb-qyaaa-aaaah-qdbeq-cai"; // backend canister

async function cleanup() {
  const agent = new HttpAgent({
    host: "https://icp0.io",
    fetch,
  });

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  console.log(`🧹 Cleaning up rewards for child: ${CHILD_ID}`);
  
  try {
    const result = await actor.cleanupGoals(CHILD_ID);
    console.log("✅ Result:", result);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

cleanup();
