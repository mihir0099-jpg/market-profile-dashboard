import { TradingViewBridge } from '../backend/tradingview.js';
import { getMonthlyProfileData } from '../backend/monthly_profile_analyzer.js';

const tvBridge = new TradingViewBridge();

async function analyzeSymbol(symbol) {
  console.log(`\n==================================================`);
  console.log(`ANALYZING MONTHLY PROFILE & EXTENSION FOR ${symbol}`);
  console.log(`==================================================`);

  // Fetch daily candles for the symbol
  const candles = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout fetching symbol data')), 15000);
    tvBridge.subscribeSymbol(symbol, 'D', (data) => {
      if (data.isSnapshot) {
        clearTimeout(timeout);
        resolve(data.candles);
      }
    }, (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Group daily candles by month (YYYY-MM)
  const monthCandlesMap = {};
  for (const c of candles) {
    const d = new Date(c.time * 1000 + 5.5 * 3600 * 1000); // IST
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthCandlesMap[key]) monthCandlesMap[key] = [];
    monthCandlesMap[key].push({
      date: d.toISOString().split('T')[0],
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    });
  }

  const sortedMonthKeys = Object.keys(monthCandlesMap).sort();
  console.log(`Total months available in history: ${sortedMonthKeys.length} (From ${sortedMonthKeys[0]} to ${sortedMonthKeys[sortedMonthKeys.length - 1]})`);

  // Compute profile for each month
  const monthlyStats = [];

  for (let i = 0; i < sortedMonthKeys.length; i++) {
    const key = sortedMonthKeys[i];
    const days = monthCandlesMap[key];
    const monthOpen = days[0].open;
    const monthHigh = Math.max(...days.map(d => d.high));
    const monthLow = Math.min(...days.map(d => d.low));
    const monthClose = days[days.length - 1].close;

    // Monthly Initial Balance (IB = first 5 trading days of the month)
    const ibDays = days.slice(0, Math.min(5, days.length));
    const ibHigh = Math.max(...ibDays.map(d => d.high));
    const ibLow = Math.min(...ibDays.map(d => d.low));
    const ibRange = ibHigh - ibLow;

    // Calculate Fib Extensions from 5-Day Monthly IB
    const ibFib1618Up = ibHigh + (ibRange * 0.618);
    const ibFib1618Dn = ibLow - (ibRange * 0.618);
    const ibFib2618Up = ibHigh + (ibRange * 1.618);
    const ibFib2618Dn = ibLow - (ibRange * 1.618);

    // Profile POC, VAH, VAL
    const step = symbol.includes('BANKNIFTY') ? 20 : 10;
    const prices = [];
    for (const d of days) {
      for (let p = Math.floor(d.low / step) * step; p <= Math.ceil(d.high / step) * step; p += step) {
        prices.push(p);
      }
    }
    const counts = {};
    for (const p of prices) counts[p] = (counts[p] || 0) + 1;
    let maxC = -1, poc = prices[0];
    for (const [p, c] of Object.entries(counts)) {
      if (c > maxC) { maxC = c; poc = parseFloat(p); }
    }
    const sortedP = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const targetTPOs = prices.length * 0.70;
    let pocIdx = sortedP.indexOf(poc);
    let vaP = [poc], currTPOs = counts[poc] || 0;
    let up = pocIdx + 1, dn = pocIdx - 1;
    while (currTPOs < targetTPOs && (up < sortedP.length || dn >= 0)) {
      let upSum = (up < sortedP.length ? (counts[sortedP[up]] || 0) : 0) + (up + 1 < sortedP.length ? (counts[sortedP[up + 1]] || 0) : 0);
      let dnSum = (dn >= 0 ? (counts[sortedP[dn]] || 0) : 0) + (dn - 1 >= 0 ? (counts[sortedP[dn - 1]] || 0) : 0);
      if (upSum >= dnSum && up < sortedP.length) {
        currTPOs += (counts[sortedP[up]] || 0); vaP.push(sortedP[up]); up++;
      } else if (dn >= 0) {
        currTPOs += (counts[sortedP[dn]] || 0); vaP.push(sortedP[dn]); dn--;
      } else if (up < sortedP.length) {
        currTPOs += (counts[sortedP[up]] || 0); vaP.push(sortedP[up]); up++;
      }
    }
    const val = Math.min(...vaP);
    const vah = Math.max(...vaP);

    // Extension classification
    let ibBreakout = 'INSIDE_IB';
    if (monthHigh > ibHigh && monthLow < ibLow) ibBreakout = 'BOTH_EXTENDED';
    else if (monthHigh > ibHigh) ibBreakout = 'BULLISH_IB_BREAK';
    else if (monthLow < ibLow) ibBreakout = 'BEARISH_IB_BREAK';

    let fibHit = 'NONE';
    if (monthHigh >= ibFib2618Up) fibHit = 'FIB_2.618_BULL';
    else if (monthHigh >= ibFib1618Up) fibHit = 'FIB_1.618_BULL';
    else if (monthLow <= ibFib2618Dn) fibHit = 'FIB_2.618_BEAR';
    else if (monthLow <= ibFib1618Dn) fibHit = 'FIB_1.618_BEAR';

    monthlyStats.push({
      key,
      daysCount: days.length,
      monthOpen,
      monthHigh,
      monthLow,
      monthClose,
      ibHigh,
      ibLow,
      ibRange,
      ibFib1618Up,
      ibFib1618Dn,
      ibFib2618Up,
      ibFib2618Dn,
      poc,
      vah,
      val,
      ibBreakout,
      fibHit
    });
  }

  // Current Month Data (latest month in array)
  const currentMonth = monthlyStats[monthlyStats.length - 1];
  const prevMonth = monthlyStats.length > 1 ? monthlyStats[monthlyStats.length - 2] : null;

  console.log(`\n--- CURRENT MONTH STATUS (${currentMonth.key}) ---`);
  console.log(`Current Price / Last Close: ${currentMonth.monthClose}`);
  console.log(`Month Open: ${currentMonth.monthOpen}`);
  console.log(`Month High: ${currentMonth.monthHigh}`);
  console.log(`Month Low: ${currentMonth.monthLow}`);
  console.log(`5-Day Monthly IB High: ${currentMonth.ibHigh}`);
  console.log(`5-Day Monthly IB Low: ${currentMonth.ibLow}`);
  console.log(`5-Day IB Range: ${currentMonth.ibRange.toFixed(2)} pts`);
  console.log(`Fib 1.618 Bullish Target: ${currentMonth.ibFib1618Up.toFixed(2)}`);
  console.log(`Fib 1.618 Bearish Target: ${currentMonth.ibFib1618Dn.toFixed(2)}`);
  console.log(`Current IB Status: ${currentMonth.ibBreakout}`);
  console.log(`Fib Extension Hit Status: ${currentMonth.fibHit}`);

  if (prevMonth) {
    console.log(`\n--- PREVIOUS MONTH (${prevMonth.key}) PROFILE LEVELS ---`);
    console.log(`Prev Month VAH: ${prevMonth.vah}`);
    console.log(`Prev Month POC: ${prevMonth.poc}`);
    console.log(`Prev Month VAL: ${prevMonth.val}`);

    const isOpenInsidePrevVA = currentMonth.monthOpen >= prevMonth.val && currentMonth.monthOpen <= prevMonth.vah;
    console.log(`Open Relation to Prev Value Area: ${isOpenInsidePrevVA ? 'INSIDE VALUE (Reversion Target = Prev POC ' + prevMonth.poc + ')' : currentMonth.monthOpen > prevMonth.vah ? 'ABOVE VAH (Outside Value Trap Risk)' : 'BELOW VAL (Outside Value Trap Risk)'}`);
  }

  // Look for historical matches (months with similar extension or structure)
  console.log(`\n--- HISTORICAL MATCHES FOR THIS MONTHLY STRUCTURE ---`);
  const matchingMonths = monthlyStats.filter(m => m.key !== currentMonth.key && m.fibHit === currentMonth.fibHit && m.ibBreakout === currentMonth.ibBreakout);

  if (matchingMonths.length > 0) {
    console.log(`Found ${matchingMonths.length} historical months with exact same IB Breakout (${currentMonth.ibBreakout}) & Fib Hit (${currentMonth.fibHit}):`);
    for (const m of matchingMonths.slice(-5)) { // show recent 5
      console.log(`- Month: ${m.key} | Month High: ${m.monthHigh} | Month Low: ${m.monthLow} | Close: ${m.monthClose} | IB Status: ${m.ibBreakout} | Fib: ${m.fibHit}`);
    }
    const lastMatch = matchingMonths[matchingMonths.length - 1];
    console.log(`\n👉 MOST RECENT HISTORICAL MATCH HAPPENED IN: ${lastMatch.key}`);
  } else {
    // Fallback search: match IB Breakout type
    const sameBreakoutMonths = monthlyStats.filter(m => m.key !== currentMonth.key && m.ibBreakout === currentMonth.ibBreakout);
    console.log(`Found ${sameBreakoutMonths.length} historical months with same IB Breakout type (${currentMonth.ibBreakout}):`);
    for (const m of sameBreakoutMonths.slice(-5)) {
      console.log(`- Month: ${m.key} | High: ${m.monthHigh} | Low: ${m.monthLow} | Fib: ${m.fibHit}`);
    }
    if (sameBreakoutMonths.length > 0) {
      console.log(`\n👉 MOST RECENT IB BREAKOUT MATCH WAS IN: ${sameBreakoutMonths[sameBreakoutMonths.length - 1].key}`);
    }
  }

  return { currentMonth, prevMonth, monthlyStats };
}

async function main() {
  try {
    await analyzeSymbol('NSE:NIFTY');
    await analyzeSymbol('NSE:BANKNIFTY');
    process.exit(0);
  } catch (err) {
    console.error('Error running monthly extension analysis:', err);
    process.exit(1);
  }
}

main();
