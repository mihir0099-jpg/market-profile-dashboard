import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function backtest2618Reversals() {
  console.log(`================================================================`);
  console.log(`COMPREHENSIVE BACKTEST: 2.618 MONTHLY EXTENSION REVERSALS`);
  console.log(`================================================================`);

  // Fetch daily candles for NIFTY (maximum available historical depth)
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
      time: c.time,
      dateStr: d.toISOString().split('T')[0],
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    };
  });

  // Group by monthly contract series (Post Tuesday Expiry of previous month)
  const monthGroups = {};
  daily.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(d);
  });

  const monthKeys = Object.keys(monthGroups).sort();
  const instances = [];

  for (let i = 0; i < monthKeys.length - 1; i++) {
    const currM = monthKeys[i];
    const nextM = monthKeys[i+1];
    const currDays = monthGroups[currM];
    
    // Find last Tuesday expiry of currM
    const tuesdays = currDays.filter(d => d.dayName === 'Tue');
    const expiry = tuesdays.length > 0 ? tuesdays[tuesdays.length - 1] : currDays[currDays.length - 1];

    const expIndex = daily.findIndex(d => d.dateStr === expiry.dateStr);
    const postExpiryDays = daily.slice(expIndex + 1);

    if (postExpiryDays.length >= 5) {
      const ibDays = postExpiryDays.slice(0, 5);
      const ibHigh = Math.max(...ibDays.map(d => d.high));
      const ibLow = Math.min(...ibDays.map(d => d.low));
      const ibRange = ibHigh - ibLow;

      const fib1618Bear = ibLow - (ibRange * 0.618);
      const fib2618Bear = ibLow - (ibRange * 1.618);

      // Check if 2.618 bear target was touched in postExpiryDays
      const hit2618Index = postExpiryDays.findIndex(d => d.low <= fib2618Bear);

      if (hit2618Index !== -1) {
        const hitDay = postExpiryDays[hit2618Index];
        const hitDayGlobalIndex = daily.findIndex(d => d.dateStr === hitDay.dateStr);

        // Analyze candles around hitDay for Candlestick Reversal Patterns
        const prevDay = daily[hitDayGlobalIndex - 1];
        const nextDay = daily[hitDayGlobalIndex + 1];
        const day2After = daily[hitDayGlobalIndex + 2];

        // Pattern Classification at Bottom:
        let patternName = 'Standard Rejection';
        const bodySize = Math.abs(hitDay.close - hitDay.open);
        const lowerShadow = Math.min(hitDay.open, hitDay.close) - hitDay.low;
        const upperShadow = hitDay.high - Math.max(hitDay.open, hitDay.close);

        if (lowerShadow >= 1.5 * bodySize && lowerShadow > upperShadow) {
          patternName = 'Bullish Pin Bar / Hammer (Lower Shadow Rejection)';
        } else if (nextDay && nextDay.close > hitDay.high && nextDay.close > nextDay.open) {
          patternName = 'Bullish Engulfing / Reversal Candle';
        } else if (hitDay.low < fib2618Bear && hitDay.close > fib2618Bear) {
          patternName = 'Liquidity Sweep Rejection (Closed Above 2.618)';
        } else if (nextDay && nextDay.open > hitDay.close && nextDay.close > hitDay.open) {
          patternName = 'Morning Star / Piercing Line Pattern';
        }

        // Trace Reversal over next 30 trading days (same month vs next month)
        const forward30Days = daily.slice(hitDayGlobalIndex, hitDayGlobalIndex + 30);
        let maxReversalHigh = hitDay.high;
        let maxReversalDay = hitDay;

        forward30Days.forEach(fd => {
          if (fd.high > maxReversalHigh) {
            maxReversalHigh = fd.high;
            maxReversalDay = fd;
          }
        });

        const reversalPts = maxReversalHigh - hitDay.low;
        const reversalPct = ((reversalPts / hitDay.low) * 100).toFixed(2);
        const daysToPeak = forward30Days.findIndex(d => d.dateStr === maxReversalDay.dateStr);

        // Check if peak happened in SAME month or NEXT month
        const hitMonth = hitDay.dateStr.substring(0, 7);
        const peakMonth = maxReversalDay.dateStr.substring(0, 7);
        const timingCategory = hitMonth === peakMonth ? 'SAME MONTH' : 'NEXT MONTH (Multi-Week Swing)';

        instances.push({
          seriesName: `${nextM} Series`,
          expiryDate: expiry.dateStr,
          ibHigh,
          ibLow,
          ibRange,
          fib2618Bear,
          hitDate: hitDay.dateStr,
          hitLow: hitDay.low,
          hitClose: hitDay.close,
          patternName,
          maxReversalHigh,
          maxReversalDate: maxReversalDay.dateStr,
          reversalPts,
          reversalPct,
          daysToPeak,
          timingCategory,
          hitMonth,
          peakMonth
        });
      }
    }
  }

  console.log(`Found ${instances.length} historical 2.618 Bearish Extension instances:\n`);

  instances.forEach((inst, idx) => {
    console.log(`================================================================`);
    console.log(`INSTANCE #${idx + 1}: ${inst.seriesName}`);
    console.log(`================================================================`);
    console.log(`- Expiry Date: ${inst.expiryDate}`);
    console.log(`- 5-Day IB: ${inst.ibLow} - ${inst.ibHigh} (Range: ${inst.ibRange.toFixed(1)} pts)`);
    console.log(`- 2.618 Bearish Target: ${inst.fib2618Bear.toFixed(2)}`);
    console.log(`- Date 2.618 Was Hit: ${inst.hitDate} (Day Low: ${inst.hitLow})`);
    console.log(`- Reversal Pattern Printed: ${inst.patternName}`);
    console.log(`- Peak Reversal High Reached: ${inst.maxReversalHigh} on ${inst.maxReversalDate}`);
    console.log(`- Reversal Size: +${inst.reversalPts.toFixed(1)} pts (+${inst.reversalPct}%)`);
    console.log(`- Time to Peak: ${inst.daysToPeak} trading days`);
    console.log(`- Timing Category: 🗓️ ${inst.timingCategory} (Hit in ${inst.hitMonth} -> Peak in ${inst.peakMonth})`);
  });

  // Calculate Overall Backtest Statistics
  if (instances.length > 0) {
    const avgReversalPts = (instances.reduce((acc, i) => acc + i.reversalPts, 0) / instances.length).toFixed(1);
    const avgReversalPct = (instances.reduce((acc, i) => acc + parseFloat(i.reversalPct), 0) / instances.length).toFixed(2);
    const avgDaysToPeak = (instances.reduce((acc, i) => acc + i.daysToPeak, 0) / instances.length).toFixed(1);
    const sameMonthCount = instances.filter(i => i.timingCategory.includes('SAME MONTH')).length;
    const nextMonthCount = instances.filter(i => i.timingCategory.includes('NEXT MONTH')).length;

    console.log(`\n================================================================`);
    console.log(`📊 OVERALL 2.618 REVERSAL BACKTEST SUMMARY STATISTICS`);
    console.log(`================================================================`);
    console.log(`- Total 2.618 Instances Backtested: ${instances.length}`);
    console.log(`- Win Rate (>500 pts Reversal): ${((instances.filter(i => i.reversalPts > 500).length / instances.length) * 100).toFixed(1)}%`);
    console.log(`- Average Reversal Size: +${avgReversalPts} points (+${avgReversalPct}%)`);
    console.log(`- Average Time to Swing Peak: ${avgDaysToPeak} trading days (~${Math.round(avgDaysToPeak / 5)} weeks)`);
    console.log(`- Timing Distribution:`);
    console.log(`  • Same Month Reversal Start: ${sameMonthCount} instances (${((sameMonthCount / instances.length) * 100).toFixed(1)}%)`);
    console.log(`  • Next Month Multi-Week Swing: ${nextMonthCount} instances (${((nextMonthCount / instances.length) * 100).toFixed(1)}%)`);
  }

  process.exit(0);
}

backtest2618Reversals().catch(err => {
  console.error(err);
  process.exit(1);
});
