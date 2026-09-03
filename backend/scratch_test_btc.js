import { createSession, createChart, createSeries } from "@ch99q/twc";

async function test() {
  console.log("Creating session...");
  const session = await createSession();
  console.log("Creating chart...");
  const chart = await createChart(session);
  const symbol = await chart.resolve("BTCUSD", "COINBASE");
  console.log("Creating series (timeframe: 1)...");
  const series = await createSeries(session, chart, symbol, "1", 5);
  
  const latestHistoryTime = series.history[series.history.length - 1][0];
  console.log("Latest history time:", latestHistoryTime, new Date(latestHistoryTime * 1000).toLocaleString());

  console.log("Listening to 'du' events on session directly for 30 seconds...");
  
  session.on("du", (payload) => {
    if (!Array.isArray(payload) || payload[0] !== chart.id || typeof payload[1]?.[series.id] === "undefined") return;
    const data = payload[1][series.id].s.map((i) => i.v);
    for (const update of data) {
      const isSkipped = update[0] < latestHistoryTime;
      console.log(`[Direct DU] Time: ${update[0]} (${new Date(update[0]*1000).toLocaleTimeString()}), Close: ${update[4]}, Skipped: ${isSkipped}`);
    }
  });

  const timeout = setTimeout(async () => {
    console.log("Done.");
    await series.close();
    await chart.close();
    await session.close();
    process.exit(0);
  }, 30000);
}

test().catch(err => {
  console.error("Test error:", err);
});
