import { createSession, createChart } from "@ch99q/twc";

async function test() {
  console.log("Creating session...");
  const session = await createSession();
  console.log("Creating chart...");
  const chart = await createChart(session);
  
  const testCases = [
    { name: "BANKNIFTY", exchange: "NSE" },
    { name: "NIFTYBANK", exchange: "NSE" },
    { name: "CNXBANK", exchange: "NSE" },
    { name: "NIFTY_BANK", exchange: "NSE" }
  ];

  for (const tc of testCases) {
    try {
      console.log(`Resolving ${tc.name} on ${tc.exchange}...`);
      const symbol = await chart.resolve(tc.name, tc.exchange);
      console.log(`✅ Success for ${tc.name}:`, symbol);
    } catch (e) {
      console.log(`❌ Failed for ${tc.name}:`, e.message || e);
    }
  }

  await session.close();
  process.exit(0);
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
