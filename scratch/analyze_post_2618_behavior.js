import { TradingViewBridge } from '../backend/tradingview.js';

const tvBridge = new TradingViewBridge();

async function analyzePost2618Behavior() {
  console.log(`================================================================`);
  console.log(`DEEP HISTORICAL STUDY: WHAT HAPPENS AFTER 1.618 & 2.618 FIB EXTENSIONS?`);
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
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    };
  });

  // Group by monthly contract series (Post Tuesday Expiry of previous month)
  // Let's identify Tuesdays near month end
  const monthsMap = {};
  daily.forEach(d => {
    const key = d.dateStr.substring(0, 7);
    if (!monthsMap[key]) monthsMap[key] = [];
    monthsMap[key].push(d);
  });

  const monthKeys = Object.keys(monthsMap).sort();
  const seriesList = [];

  for (let i = 0; i < monthKeys.length - 1; i++) {
    const currM = monthKeys[i];
    const nextM = monthKeys[i+1];
    const currDays = monthsMap[currM];
    
    // Find last Tuesday (or last trading day) of currM
    const tuesdays = currDays.filter(d => d.dayName === 'Tue');
    const expiry = tuesdays.length > 0 ? tuesdays[tuesdays.length - 1] : currDays[currDays.length - 1];

    const expIndex = daily.findIndex(d => d.dateStr === expiry.dateStr);
    const postExpiryDays = daily.slice(expIndex + 1);

    // Need at least 5 IB days + subsequent days
    if (postExpiryDays.length >= 5) {
      const ibDays = postExpiryDays.slice(0, 5);
      const ibHigh = Math.max(...ibDays.map(d => d.high));
      const ibLow = Math.min(...ibDays.map(d => d.low));
      const ibRange = ibHigh - ibLow;

      const fib1618Bear = ibLow - (ibRange * 0.618);
      const fib2618Bear = ibLow - (ibRange * 1.618);
      const fib3618Bear = ibLow - (ibRange * 2.618);

      const remainingDays = postExpiryDays.slice(5);

      seriesList.push({
        seriesName: `${nextM} Series`,
        expiryDate: expiry.dateStr,
        ibDaysCount: ibDays.length,
        ibHigh,
        ibLow,
        ibRange,
        fib1618Bear,
        fib2618Bear,
        fib3618Bear,
        remainingDays
      });
    }
  }

  console.log(`\nFound ${seriesList.length} monthly contract series in dataset.\n`);

  for (const s of seriesList) {
    const brokeIBLow = s.remainingDays.some(d => d.low < s.ibLow);
    const hit1618 = s.remainingDays.some(d => d.low <= s.fib1618Bear);
    const hit2618 = s.remainingDays.some(d => d.low <= s.fib2618Bear);

    if (brokeIBLow) {
      console.log(`----------------------------------------------------------------`);
      console.log(`📌 ${s.seriesName} (Expiry: ${s.expiryDate})`);
      console.log(`   IB High: ${s.ibHigh} | IB Low: ${s.ibLow} | Range: ${s.ibRange.toFixed(1)} pts`);
      console.log(`   1.618 Bear Target: ${s.fib1618Bear.toFixed(2)} | 2.618 Bear Target: ${s.fib2618Bear.toFixed(2)}`);
      console.log(`   Hit 1.618 Bear? ${hit1618 ? 'YES ✅' : 'NO ❌'} | Hit 2.618 Bear? ${hit2618 ? 'YES ✅' : 'NO ❌'}`);

      // Trace day-by-day after breaking IB Low
      let hit1618Date = null;
      let hit2618Date = null;
      let minLowAfterHit = 999999;
      let maxHighAfterHit = 0;
      let endOfSeriesClose = s.remainingDays[s.remainingDays.length - 1].close;

      for (let idx = 0; idx < s.remainingDays.length; idx++) {
        const d = s.remainingDays[idx];
        if (!hit1618Date && d.low <= s.fib1618Bear) hit1618Date = d;
        if (!hit2618Date && d.low <= s.fib2618Bear) hit2618Date = d;
      }

      if (hit1618Date) {
        console.log(`   👉 Hit 1.618 Bear Target on: ${hit1618Date.dateStr} (Low: ${hit1618Date.low})`);
        // Find days after 1.618 hit
        const daysAfter1618 = s.remainingDays.filter(d => d.dateStr >= hit1618Date.dateStr);
        const minL = Math.min(...daysAfter1618.map(d => d.low));
        const maxH = Math.max(...daysAfter1618.map(d => d.high));
        const finalC = daysAfter1618[daysAfter1618.length - 1].close;
        const bouncePts = maxH - hit1618Date.low;
        const bouncePct = ((bouncePts / hit1618Date.low) * 100).toFixed(2);

        console.log(`      Subsequent Action: Min Low: ${minL} | Max Reversal High: ${maxH} (Bounce of +${bouncePts.toFixed(1)} pts / +${bouncePct}%) | Final Series Close: ${finalC}`);
        if (finalC > hit1618Date.low) {
          console.log(`      Outcome: REVERSAL / BOUNCE! (Closed ${ (finalC - hit1618Date.low).toFixed(1) } pts higher than 1.618 hit level)`);
        } else {
          console.log(`      Outcome: CONTINUATION DOWNSIDE (Drove lower towards ${minL})`);
        }
      }

      if (hit2618Date) {
        console.log(`   🚨 Hit 2.618 Bear Target on: ${hit2618Date.dateStr} (Low: ${hit2618Date.low})`);
        const daysAfter2618 = s.remainingDays.filter(d => d.dateStr >= hit2618Date.dateStr);
        const minL2 = Math.min(...daysAfter2618.map(d => d.low));
        const maxH2 = Math.max(...daysAfter2618.map(d => d.high));
        const finalC2 = daysAfter2618[daysAfter2618.length - 1].close;
        const bouncePts2 = maxH2 - hit2618Date.low;
        const bouncePct2 = ((bouncePts2 / hit2618Date.low) * 100).toFixed(2);

        console.log(`      Subsequent Action after 2.618: Min Low: ${minL2} | Max Reversal High: ${maxH2} (Sharp Bounce +${bouncePts2.toFixed(1)} pts / +${bouncePct2}%) | Final Close: ${finalC2}`);
        if (finalC2 > hit2618Date.low) {
          console.log(`      Outcome: SHARP REVERSAL / SHORT COVERING RALLY! (Closed +${(finalC2 - hit2618Date.low).toFixed(1)} pts above 2.618 level)`);
        } else {
          console.log(`      Outcome: STEEP SELLOFF CONTINUATION`);
        }
      }
    }
  }

  process.exit(0);
}

analyzePost2618Behavior().catch(err => {
  console.error(err);
  process.exit(1);
});
