import { TradingViewBridge } from './tradingview.js';

async function checkTodayLive() {
  const bridge = new TradingViewBridge();
  console.log('Connecting to TradingView WebSocket to fetch today\'s live results...');

  const symbols = ['NSE:NIFTY', 'NSE:BANKNIFTY', 'NSE:HDFCBANK'];
  
  for (const sym of symbols) {
    try {
      await new Promise((resolve, reject) => {
        let resolved = false;
        bridge.subscribeSymbol(sym, '30', (data) => {
          if (data.isSnapshot && !resolved) {
            resolved = true;
            
            // Filter candles for today (2026-07-06)
            const todayStr = '2026-07-06';
            const todayCandles = data.candles.filter(c => {
              const date = new Date((c.time + 19800) * 1000); // UTC+5.30
              const y = date.getUTCFullYear();
              const m = String(date.getUTCMonth() + 1).padStart(2, '0');
              const d = String(date.getUTCDate()).padStart(2, '0');
              return `${y}-${m}-${d}` === todayStr;
            });

            console.log(`\n=== RESULTS FOR ${sym} ===`);
            if (todayCandles.length === 0) {
              console.log('No candles recorded for today yet.');
              resolve();
              return;
            }

            const open = todayCandles[0].open;
            const high = Math.max(...todayCandles.map(c => c.high));
            const low = Math.min(...todayCandles.map(c => c.low));
            const close = todayCandles[todayCandles.length - 1].close;

            console.log(`Open: ${open.toFixed(2)}`);
            console.log(`High: ${high.toFixed(2)}`);
            console.log(`Low: ${low.toFixed(2)}`);
            console.log(`Close: ${close.toFixed(2)}`);
            console.log(`Range: ${(high - low).toFixed(2)} pts`);
            
            console.log('Intraday 30-min Timeline:');
            todayCandles.forEach(c => {
              const t = new Date((c.time + 19800) * 1000);
              const timeStr = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
              console.log(`  [${timeStr}] O: ${c.open.toFixed(1)} H: ${c.high.toFixed(1)} L: ${c.low.toFixed(1)} C: ${c.close.toFixed(1)} Vol: ${c.volume}`);
            });

            resolve();
          }
        }, (err) => {
          reject(err);
        });
      });
    } catch (e) {
      console.error(`Error fetching ${sym}:`, e.message);
    }
  }

  try {
    bridge.closeSession();
  } catch (e) {}
}

checkTodayLive();
