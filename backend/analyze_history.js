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
    const letter = String.fromCharCode(65 + (periodIdx % 26)); // wrapping A-Z
    
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
  let pocIdx = bins.length - 1;

  for (let i = bins.length - 1; i >= 0; i--) {
    const val = bins[i].tpos.length;
    if (val > maxTPOs) {
      maxTPOs = val;
      pocIdx = i;
    }
  }

  const pocPrice = bins[pocIdx].price;
  let vahPrice = pocPrice;
  let valPrice = pocPrice;

  if (totalTPOs > 0 && maxTPOs > 0) {
    const targetTPOs = Math.round(totalTPOs * 0.70);
    let currentTPOs = maxTPOs;

    // Define helper structure to track value area inclusion
    const isIncluded = new Array(bins.length).fill(false);
    isIncluded[pocIdx] = true;

    let L = 1; // step below POC
    let N = 1; // step above POC
    const j = bins.length;

    while (currentTPOs < targetTPOs) {
      const aboveIdx = pocIdx - N;
      const hasAbove = aboveIdx >= 0;
      const H = hasAbove ? bins[aboveIdx].tpos.length : 0;

      const belowIdx = pocIdx + L;
      const hasBelow = belowIdx < j;
      const V = hasBelow ? bins[belowIdx].tpos.length : 0;

      if (V <= H) {
        currentTPOs += H;
        if (hasAbove) {
          isIncluded[aboveIdx] = true;
          N++;
        }
      } else {
        currentTPOs += V;
        if (hasBelow) {
          isIncluded[belowIdx] = true;
          L++;
        }
      }

      if (V === 0) L++;
      if (H === 0) N++;
      if (L > j && N > j) break;
    }

    let firstAreaIdx = -1;
    let lastAreaIdx = -1;
    for (let i = 0; i < j; i++) {
      if (isIncluded[i]) {
        if (firstAreaIdx === -1) firstAreaIdx = i;
        lastAreaIdx = i;
      }
    }

    if (firstAreaIdx !== -1) {
      vahPrice = bins[firstAreaIdx].price;
      valPrice = bins[lastAreaIdx].price;
    }
  }

  let ibHigh = 0;
  let ibLow = 0;
  const firstPeriod = periodRanges[0];
  const secondPeriod = periodRanges[1];
  if (firstPeriod) {
    ibHigh = firstPeriod.high;
    ibLow = firstPeriod.low;
    if (secondPeriod) {
      ibHigh = Math.max(ibHigh, secondPeriod.high);
      ibLow = Math.min(ibLow, secondPeriod.low);
    }
  }

  return {
    dateStr,
    openPrice: sorted[0]?.open || 0,
    dayHigh,
    dayLow,
    tickSize,
    bins,
    pocPrice,
    vahPrice,
    valPrice,
    ibHigh,
    ibLow,
    totalTPOs,
    totalVolume,
    periodRanges,
  };
}

function getSinglePrints(profile) {
  const singlePrints = [];
  let currentStart = null;
  let currentEnd = null;

  const ascendingBins = [...profile.bins].reverse();
  const n = ascendingBins.length;

  for (let i = 2; i < n - 2; i++) {
    const bin = ascendingBins[i];
    if (bin.tpos.length === 1) {
      if (currentStart === null) currentStart = bin.price;
      currentEnd = bin.price;
    } else {
      if (currentStart !== null && currentEnd !== null) {
        singlePrints.push({ start: currentStart, end: currentEnd });
        currentStart = null;
        currentEnd = null;
      }
    }
  }
  if (currentStart !== null && currentEnd !== null) {
    singlePrints.push({ start: currentStart, end: currentEnd });
  }
  return singlePrints;
}

