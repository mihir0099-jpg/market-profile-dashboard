import { createSession, createChart, createSeries } from "@ch99q/twc";

function groupCandlesByDay(candles) {
  const groups = {};
  for (const candle of candles) {
    const date = new Date(candle.time * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(candle);
  }
  return groups;
}

function calculateDayProfile(dateStr, dayCandles, binCount = 40) {
  const sorted = [...dayCandles].sort((a, b) => a.time - b.time);
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  let totalVolume = 0;
  
  for (const c of sorted) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
    totalVolume += c.volume;
  }
  
  if (dayHigh === -Infinity || dayLow === Infinity || dayHigh === dayLow) {
    return null;
  }
  
  const range = dayHigh - dayLow;
  const rawTickSize = range / binCount;
  let tickSize = rawTickSize;
  if (tickSize > 1) {
    tickSize = Math.round(tickSize * 10) / 10;
  } else if (tickSize > 0.1) {
    tickSize = Math.round(tickSize * 100) / 100;
  } else if (tickSize > 0.01) {
    tickSize = Math.round(tickSize * 1000) / 1000;
  } else {
    tickSize = Math.round(tickSize * 10000) / 10000;
  }
  if (tickSize === 0) tickSize = rawTickSize;

  const startPrice = Math.floor(dayLow / tickSize) * tickSize;
  const endPrice = Math.ceil(dayHigh / tickSize) * tickSize;
  
  const binsMap = {};
  const prices = [];
  
  for (let p = startPrice; p <= endPrice + tickSize / 2; p += tickSize) {
    const roundedPrice = Math.round(p * 100000) / 100000;
    binsMap[roundedPrice] = {
      price: roundedPrice,
      tpos: [],
      volume: 0,
    };
    prices.push(roundedPrice);
  }
  
  const sessionStart = sorted[0].time;
  const periodRanges = {};
  
  for (const c of sorted) {
    const elapsedSeconds = c.time - sessionStart;
    const periodIndex = Math.floor(elapsedSeconds / (30 * 60));
    
    if (!periodRanges[periodIndex]) {
      periodRanges[periodIndex] = { high: -Infinity, low: Infinity };
    }
    if (c.high > periodRanges[periodIndex].high) periodRanges[periodIndex].high = c.high;
    if (c.low < periodRanges[periodIndex].low) periodRanges[periodIndex].low = c.low;

    const candleSpanBins = prices.filter(p => p >= c.low - tickSize / 2 && p <= c.high + tickSize / 2);
    const binsToFill = candleSpanBins.length > 0 ? candleSpanBins : [prices[0]];
    const volPerBin = c.volume / binsToFill.length;
    for (const p of binsToFill) {
      binsMap[p].volume += volPerBin;
    }
  }

  Object.entries(periodRanges).forEach(([pIdxStr, r]) => {
    const periodIdx = parseInt(pIdxStr, 10);
    const letter = String.fromCharCode(65 + (periodIdx % 26));
    
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
  for (const b of bins) totalTPOs += b.tpos.length;

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
    const targetTPOs = Math.round(totalTPOs * 0.70);
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

  return {
    dateStr,
    dayHigh,
    dayLow,
    pocPrice,
    vahPrice,
    valPrice
  };
}

async function test() {
  const session = await createSession();
  const chart = await createChart(session);
  const symbol = await chart.resolve("BTCUSD", "BINANCE");
  const series = await createSeries(session, chart, symbol, "30", 300);
  
  const groups = groupCandlesByDay(series.history.map(c => ({
    time: c[0],
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
    volume: c[5]
  })));
  
  const dates = Object.keys(groups).sort();
  console.log("Found dates:", dates);
  
  for (let i = Math.max(0, dates.length - 5); i < dates.length; i++) {
    const date = dates[i];
    const profile = calculateDayProfile(date, groups[date], 40);
    if (profile) {
      console.log(`Date: ${date}`);
      console.log(`  Day High: ${profile.dayHigh}, Day Low: ${profile.dayLow}`);
      console.log(`  POC Price: ${profile.pocPrice}`);
      console.log(`  VAH Price: ${profile.vahPrice}, VAL Price: ${profile.valPrice}`);
    }
  }
  
  await series.close();
  await chart.close();
  await session.close();
}

test().catch(err => {
  console.error("Test error:", err);
});
