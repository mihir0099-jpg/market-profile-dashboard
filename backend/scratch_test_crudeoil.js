import { TradingViewBridge } from './tradingview.js';

async function test() {
  console.log("Testing MCX:CRUDEOIL1! via TradingViewBridge...");
  const bridge = new TradingViewBridge();
  const unsub = await bridge.subscribeSymbol('MCX:CRUDEOIL1!', '30', (data) => {
    console.log("Data received:", data.type, "Candles count:", data.candles?.length, "Last candle:", data.candles?.[data.candles.length - 1]);
    process.exit(0);
  }, (err) => {
    console.error("Subscription error:", err);
    process.exit(1);
  }, 100);
}

test().catch(err => {
  console.error("Error testing MCX:CRUDEOIL1!:", err);
  process.exit(1);
});