function analyzeNuances(active, prior, allProfiles, activeIdx) {
  let openRelationship = 'Inside Value';
  let otfType = 'none';
  let openingType = 'Open Auction (OA)';
  
  if (prior) {
    const open = active.openPrice;
    if (open > prior.dayHigh) openRelationship = 'Gap Up';
    else if (open < prior.dayLow) openRelationship = 'Gap Down';
    else if (open >= prior.valPrice && open <= prior.vahPrice) openRelationship = 'Inside Value';
    else openRelationship = 'Outside Value, Inside Range';
  }

  if (active.periodRanges) {
    const aRange = active.periodRanges[0];
    const bRange = active.periodRanges[1];
    const cRange = active.periodRanges[2];
    const open = active.openPrice;
    
    if (aRange && bRange) {
      const isLowNearOpen = Math.abs(open - aRange.low) <= active.tickSize * 3;
      const isHighNearOpen = Math.abs(open - aRange.high) <= active.tickSize * 3;
      
      if (isLowNearOpen && bRange.high > aRange.high && (!cRange || cRange.high >= bRange.high)) {
        openingType = 'Open Drive (OD) Bullish';
      } else if (isHighNearOpen && bRange.low < aRange.low && (!cRange || cRange.low <= bRange.low)) {
        openingType = 'Open Drive (OD) Bearish';
      } else if (aRange.high > open && open > aRange.low) {
        const testDown = (open - aRange.low) > active.tickSize * 3;
        const testUp = (aRange.high - open) > active.tickSize * 3;
        if (testDown && bRange.high > aRange.high) openingType = 'Open Test Drive (OTD) Bullish';
        else if (testUp && bRange.low < aRange.low) openingType = 'Open Test Drive (OTD) Bearish';
      }
      
      if (openingType === 'Open Auction (OA)' && cRange) {
        if ((bRange.high > aRange.high && bRange.low < aRange.low) || 
            (bRange.high > aRange.high && cRange.low < aRange.low) || 
            (bRange.low < aRange.low && cRange.high > aRange.high)) {
          openingType = 'Open Rejection Reverse (ORR)';
        }
      }
    }

    if (aRange && bRange && cRange) {
      if (bRange.low >= aRange.low && cRange.low >= bRange.low) otfType = 'up';
      else if (bRange.high <= aRange.high && cRange.high <= bRange.high) otfType = 'down';
    }
  }

  let dFailure = false;
  let eFailure = 'none';
  if (otfType !== 'none' && active.periodRanges) {
    const dRange = active.periodRanges[3];
    const eRange = active.periodRanges[4];
    const fRange = active.periodRanges[5];
    if (dRange && eRange) {
      if (eRange.high <= dRange.high && eRange.low >= dRange.low) dFailure = true;
      if (fRange) {
        if (otfType === 'up' && eRange.high > dRange.high && fRange.high <= eRange.high) eFailure = 'high';
        else if (otfType === 'down' && eRange.low < dRange.low && fRange.low >= eRange.low) eFailure = 'low';
      }
    }
  }

  return {
    openRelationship,
    openingType,
    otfType,
    dFailure,
    eFailure,
  };
}

function fetchSymbolData(bridge, symbol) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    bridge.subscribeSymbol(symbol, '30', (data) => {
      if (data.isSnapshot) {
        resolved = true;
        resolve(data.candles);
      }
    }, (err) => {
      reject(err);
    }).catch(reject);
  });
}

