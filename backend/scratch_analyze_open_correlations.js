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
  console.log('Connecting to TradingView WebSocket and fetching NIFTY / BANKNIFTY historical sessions...');
  const symbols = ['NSE:NIFTY', 'NSE:BANKNIFTY'];
  
  for (const sym of symbols) {
    try {
      const candles = await fetchSymbolData(bridge, sym);
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      console.log(`\n==========================================`);
      console.log(`📊 Open Correlation Analysis for ${sym} (${profiles.length} days analyzed)`);
      console.log(`==========================================`);

      // Initialize counters
      const closePositionStats = {
        'Above VAH': { gapUp: 0, gapDown: 0, insideRange: 0, total: 0 },
        'Below VAL': { gapUp: 0, gapDown: 0, insideRange: 0, total: 0 },
        'Inside Value': { gapUp: 0, gapDown: 0, insideRange: 0, total: 0 }
      };

      for (let i = 1; i < profiles.length; i++) {
        const prior = profiles[i - 1];
        const active = profiles[i];
        
        let closePos = 'Inside Value';
        if (prior.closePrice > prior.vahPrice) {
          closePos = 'Above VAH';
        } else if (prior.closePrice < prior.valPrice) {
          closePos = 'Below VAL';
        }

        let openType = 'insideRange';
        if (active.openPrice > prior.dayHigh) {
          openType = 'gapUp';
        } else if (active.openPrice < prior.dayLow) {
          openType = 'gapDown';
        }

        closePositionStats[closePos][openType]++;
        closePositionStats[closePos].total++;
      }

      // Print statistics
      Object.entries(closePositionStats).forEach(([pos, stats]) => {
        console.log(`\nWhen previous day closed [${pos}] (sample size: ${stats.total}):`);
        if (stats.total > 0) {
          console.log(`  - 🚀 Next Day Gap Up: ${((stats.gapUp / stats.total) * 100).toFixed(1)}% (${stats.gapUp} times)`);
          console.log(`  - 📉 Next Day Gap Down: ${((stats.gapDown / stats.total) * 100).toFixed(1)}% (${stats.gapDown} times)`);
          console.log(`  - ↔️ Next Day Inside Range Open: ${((stats.insideRange / stats.total) * 100).toFixed(1)}% (${stats.insideRange} times)`);
        } else {
          console.log(`  No samples available.`);
        }
      });
      
    } catch (e) {
      console.error(`Error analyzing ${sym}:`, e.message);
    }
  }
  process.exit(0);
}

analyze();
