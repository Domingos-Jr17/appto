import { runWorkerPass } from "../src/lib/worker-scheduler";

const shouldLoop = process.argv.includes("--loop");
const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 15_000);

async function run() {
  const results = await runWorkerPass();
  console.log(JSON.stringify(results, null, 2));
  return results;
}

if (!shouldLoop) {
  void run().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  const loop = async () => {
    try {
      await run();
    } catch (error) {
      console.error("[worker] pass failed", error);
    }
  };

  void loop();
  setInterval(loop, intervalMs);
  console.log(`[worker] running in loop mode with ${intervalMs}ms interval`);
}
