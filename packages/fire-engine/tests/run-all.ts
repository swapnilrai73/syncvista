import { runSuites } from "./test-utils";

// Import all test suites
import "./corpus.test";
import "./monte-carlo.test";
import "./debt-engine.test";
import "./tax-harvest.test";
import "./safety-net.test";
import "./instrument-hub.test";
import "./presenter.test";

async function main() {
  console.log("=================================================");
  console.log("   SyncVista FIRE Engine Unit Test Suite (P0)    ");
  console.log("=================================================");

  const startTime = Date.now();
  const { total, passed, failed } = await runSuites();
  const elapsed = Date.now() - startTime;

  console.log("\n-------------------------------------------------");
  console.log(`Summary: ${passed}/${total} passed (${failed} failed) in ${elapsed}ms`);
  console.log("-------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
