import { TradingViewBridge } from './tradingview.js';

function getPeriodLetter(periodIndex) {
  if (periodIndex < 26) {
    return String.fromCharCode(65 + periodIndex);
  } else if (periodIndex < 52) {
    return String.fromCharCode(97 + (periodIndex - 26));
  } else {
    return String.fromCharCode(65 + (periodIndex % 26)) + Math.floor(periodIndex / 26);
  }
}

function calculateTPOProfile(candles, tickSize, valueAreaPct = 0.70, sessionPeriod) {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  for (const c of sorted) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
  }
  
  const binsMap = {};
  const prices = [];
  const startPrice = Math.floor(dayLow / tickSize) * tickSize;
  const endPrice = Math.ceil(dayHigh / tickSize) * tickSize;
  
  for (let p = startPrice; p <= endPrice + tickSize / 2; p += tickSize) {
    const roundedPrice = Math.round(p * 100) / 100;
    binsMap[roundedPrice] = { price: roundedPrice, tpos: [] };
    prices.push(roundedPrice);
  }

  const uniqueDays = Array.from(new Set(
    sorted.map(c => {
      const cd = new Date(c.time * 1000);
      return `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
    })
  )).sort();

  const dayStarts = {};
  for (const c of sorted) {
    const d = new Date(c.time * 1000);
    const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayStarts[dayStr] === undefined || c.time < dayStarts[dayStr]) {
      dayStarts[dayStr] = c.time;
    }
  }

  const periodRanges = {};
  for (const c of sorted) {
    const d = new Date(c.time * 1000);
    const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const daySessionStart = dayStarts[dayStr];
    
    let periodIndex = 0;
    if (sessionPeriod === 'monthly') {
      const cdStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      periodIndex = uniqueDays.indexOf(cdStr);
    } else {
      const elapsedSeconds = c.time - daySessionStart;
      periodIndex = Math.floor(elapsedSeconds / (30 * 60));
    }
    
    if (!periodRanges[periodIndex]) {
      periodRanges[periodIndex] = { high: -Infinity, low: Infinity };
    }
    if (c.high > periodRanges[periodIndex].high) periodRanges[periodIndex].high = c.high;
    if (c.low < periodRanges[periodIndex].low) periodRanges[periodIndex].low = c.low;
  }

  Object.entries(periodRanges).forEach(([pIdxStr, r]) => {
    const periodIdx = parseInt(pIdxStr, 10);
    const letter = getPeriodLetter(periodIdx);
    
    prices.forEach(price => {
      const binBottom = price - tickSize / 2;
      const binTop = price + tickSize / 2;
      if (r.high >= binBottom && r.low <= binTop) {
        binsMap[price].tpos.push(letter);
      }
    });
  });

  const bins = prices.map(p => binsMap[p]).reverse();

  let totalTPOs = 0;
  for (const b of bins) {
    totalTPOs += b.tpos.length;
  }

  let maxTPOs = 0;
  let pocCandidates = [];
  for (const b of bins) {
    if (b.tpos.length > maxTPOs) {
      maxTPOs = b.tpos.length;
      pocCandidates = [b];
    } else if (b.tpos.length === maxTPOs && maxTPOs > 0) {
      pocCandidates.push(b);
    }
  }

  let pocPrice = bins[Math.floor(bins.length / 2)].price;
  if (pocCandidates.length > 0) {
    pocPrice = pocCandidates[Math.floor(pocCandidates.length / 2)].price;
  }

  let vahPrice = pocPrice;
  let valPrice = pocPrice;

  if (totalTPOs > 0 && maxTPOs > 0) {
    const targetTPOs = Math.round(totalTPOs * valueAreaPct);
    let currentTPOs = maxTPOs;

    const pocIdx = bins.findIndex(b => b.price === pocPrice);
    let upIdx = pocIdx - 1;
    let downIdx = pocIdx + 1;

    while (currentTPOs < targetTPOs && (upIdx >= 0 || downIdx < bins.length)) {
      let upTPOs = 0;
      if (upIdx >= 0) {
        upTPOs += bins[upIdx].tpos.length;
        if (upIdx - 1 >= 0) upTPOs += bins[upIdx - 1].tpos.length;
      }

      let downTPOs = 0;
      if (downIdx < bins.length) {
        downTPOs += bins[downIdx].tpos.length;
        if (downIdx + 1 < bins.length) downTPOs += bins[downIdx + 1].tpos.length;
      }

      if (upTPOs === 0 && downTPOs === 0) break;

      if (upTPOs >= downTPOs && upIdx >= 0) {
        currentTPOs += bins[upIdx].tpos.length;
        vahPrice = bins[upIdx].price;
        upIdx--;
      } else if (downIdx < bins.length) {
        currentTPOs += bins[downIdx].tpos.length;
        valPrice = bins[downIdx].price;
        downIdx++;
      } else if (upIdx >= 0) {
        currentTPOs += bins[upIdx].tpos.length;
        vahPrice = bins[upIdx].price;
        upIdx--;
      } else {
        break;
      }
    }
  }

  return { pocPrice, vahPrice, valPrice };
}

function calculateVolumeProfile(candles, tickSize, valueAreaPct = 0.70) {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  for (const c of sorted) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
  }
  
  const binsMap = {};
  const prices = [];
  const startPrice = Math.floor(dayLow / tickSize) * tickSize;
  const endPrice = Math.ceil(dayHigh / tickSize) * tickSize;
  
  for (let p = startPrice; p <= endPrice + tickSize / 2; p += tickSize) {
    const roundedPrice = Math.round(p * 100) / 100;
    binsMap[roundedPrice] = { price: roundedPrice, volume: 0 };
    prices.push(roundedPrice);
  }

  for (const c of sorted) {
    const candleSpanBins = prices.filter(p => p >= c.low - tickSize / 2 && p <= c.high + tickSize / 2);
    const binsToFill = candleSpanBins.length > 0 ? candleSpanBins : [prices[0]];
    const volPerBin = c.volume / binsToFill.length;
    for (const p of binsToFill) {
      binsMap[p].volume += volPerBin;
    }
  }

  const bins = prices.map(p => binsMap[p]).reverse();
  
  let maxVol = 0;
  let pocPrice = bins[Math.floor(bins.length / 2)].price;
  for (const b of bins) {
    if (b.volume > maxVol) {
      maxVol = b.volume;
      pocPrice = b.price;
    }
  }

  let totalVolume = 0;
  for (const b of bins) {
    totalVolume += b.volume;
  }

  let vahPrice = pocPrice;
  let valPrice = pocPrice;

  if (totalVolume > 0 && maxVol > 0) {
    const targetVol = totalVolume * valueAreaPct;
    let currentVol = maxVol;

    const pocIdx = bins.findIndex(b => b.price === pocPrice);
    let upIdx = pocIdx - 1;
    let downIdx = pocIdx + 1;

    while (currentVol < targetVol && (upIdx >= 0 || downIdx < bins.length)) {
      let upVol = 0;
      if (upIdx >= 0) {
        upVol += bins[upIdx].volume;
        if (upIdx - 1 >= 0) upVol += bins[upIdx - 1].volume;
      }

      let downVol = 0;
      if (downIdx < bins.length) {
        downVol += bins[downIdx].volume;
        if (downIdx + 1 < bins.length) downVol += bins[downIdx + 1].volume;
      }

      if (upVol === 0 && downVol === 0) break;

      if (upVol >= downVol && upIdx >= 0) {
        currentVol += bins[upIdx].volume;
        vahPrice = bins[upIdx].price;
        upIdx--;
      } else if (downIdx < bins.length) {
        currentVol += bins[downIdx].volume;
        valPrice = bins[downIdx].price;
        downIdx++;
      } else if (upIdx >= 0) {
        currentVol += bins[upIdx].volume;
        vahPrice = bins[upIdx].price;
        upIdx--;
      } else {
        break;
      }
    }
  }

  return { pocPrice, vahPrice, valPrice };
}

async function run() {
  const bridge = new TradingViewBridge();
  
  await bridge.subscribeSymbol("NSE:NIFTY", "30", (data) => {
    if (data.isSnapshot) {
      console.log(`✅ Loaded ${data.candles.length} candles.`);
      
      const targetWeekly = { vah: 24132, poc: 24084, val: 23960 };
      const targetMonthly = { vah: 24152, poc: 23960, val: 23328 };
      
      const weeklyCandles = data.candles.filter(c => {
        const d = new Date(c.time * 1000);
        return d.getTime() >= new Date("2026-06-17T09:15:00").getTime();
      });
      
      const monthlyCandles = data.candles.filter(c => {
        const d = new Date(c.time * 1000);
        return d.getTime() >= new Date("2026-05-27T09:15:00").getTime();
      });

      console.log("\nSweeping Weekly parameters...");
      for (const type of ['TPO', 'Volume']) {
        for (let tick = 1; tick <= 50; tick++) {
          for (let vaPct = 0.65; vaPct <= 0.75; vaPct += 0.005) {
            const res = type === 'TPO' 
              ? calculateTPOProfile(weeklyCandles, tick, vaPct, 'weekly')
              : calculateVolumeProfile(weeklyCandles, tick, vaPct);
            
            const err = Math.abs(res.vahPrice - targetWeekly.vah) + 
                        Math.abs(res.pocPrice - targetWeekly.poc) + 
                        Math.abs(res.valPrice - targetWeekly.val);
            
            if (err === 0) {
              console.log(`🎯 EXACT Weekly Match (${type}, tick=${tick}, vaPct=${vaPct.toFixed(3)}): VAH=${res.vahPrice}, POC=${res.pocPrice}, VAL=${res.valPrice}`);
            } else if (err < 10) {
              console.log(`Close Weekly Match (${type}, tick=${tick}, vaPct=${vaPct.toFixed(3)}): VAH=${res.vahPrice}, POC=${res.pocPrice}, VAL=${res.valPrice} [error=${err}]`);
            }
          }
        }
      }

      console.log("\nSweeping Monthly parameters...");
      for (const type of ['TPO', 'Volume']) {
        for (let tick = 1; tick <= 50; tick++) {
          for (let vaPct = 0.65; vaPct <= 0.75; vaPct += 0.005) {
            const res = type === 'TPO' 
              ? calculateTPOProfile(monthlyCandles, tick, vaPct, 'monthly')
              : calculateVolumeProfile(monthlyCandles, tick, vaPct);
            
            const err = Math.abs(res.vahPrice - targetMonthly.vah) + 
                        Math.abs(res.pocPrice - targetMonthly.poc) + 
                        Math.abs(res.valPrice - targetMonthly.val);
            
            if (err === 0) {
              console.log(`🎯 EXACT Monthly Match (${type}, tick=${tick}, vaPct=${vaPct.toFixed(3)}): VAH=${res.vahPrice}, POC=${res.pocPrice}, VAL=${res.valPrice}`);
            } else if (err < 20) {
              console.log(`Close Monthly Match (${type}, tick=${tick}, vaPct=${vaPct.toFixed(3)}): VAH=${res.vahPrice}, POC=${res.pocPrice}, VAL=${res.valPrice} [error=${err}]`);
            }
          }
        }
      }
      
      process.exit(0);
    }
  });
}

run().catch(process.exit);
