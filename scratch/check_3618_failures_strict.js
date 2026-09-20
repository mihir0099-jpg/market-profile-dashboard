import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function check3618FailuresStrict() {
  console.log(`================================================================`);
  console.log(`STRICT CONTRACT CYCLE SEARCH: DID NIFTY REACH 3.618 WITHIN SAME CYCLE?`);
  console.log(`================================================================`);

  // Fetch daily candles for NIFTY
  const candles = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout fetching symbol data')), 20000);
    tvBridge.subscribeSymbol('NSE:NIFTY', 'D', (data) => {
      if (data.isSnapshot) {
        clearTimeout(timeout);
        resolve(data.candles);
      }
    }, (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const daily = candles.map(c => {
    const d = new Date(c.time * 1000 + 5.5 * 3600 * 1000);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    };
  });

  // Group by monthly contract series
  const monthGroups = {};
  daily.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(d);
  });

  const monthKeys = Object.keys(monthGroups).sort();
  let totalSeriesCount = 0;
  let hit2618Count = 0;
  let hit3618Count = 0;
  const cycleResults = [];

  for (let i = 0; i < monthKeys.length - 1; i++) {
    const currM = monthKeys[i];
    const nextM = monthKeys[i+1];
    const currDays = monthGroups[currM];
    const nextDays = monthGroups[nextM];
    
    // Find last Tuesday of currM and nextM
    const currTues = currDays.filter(d => d.dayName === 'Tue');
    const currExpiry = currTues.length > 0 ? currTues[currTues.length - 1] : currDays[currDays.length - 1];

    const nextTues = nextDays.filter(d => d.dayName === 'Tue');
    const nextExpiry = nextTues.length > 0 ? nextTues[nextTues.length - 1] : nextDays[nextDays.length - 1];

    const expIndex = daily.findIndex(d => d.dateStr === currExpiry.dateStr);
    const nextExpIndex = daily.findIndex(d => d.dateStr === nextExpiry.dateStr);

    // Days strictly inside THIS contract cycle
    const cycleDays = daily.slice(expIndex + 1, nextExpIndex + 1);

    if (cycleDays.length >= 5) {
      totalSeriesCount++;
      const ibDays = cycleDays.slice(0, 5);
      const ibHigh = Math.max(...ibDays.map(d => d.high));
      const ibLow = Math.min(...ibDays.map(d => d.low));
      const ibRange = ibHigh - ibLow;

      const fib1618Bear = ibLow - (ibRange * 0.618);
      const fib2618Bear = ibLow - (ibRange * 1.618);
      const fib3618Bear = ibLow - (ibRange * 2.618);

      const hit2618 = cycleDays.some(d => d.low <= fib2618Bear);
      const hit3618 = cycleDays.some(d => d.low <= fib3618Bear);

      const cycleLowestLow = Math.min(...cycleDays.map(d => d.low));
      const cycleHighestHigh = Math.max(...cycleDays.map(d => d.high));

      if (hit2618) hit2618Count++;
      if (hit3618) hit3618Count++;

      cycleResults.push({
        seriesName: `${nextM} Series (Post ${currExpiry.dateStr} Expiry)`,
        currExpiry: currExpiry.dateStr,
        nextExpiry: nextExpiry.dateStr,
        ibHigh,
        ibLow,
        ibRange,
        fib1618Bear,
        fib2618Bear,
        fib3618Bear,
        cycleLowestLow,
        hit2618,
        hit3618
      });
    }
  }

  console.log(`\n================================================================`);
  console.log(`STRICT CONTRACT CYCLE RESULTS (${totalSeriesCount} Series Analyzed)`);
  console.log(`================================================================`);
  console.log(`- Monthly Series That Hit 2.618 Bear Target: ${hit2618Count} (${((hit2618Count / totalSeriesCount) * 100).toFixed(1)}%)`);
  console.log(`- Monthly Series That Hit 3.618 Bear Target: ${hit3618Count} (${((hit3618Count / totalSeriesCount) * 100).toFixed(1)}%)`);
  console.log(`- Failure Rate of 2.618 (Reached 3.618 in same cycle): ${hit2618Count > 0 ? ((hit3618Count / hit2618Count) * 100).toFixed(1) : 0}%\n`);

  cycleResults.forEach((c, idx) => {
    console.log(`Series #${idx + 1}: ${c.seriesName}`);
    console.log(`  5-Day IB: ${c.ibLow} - ${c.ibHigh} (${c.ibRange.toFixed(1)} pts)`);
    console.log(`  1.618 Target: ${c.fib1618Bear.toFixed(2)} | 2.618 Target: ${c.fib2618Bear.toFixed(2)} | 3.618 Target: ${c.fib3618Bear.toFixed(2)}`);
    console.log(`  Cycle Lowest Low: ${c.cycleLowestLow}`);
    console.log(`  Hit 2.618? ${c.hit2618 ? 'YES ✅' : 'NO ❌'} | Hit 3.618? ${c.hit3618 ? 'YES 🔴 (Failed 2.618)' : 'NO 🟢 (Held 2.618 Floor)'}`);
    console.log(`----------------------------------------------------------------`);
  });

  process.exit(0);
}

check3618FailuresStrict().catch(err => {
  console.error(err);
  process.exit(1);
});
