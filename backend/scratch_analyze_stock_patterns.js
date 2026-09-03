import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function checkBuyingTail(profile) {
  const bins = profile.bins;
  if (!bins || bins.length < 3) return false;
  let count = 0;
  for (let i = bins.length - 1; i >= 0; i--) {
    if (bins[i].tpos && bins[i].tpos.length === 1) {
      count++;
    } else {
      break;
    }
  }
  return count >= 2;
}

function getProfileShape(profile) {
  if (!profile || !profile.bins || profile.bins.length === 0) return 'none';
  const totalHeight = profile.dayHigh - profile.dayLow;
  if (totalHeight <= 0) return 'none';
  const pocPct = (profile.pocPrice - profile.dayLow) / totalHeight;
  
  if (pocPct >= 0.6) {
    return 'P-shape';
  } else if (pocPct <= 0.4) {
    return 'b-shape';
  }
  return 'normal';
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
  const tickSize = range / binCount;

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
    
    let upLimitIdx = pocIdx;
    let downLimitIdx = pocIdx;

    while (currentTPOs < targetTPOs) {
      const hasAbove = upLimitIdx - 2 >= 0;
      const hasBelow = downLimitIdx + 2 < bins.length;

      const aboveTPOs = hasAbove ? (bins[upLimitIdx - 1].tpos.length + bins[upLimitIdx - 2].tpos.length) : 0;
      const belowTPOs = hasBelow ? (bins[downLimitIdx + 1].tpos.length + bins[downLimitIdx + 2].tpos.length) : 0;

      if (!hasAbove && !hasBelow) break;

      if (aboveTPOs >= belowTPOs && hasAbove) {
        currentTPOs += bins[upLimitIdx - 1].tpos.length + bins[upLimitIdx - 2].tpos.length;
        upLimitIdx -= 2;
      } else if (hasBelow) {
        currentTPOs += bins[downLimitIdx + 1].tpos.length + bins[downLimitIdx + 2].tpos.length;
        downLimitIdx += 2;
      } else {
        if (hasAbove) {
          currentTPOs += bins[upLimitIdx - 1].tpos.length;
          upLimitIdx -= 1;
        } else if (hasBelow) {
          currentTPOs += bins[downLimitIdx + 1].tpos.length;
          downLimitIdx += 1;
        }
      }
    }

    vahPrice = bins[upLimitIdx].price;
    valPrice = bins[downLimitIdx].price;
  }

  return {
    dateStr,
    openPrice: sorted[0]?.open || 0,
    closePrice: sorted[sorted.length - 1]?.close || 0,
    dayHigh,
    dayLow,
    tickSize,
    bins,
    pocPrice,
    vahPrice,
    valPrice,
  };
}

function fetchSymbolData(bridge, symbol) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    bridge.subscribeSymbol(symbol, '30', (data) => {
      if (data.isSnapshot && !resolved) {
        resolved = true;
        resolve(data.candles);
      }
    }, (err) => {
      reject(err);
    }).catch(reject);
  });
}

async function analyze() {
  const bridge = new TradingViewBridge();
  console.log('Fetching NIFTY historical stock data for RELIANCE and HDFCBANK...');
  const symbols = ['NSE:RELIANCE', 'NSE:HDFCBANK'];
  
  for (const sym of symbols) {
    try {
      const candles = await fetchSymbolData(bridge, sym);
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      console.log(`\n==========================================`);
      console.log(`📈 Bullish Continuation Study for ${sym} (${profiles.length} days analyzed)`);
      console.log(`==========================================`);

      // Stats counters for setups
      let closeAboveVahTotal = 0;
      let closeAboveVahSuccess = 0;

      let buyingTailTotal = 0;
      let buyingTailSuccess = 0;

      let risingPocTotal = 0;
      let risingPocSuccess = 0;

      let pShapeTotal = 0;
      let pShapeSuccess = 0;

      for (let i = 1; i < profiles.length; i++) {
        const prior = profiles[i - 1];
        const active = profiles[i];
        
        const isClosedHigher = active.closePrice > prior.closePrice;

        // Setup 1: Prior day closed above VAH
        if (prior.closePrice > prior.vahPrice) {
          closeAboveVahTotal++;
          if (isClosedHigher) closeAboveVahSuccess++;
        }

        // Setup 2: Prior day had buying tail
        const hasTail = checkBuyingTail(prior);
        if (hasTail) {
          buyingTailTotal++;
          if (isClosedHigher) buyingTailSuccess++;
        }

        // Setup 3: Rising POC
        if (i >= 2 && prior.pocPrice > profiles[i - 2].pocPrice) {
          risingPocTotal++;
          if (isClosedHigher) risingPocSuccess++;
        }

        // Setup 4: P-Shape profile
        const shape = getProfileShape(prior);
        if (shape === 'P-shape') {
          pShapeTotal++;
          if (isClosedHigher) pShapeSuccess++;
        }
      }

      console.log(`Probability of stock closing HIGHER on the next day:`);
      
      console.log(`\n1. When previous day closed [Above VAH]:`);
      if (closeAboveVahTotal > 0) {
        console.log(`   - Success: ${((closeAboveVahSuccess / closeAboveVahTotal) * 100).toFixed(1)}% (${closeAboveVahSuccess}/${closeAboveVahTotal})`);
      } else console.log(`   - No samples.`);

      console.log(`\n2. When previous day printed a [Buying Tail] (rejection of low):`);
      if (buyingTailTotal > 0) {
        console.log(`   - Success: ${((buyingTailSuccess / buyingTailTotal) * 100).toFixed(1)}% (${buyingTailSuccess}/${buyingTailTotal})`);
      } else console.log(`   - No samples.`);

      console.log(`\n3. When [POC is Rising] (value migration upwards):`);
      if (risingPocTotal > 0) {
        console.log(`   - Success: ${((risingPocSuccess / risingPocTotal) * 100).toFixed(1)}% (${risingPocSuccess}/${risingPocTotal})`);
      } else console.log(`   - No samples.`);

      console.log(`\n4. When previous day formed a [P-Shape Profile] (short covering):`);
      if (pShapeTotal > 0) {
        console.log(`   - Success: ${((pShapeSuccess / pShapeTotal) * 100).toFixed(1)}% (${pShapeSuccess}/${pShapeTotal})`);
      } else console.log(`   - No samples.`);

    } catch (e) {
      console.error(`Error analyzing ${sym}:`, e.message);
    }
  }
  process.exit(0);
}

analyze();
