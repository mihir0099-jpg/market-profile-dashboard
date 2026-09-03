import { createSession, createChart, createSeries } from "@ch99q/twc";

async function test() {
  console.log("Creating session...");
  const session = await createSession();
  console.log("Creating chart...");
  const chart = await createChart(session);
  
  console.log("Resolving symbol AAPL...");
  const symbol = await chart.resolve("AAPL", "NASDAQ");
  console.log("Symbol resolved:", symbol);

  console.log("Creating series (timeframe: 1D)...");
  const series = await createSeries(session, chart, symbol, "1D", 10);
  
  console.log("Series keys:", Object.keys(series));
  console.log("Series data:", series.data);
  console.log("Series candles:", series.candles);

  console.log("Starting stream for a few seconds...");
  setTimeout(async () => {
    console.log("Closing series...");
    await series.close();
    console.log("Closing session...");
    await session.close();
    process.exit(0);
  }, 10000);

  for await (const update of series.stream()) {
    console.log("Stream update:", update);
    console.log("Update keys:", Object.keys(update));
  }
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
