import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function recalcTuesdayExpiry() {
  console.log(`================================================================`);
  console.log(`RE-CALCULATING 5-DAY IB AFTER TUESDAY AUGUST 25, 2026 EXPIRY`);
  console.log(`================================================================`);

  const candles = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout fetching symbol data')), 15000);
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
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    };
  });

  console.log('\n--- DAILY CANDLES AROUND AUGUST 2026 EXPIRY ---');
  const targetIndex = daily.findIndex(d => d.dateStr === '2026-08-25');
  const slice = daily.slice(targetIndex - 2, targetIndex + 12);
  slice.forEach(d => {
    console.log(`${d.dateStr} (${d.dayName}) | Open: ${d.open} | High: ${d.high} | Low: ${d.low} | Close: ${d.close}`);
  });

  // Last Tuesday Expiry = August 25, 2026
  // Next 5 trading days after August 25, 2026
  const postTuesdayDays = daily.filter(d => d.dateStr > '2026-08-25').slice(0, 5);

  console.log(`\n================================================================`);
  console.log(`FIRST 5 TRADING DAYS AFTER TUESDAY AUGUST 25, 2026 EXPIRY:`);
  console.log(`================================================================`);
  postTuesdayDays.forEach((d, idx) => {
    console.log(`Day ${idx + 1} (${d.dateStr}, ${d.dayName}): High ${d.high} | Low ${d.low} | Open ${d.open} | Close ${d.close}`);
  });

  const ibHigh = Math.max(...postTuesdayDays.map(d => d.high));
  const ibLow = Math.min(...postTuesdayDays.map(d => d.low));
  const ibRange = ibHigh - ibLow;

  const fib1618Bull = ibHigh + (ibRange * 0.618);
  const fib2618Bull = ibHigh + (ibRange * 1.618);
  const fib3618Bull = ibHigh + (ibRange * 2.618);

  const fib1618Bear = ibLow - (ibRange * 0.618);
  const fib2618Bear = ibLow - (ibRange * 1.618);
  const fib3618Bear = ibLow - (ibRange * 2.618);

  console.log(`\n--- 5-DAY IB PARAMETERS (POST TUESDAY AUG 25 EXPIRY) ---`);
  console.log(`5-Day IB High: ${ibHigh}`);
  console.log(`5-Day IB Low: ${ibLow}`);
  console.log(`5-Day IB Range: ${ibRange.toFixed(2)} points`);

  console.log(`\n--- BULLISH FIBONACCI EXTENSION LEVELS ---`);
  console.log(`1.618 Bullish Target: ${fib1618Bull.toFixed(2)}`);
  console.log(`2.618 Bullish Target: ${fib2618Bull.toFixed(2)}`);
  console.log(`3.618 Bullish Target: ${fib3618Bull.toFixed(2)}`);

  console.log(`\n--- BEARISH FIBONACCI EXTENSION LEVELS ---`);
  console.log(`1.618 Bearish Target: ${fib1618Bear.toFixed(2)}`);
  console.log(`2.618 Bearish Target: ${fib2618Bear.toFixed(2)}`);
  console.log(`3.618 Bearish Target: ${fib3618Bear.toFixed(2)}`);

  // Subsequent candles after the 5-day IB (from Day 6 onwards)
  const after5Days = daily.filter(d => d.dateStr > postTuesdayDays[postTuesdayDays.length - 1].dateStr);
  console.log(`\n--- CANDLES AFTER 5-DAY IB WINDOW (Sep 02 to Sep 09) ---`);
  after5Days.forEach(d => {
    console.log(`${d.dateStr} (${d.dayName}): Open ${d.open} | High ${d.high} | Low ${d.low} | Close ${d.close}`);
  });

  const cycleHigh = Math.max(...after5Days.map(d => d.high));
  const cycleLow = Math.min(...after5Days.map(d => d.low));
  console.log(`\nPost-IB Lowest Low Hit So Far: ${cycleLow}`);
  console.log(`Relation to 1.618 Bearish Target (${fib1618Bear.toFixed(2)}): ${cycleLow <= fib1618Bear ? 'BROKEN & CLEARED!' : 'Testing'}`);
  console.log(`Relation to 2.618 Bearish Target (${fib2618Bear.toFixed(2)}): ${cycleLow <= fib2618Bear ? 'BROKEN & CLEARED!' : 'Approaching'}`);

  process.exit(0);
}

recalcTuesdayExpiry().catch(err => {
  console.error(err);
  process.exit(1);
});
