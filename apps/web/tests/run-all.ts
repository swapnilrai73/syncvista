/**
 * Unified Test Runner for apps/web.
 * Executes all web unit test suites:
 * 1. utils.test.ts (classnames, INR formatting, date helpers, categories, auth zod schema & PAN regex)
 * 2. analytics.test.ts (credit classification, financial health, subscriptions, anomalies, net worth, cash flow)
 * 3. bank-logic.test.ts (account validation, ₹0 balance preservation, nullish coalescing)
 * 4. chat-compliance.test.ts (system prompt SEBI compliance, deterministic system of record, arithmetic bounds)
 */

import { runSuites } from "./test-utils";

// Import all test suites to register their describe/it blocks
import "./utils.test";
import "./analytics.test";
import "./bank-logic.test";
import "./chat-compliance.test";

async function main() {
  console.log("=================================================");
  console.log("       SyncVista apps/web Unit Test Suite        ");
  console.log("=================================================");

  const startTime = Date.now();
  const { total, passed, failed } = await runSuites();
  const duration = Date.now() - startTime;

  console.log("\n-------------------------------------------------");
  if (failed === 0) {
    console.log(
      `\x1b[32m\x1b[1mSummary: ${passed}/${total} passed (0 failed) in ${duration}ms\x1b[0m`
    );
    console.log("-------------------------------------------------\n");
    process.exit(0);
  } else {
    console.log(
      `\x1b[31m\x1b[1mSummary: ${passed}/${total} passed (${failed} failed) in ${duration}ms\x1b[0m`
    );
    console.log("-------------------------------------------------\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner execution failed:", err);
  process.exit(1);
});
