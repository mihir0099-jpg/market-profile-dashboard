import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function check3618Failures() {
  console.log(`================================================================`);
  console.log(`EMPIRICAL SEARCH: DID NIFTY EVER CROSS 2.618 AND GO TO 3.618?`);
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
  const failureDetails = [];

  for (let i = 0; i < monthKeys.length - 1; i++) {
    const currM = monthKeys[i];
    const nextM = monthKeys[i+1];
    const currDays = monthGroups[currM];
    
    const tuesdays = currDays.filter(d => d.dayName === 'Tue');
    const expiry = tuesdays.length > 0 ? tuesdays[tuesdays.length - 1] : currDays[currDays.length - 1];

    const expIndex = daily.findIndex(d => d.dateStr === expiry.dateStr);
    const postExpiryDays = daily.slice(expIndex + 1);

    if (postExpiryDays.length >= 5) {
      totalSeriesCount++;
      const ibDays = postExpiryDays.slice(0, 5);
      const ibHigh = Math.max(...ibDays.map(d => d.high));
      const ibLow = Math.min(...ibDays.map(d => d.low));
      const ibRange = ibHigh - ibLow;

      const fib1618Bear = ibLow - (ibRange * 0.618);
      const fib2618Bear = ibLow - (ibRange * 1.618);
      const fib3618Bear = ibLow - (ibRange * 2.618);

      const hit2618 = postExpiryDays.some(d => d.low <= fib2618Bear);
      const hit3618 = postExpiryDays.some(d => d.low <= fib3618Bear);

      if (hit2618) hit2618Count++;
      if (hit3618) hit3618Count++;

      if (hit2618) {
        const lowestLowInSeries = Math.min(...postExpiryDays.map(d => d.low));
        const distancePast2618 = fib2618Bear - lowestLowInSeries;
        const distanceTo3618 = lowestLowInSeries - fib3618Bear;

        failureDetails.push({
          seriesName: `${nextM} Series`,
          expiryDate: expiry.dateStr,
          ibHigh,
          ibLow,
          ibRange,
          fib2618Bear,
          fib3618Bear,
          lowestLowInSeries,
          hit3618,
          distancePast2618,
          distanceTo3618
        });
      }
    }
  }

  console.log(`\n--- HISTORICAL PROBABILITY STATS ---`);
  console.log(`Total Monthly Series Analyzed: ${totalSeriesCount}`);
  console.log(`Series that hit 2.618 Bearish Extension: ${hit2618Count} (${((hit2618Count / totalSeriesCount) * 100).toFixed(1)}%)`);
  console.log(`Series that hit 3.618 Bearish Extension: ${hit3618Count} (${((hit3618Count / totalSeriesCount) * 100).toFixed(1)}%)`);
  console.log(`Failure Rate of 2.618 (reached 3.618): ${hit2618Count > 0 ? ((hit3618Count / hit2618Count) * 100).toFixed(1) : 0}%\n`);

  console.log(`--- DETAILED BREAKDOWN OF ALL 2.618 TOUCHES ---`);
  failureDetails.forEach((f, idx) => {
    console.log(`Instance #${idx + 1}: ${f.seriesName}`);
    console.log(`  2.618 Bear Target: ${f.fib2618Bear.toFixed(2)} | 3.618 Bear Target: ${f.fib3618Bear.toFixed(2)}`);
    console.log(`  Lowest Low in Series: ${f.lowestLowInSeries}`);
    console.log(`  Did it reach 3.618? ${f.hit3618 ? 'YES 🔴 (Extreme 3.618 Failure)' : 'NO 🟢 (Bounced before 3.618)'}`);
    console.log(`  Overshoot Past 2.618: ${f.distancePast2618 > 0 ? f.distancePast2618.toFixed(1) + ' pts' : 'None (Held 2.618)'}`);
    console.log(`  Distance to 3.618: ${f.distanceTo3618.toFixed(1)} pts away\n`);
  });

  process.exit(0);
}

check3618Failures().catch(err => {
  console.error(err);
  process.exit(1);
});
