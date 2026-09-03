import { TradingViewBridge } from './tradingview.js';

function calculateDiagnostics(candles) {
  const groups = {};
  for (const c of candles) {
    const date = new Date(c.time * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(c);
  }
  
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const activeDate = sortedDates[0];
  const priorDate = sortedDates[1];
  
  const activeCandles = groups[activeDate];
  
  let high = -Infinity;
  let low = Infinity;
  activeCandles.forEach(c => {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  });
  
  console.log(`\n===================================================`);
  console.log(`📈 DIAGNOSTIC LIVE PROFILE DATA FOR NSE:NIFTY`);
  console.log(`===================================================`);
  console.log(`Active Session Date : ${activeDate}`);
  console.log(`Open Price          : ${activeCandles[0].open.toFixed(2)}`);
  console.log(`Session High        : ${high.toFixed(2)}`);
  console.log(`Session Low         : ${low.toFixed(2)}`);
  console.log(`Last Candle Close   : ${activeCandles[activeCandles.length - 1].close.toFixed(2)}`);
  console.log(`Total Candles Today : ${activeCandles.length}`);
  console.log(`===================================================`);
  if (priorDate) {
    console.log(`Prior Session Date  : ${priorDate}`);
  }
  console.log(`===================================================\n`);
}

async function run() {
  console.log("Connecting to TradingView Bridge...");
  const bridge = new TradingViewBridge();
  
  // Timeout safety
  const safetyTimeout = setTimeout(() => {
    console.log("❌ Timeout waiting for TradingView data snapshot.");
    process.exit(1);
  }, 10000);

  await bridge.subscribeSymbol("NSE:NIFTY", "30", (data) => {
    if (data.isSnapshot) {
      clearTimeout(safetyTimeout);
      console.log(`✅ Received snapshot of ${data.candles.length} candles.`);
      calculateDiagnostics(data.candles);
      process.exit(0);
    }
  }, (err) => {
    clearTimeout(safetyTimeout);
    console.error("❌ Subscription error:", err);
    process.exit(1);
  });
}

run().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