async function runAnalysis() {
  const bridge = new TradingViewBridge();
  console.log('[Analysis] Connecting to TradingView to fetch history...');
  
  const symbols = ['NSE:NIFTY', 'NSE:BANKNIFTY', 'NSE:RELIANCE', 'NSE:HDFCBANK'];
  let markdown = `# Market Profile Analysis Report\n\n`;
  markdown += `*Generated automatically on: 2026-06-20*\n\n`;
  markdown += `This report lists the historical profile signals, opening types, OTF activity, and how the market reacted to yesterday's reference levels.\n\n`;

  for (const sym of symbols) {
    console.log(`[Analysis] Processing symbol ${sym}...`);
    try {
      const candles = await fetchSymbolData(bridge, sym);
      console.log(`[Analysis] Snapshot loaded. Processing ${candles.length} candles.`);
      
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      markdown += `# Instrument: ${sym.split(':')[1]}\n\n`;
      markdown += `## Daily Session Log & Market Reaction\n\n`;
      
      for (let i = 1; i < profiles.length; i++) {
        const prior = profiles[i - 1];
        const active = profiles[i];
        
        const nuances = analyzeNuances(active, prior, profiles, i);
        
        // Check reaction to prior day levels
        const touchedPoc = active.dayLow <= prior.pocPrice && active.dayHigh >= prior.pocPrice;
        const touchedVah = active.dayLow <= prior.vahPrice && active.dayHigh >= prior.vahPrice;
        const touchedVal = active.dayLow <= prior.valPrice && active.dayHigh >= prior.valPrice;
        
        // Check if prior poor extremes were cleared today
        const priorPoorHigh = prior.bins.length > 0 && prior.bins[0].tpos.length >= 2;
        const priorPoorLow = prior.bins.length > 0 && prior.bins[prior.bins.length - 1].tpos.length >= 2;
        const clearedPriorPoorHigh = priorPoorHigh && active.dayHigh > prior.dayHigh;
        const clearedPriorPoorLow = priorPoorLow && active.dayLow < prior.dayLow;

        markdown += `### Session Date: **${active.dateStr}**\n`;
        markdown += `- **Open Details**: Open Price: \`${active.openPrice.toFixed(2)}\` | High: \`${active.dayHigh.toFixed(2)}\` | Low: \`${active.dayLow.toFixed(2)}\` | Close: \`${active.closePrice || active.bins[0]?.price.toFixed(2)}\`\n`;
        markdown += `- **Opening Setup**: \`${nuances.openRelationship}\` | Opening Type: \`${nuances.openingType}\` | OTF: \`${nuances.otfType.toUpperCase()}\`\n`;
        
        if (nuances.dFailure || nuances.eFailure !== 'none') {
          markdown += `- **Auction Failures**: ${nuances.dFailure ? '🔴 d-Failure (exhaustion inside bar) ' : ''}${nuances.eFailure !== 'none' ? `🔴 e-Failure (${nuances.eFailure} extreme failed follow-through) ` : ''}\n`;
        } else {
          markdown += `- **Auction Quality**: Secure Extremes (No failures detected)\n`;
        }
        
        markdown += `- **Market Reactions to Prior Session (${prior.dateStr})**:\n`;
        markdown += `  - **Level Tests**: ${touchedPoc ? '✅ Tested Prior POC ' : '❌ Prior POC Untested '} | ${touchedVah ? '✅ Tested Prior VAH ' : '❌ Prior VAH Untested '} | ${touchedVal ? '✅ Tested Prior VAL ' : '❌ Prior VAL Untested '}\n`;
        
        if (priorPoorHigh) {
          markdown += `  - **Poor High Resolution**: Yesterday had a Poor High. Today ${clearedPriorPoorHigh ? '✅ CLEARED IT' : '❌ FAILED to clear it (remains unfinished)'}.\n`;
        }
        if (priorPoorLow) {
          markdown += `  - **Poor Low Resolution**: Yesterday had a Poor Low. Today ${clearedPriorPoorLow ? '✅ CLEARED IT' : '❌ FAILED to clear it (remains unfinished)'}.\n`;
        }

        const ibRange = active.ibHigh - active.ibLow;
        if (nuances.otfType === 'up' && ibRange > 0) {
          const target = active.ibLow + 2.618 * ibRange;
          const hitTarget = active.dayHigh >= target;
          markdown += `  - **IB Extension Up Target (2.618x)**: target \`${target.toFixed(2)}\` was ${hitTarget ? '🎯 HIT' : '❌ MISSED'}\n`;
        } else if (nuances.otfType === 'down' && ibRange > 0) {
          const target = active.ibHigh - 2.618 * ibRange;
          const hitTarget = active.dayLow <= target;
          markdown += `  - **IB Extension Down Target (2.618x)**: target \`${target.toFixed(2)}\` was ${hitTarget ? '🎯 HIT' : '❌ MISSED'}\n`;
        }
        
        markdown += `\n---\n\n`;
      }
      markdown += `\n---\n\n`;
    } catch (err) {
      console.error(`[Analysis] Error processing ${sym}:`, err);
    }
  }

  // Save report as an artifact
  const artifactDir = 'C:\\Users\\mihir\\.gemini\\antigravity\\brain\\0d19a8b8-947a-40b3-bff1-c041605b3a93';
  const filepath = path.join(artifactDir, 'market_analysis_report.md');
  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`[Analysis] Successfully generated and saved report at ${filepath}`);
  
  // Also save a copy to the project root for easy user access
  try {
    const projectRootPath = path.resolve(__dirname, '..');
    const projectFilepath = path.join(projectRootPath, 'market_analysis_report.md');
    fs.writeFileSync(projectFilepath, markdown, 'utf8');
    console.log(`[Analysis] Successfully logged project copy at ${projectFilepath}`);
  } catch (err) {
    console.error('[Analysis] Failed to save project copy:', err);
  }
  
  process.exit(0);
}

runAnalysis();
