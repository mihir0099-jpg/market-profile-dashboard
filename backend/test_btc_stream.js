import { TradingViewBridge } from './tradingview.js';

const bridge = new TradingViewBridge();
console.log('[Test BTC Stream] Initiating stream to BINANCE:BTCUSD...');

let cleanup = null;
let tickCount = 0;

const timeout = setTimeout(() => {
  console.log(`[Test BTC Stream] Finished 15s test. Ticks received: ${tickCount}`);
  if (cleanup) cleanup();
  process.exit(0);
}, 15000);

bridge.subscribeSymbol('BINANCE:BTCUSD', '30', (data) => {
  if (data.isSnapshot) {
    console.log(`[Test BTC Stream] Snapshot loaded. Candles: ${data.candles.length}`);
    console.log('Snapshot latest close:', data.candles[data.candles.length - 1].close);
  } else {
    tickCount++;
    console.log(`[Test BTC Stream] Live Tick #${tickCount}:`, data.candles[0]);
  }
}, (err) => {
  console.error('[Test BTC Stream] Error:', err);
  clearTimeout(timeout);
  process.exit(1);
}).then(cleanupFn => {
  cleanup = cleanupFn;
}).catch(err => {
  console.error('[Test BTC Stream] Subscription failed:', err);
  clearTimeout(timeout);
  process.exit(1);
});
