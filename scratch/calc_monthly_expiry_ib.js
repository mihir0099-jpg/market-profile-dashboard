import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function analyzeExpiryIB() {
  console.log(`================================================================`);
  console.log(`CALCULATING 5-DAY IB AFTER LAST MONTHLY EXPIRY FOR NIFTY SPOT`);
  console.log(`================================================================`);

  // Fetch daily candles for NIFTY
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
      dayOfWeek: d.getUTCDay(), // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    };
  });

  // Group days into monthly contract cycles.
  // In NSE, monthly stock/index options expired on the last Thursday of each month (or last Tuesday depending on regulation).
  // Let's identify the monthly expiry day for each month: the last Thursday (or last trading day of the month before next series).
  // More precisely: find the last trading day of each month, or group candles by month.
  
  // Let's group daily candles by calendar month to inspect both calendar month and post-expiry 5 days:
  const monthGroups = {};
  for (const d of daily) {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(d);
  }

  const monthKeys = Object.keys(monthGroups).sort();
  console.log(`Available Months: ${monthKeys.join(', ')}`);

  // For each month, let's find the last Thursday (Monthly Expiry Day)
  const contractSeries = [];

  for (let i = 0; i < monthKeys.length - 1; i++) {
    const currMonthKey = monthKeys[i];
    const nextMonthKey = monthKeys[i+1];

    const currDays = monthGroups[currMonthKey];
    // Find last Thursday in currDays (or last day if no Thursday)
    const thursdays = currDays.filter(d => d.dayOfWeek === 4);
    const expiryDay = thursdays.length > 0 ? thursdays[thursdays.length - 1] : currDays[currDays.length - 1];

    // The trading days AFTER expiryDay belong to the next contract cycle
    const currIndexInAll = daily.findIndex(d => d.dateStr === expiryDay.dateStr);
    const postExpiryDays = daily.slice(currIndexInAll + 1);

    if (postExpiryDays.length >= 5) {
      const first5Days = postExpiryDays.slice(0, 5);
      const ibHigh = Math.max(...first5Days.map(d => d.high));
      const ibLow = Math.min(...first5Days.map(d => d.low));
      const ibRange = ibHigh - ibLow;

      // The remaining days in this contract cycle (until next month expiry)
      const nextMonthDays = monthGroups[nextMonthKey];
      const nextThursdays = nextMonthDays.filter(d => d.dayOfWeek === 4);
      const nextExpiryDay = nextThursdays.length > 0 ? nextThursdays[nextThursdays.length - 1] : nextMonthDays[nextMonthDays.length - 1];
      const nextExpiryIndexInAll = daily.findIndex(d => d.dateStr === nextExpiryDay.dateStr);

      const fullCycleDays = daily.slice(currIndexInAll + 1, nextExpiryIndexInAll + 1);
      const cycleHigh = Math.max(...fullCycleDays.map(d => d.high));
      const cycleLow = Math.min(...fullCycleDays.map(d => d.low));

      // Calculate Extensions
      const fib1618Bull = ibHigh + (ibRange * 0.618);
      const fib2618Bull = ibHigh + (ibRange * 1.618);
      const fib3618Bull = ibHigh + (ibRange * 2.618);

      const fib1618Bear = ibLow - (ibRange * 0.618);
      const fib2618Bear = ibLow - (ibRange * 1.618);
      const fib3618Bear = ibLow - (ibRange * 2.618);

      let maxExt = 'INSIDE_IB';
      if (cycleHigh >= fib3618Bull) maxExt = 'FIB_3.618_BULL';
      else if (cycleHigh >= fib2618Bull) maxExt = 'FIB_2.618_BULL';
      else if (cycleHigh >= fib1618Bull) maxExt = 'FIB_1.618_BULL';
      else if (cycleLow <= fib3618Bear) maxExt = 'FIB_3.618_BEAR';
      else if (cycleLow <= fib2618Bear) maxExt = 'FIB_2.618_BEAR';
      else if (cycleLow <= fib1618Bear) maxExt = 'FIB_1.618_BEAR';

      contractSeries.push({
        seriesName: `${nextMonthKey} Series (Post ${expiryDay.dateStr} Expiry)`,
        expiryDate: expiryDay.dateStr,
        first5Dates: first5Days.map(d => d.dateStr),
        ibHigh,
        ibLow,
        ibRange,
        fib1618Bull,
        fib2618Bull,
        fib3618Bull,
        fib1618Bear,
        fib2618Bear,
        fib3618Bear,
        cycleHigh,
        cycleLow,
        maxExt
      });
    }
  }

  // Current contract series (after August 2026 expiry)
  const latestSeries = contractSeries[contractSeries.length - 1];
  console.log(`\n================================================================`);
  console.log(`CURRENT MONTHLY CONTRACT SERIES: ${latestSeries.seriesName}`);
  console.log(`================================================================`);
  console.log(`Last Expiry Date: ${latestSeries.expiryDate}`);
  console.log(`First 5 Trading Days after Expiry: ${latestSeries.first5Dates.join(', ')}`);
  console.log(`\n5-Day Post-Expiry IB High: ${latestSeries.ibHigh}`);
  console.log(`5-Day Post-Expiry IB Low: ${latestSeries.ibLow}`);
  console.log(`5-Day Post-Expiry IB Range: ${latestSeries.ibRange.toFixed(2)} pts`);

  console.log(`\n--- BULLISH FIBONACCI EXTENSIONS ---`);
  console.log(`1.618 Bullish Target: ${latestSeries.fib1618Bull.toFixed(2)}`);
  console.log(`2.618 Bullish Target: ${latestSeries.fib2618Bull.toFixed(2)}`);
  console.log(`3.618 Bullish Target: ${latestSeries.fib3618Bull.toFixed(2)}`);

  console.log(`\n--- BEARISH FIBONACCI EXTENSIONS ---`);
  console.log(`1.618 Bearish Target: ${latestSeries.fib1618Bear.toFixed(2)}`);
  console.log(`2.618 Bearish Target: ${latestSeries.fib2618Bear.toFixed(2)}`);
  console.log(`3.618 Bearish Target: ${latestSeries.fib3618Bear.toFixed(2)}`);

  console.log(`\n--- CURRENT CYCLE HIGH / LOW / EXTENSION ---`);
  console.log(`Current Cycle High: ${latestSeries.cycleHigh}`);
  console.log(`Current Cycle Low: ${latestSeries.cycleLow}`);
  console.log(`Current Max Extension Achieved: ${latestSeries.maxExt}`);

  // Historical matches search
  console.log(`\n================================================================`);
  console.log(`HISTORICAL MATCHES SEARCH (Previous Monthly Series)`);
  console.log(`================================================================`);

  const sameExtSeries = contractSeries.filter(s => s.seriesName !== latestSeries.seriesName && s.maxExt === latestSeries.maxExt);

  if (sameExtSeries.length > 0) {
    console.log(`Found ${sameExtSeries.length} past monthly contract series with exact same Extension (${latestSeries.maxExt}):`);
    for (const s of sameExtSeries) {
      console.log(`- ${s.seriesName} | Expiry: ${s.expiryDate} | 5-Day IB: ${s.ibLow}-${s.ibHigh} (${s.ibRange.toFixed(1)}pts) | High: ${s.cycleHigh} | Low: ${s.cycleLow} | Ext: ${s.maxExt}`);
    }
    const lastMatch = sameExtSeries[sameExtSeries.length - 1];
    console.log(`\n👉 MOST RECENT HISTORICAL MONTHLY SERIES MATCH HAPPENED IN: ${lastMatch.seriesName}`);
  } else {
    console.log(`No exact match for extension status (${latestSeries.maxExt}). Listing all recent monthly series extensions:`);
    for (const s of contractSeries.slice(-6)) {
      console.log(`- ${s.seriesName} | 5-Day IB Range: ${s.ibRange.toFixed(1)}pts | Max Ext: ${s.maxExt}`);
    }
  }
}

analyzeExpiryIB().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
