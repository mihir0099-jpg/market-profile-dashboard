import { TradingViewBridge } from './tradingview.js';

const testSymbols = [
  'MCX:CRUDEOILQ2026',
  'MCX:CRUDEOIL',
  'TVC:USOIL',
  'NYMEX:CL1!',
  'CAPITALCOM:OIL_CRUDE',
  'BLACKBULL:WTI',
  'OANDA:WTICOUSD'
];

async function runTests() {
  for (const sym of testSymbols) {
    console.log(`\n================ Testing ${sym} ================`);
    const bridge = new TradingViewBridge();
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log(`[TIMEOUT] ${sym} timed out`);
          resolve();
        }, 6000);

        bridge.subscribeSymbol(sym, '30', (data) => {
          clearTimeout(timeout);
          console.log(`[SUCCESS] ${sym} received ${data.candles?.length} candles! Last close: ${data.candles?.[data.candles.length - 1]?.close}`);
          resolve();
        }, (err) => {
          clearTimeout(timeout);
          console.log(`[FAILED] ${sym}: ${err.message || err}`);
          resolve();
        }, 100);
      });
    } catch (e) {
      console.log(`[EXCEPTION] ${sym}: ${e.message}`);
    }
  }
  process.exit(0);
}

runTests();
