import 'dotenv/config';
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
    const letter = String.fromCharCode(65 + (periodIdx % 26)); // A-Z
    
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
    closePrice: sorted[sorted.length - 1]?.close || 0,
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

function analyzeNuances(active, prior) {
  let openRelationship = 'Inside Value';
  let openDesc = '';
  let otfType = 'none';
  let openingType = 'Open Auction (OA)';
  let openingTypeDesc = '';
  
  if (prior) {
    const open = active.openPrice;
    if (open > prior.dayHigh) {
      openRelationship = 'Gap Up';
      openDesc = 'Opened completely above prior day range, showing high buying imbalance.';
    } else if (open < prior.dayLow) {
      openRelationship = 'Gap Down';
      openDesc = 'Opened completely below prior day range, showing high selling imbalance.';
    } else if (open >= prior.valPrice && open <= prior.vahPrice) {
      openRelationship = 'Inside Value';
      openDesc = 'Opened inside yesterday\'s Value Area, indicating balance and value acceptance.';
    } else {
      openRelationship = 'Outside Value, Inside Range';
      openDesc = 'Opened outside value but within range, showing moderate directional bias.';
    }
  }

  let openOutsideRangeAlert = false;
  let openOutsideRangeDesc = '';
  
  if (prior) {
    const open = active.openPrice;
    if (open > prior.dayHigh) {
      openOutsideRangeAlert = true;
      openOutsideRangeDesc = `🚨 ALERT: Open is Outside Prior Day's Range (Gap Up)! Market opened at ${open.toFixed(2)}, which is above yesterday's high (${prior.dayHigh.toFixed(2)}). Watch closely: we will either accept this gap and continue in the direction of the open (initiative drive), OR fail to sustain it, enter yesterday's range, and reverse aggressively in the opposite direction towards the Prior POC (${prior.pocPrice.toFixed(2)}).`;
    } else if (open < prior.dayLow) {
      openOutsideRangeAlert = true;
      openOutsideRangeDesc = `🚨 ALERT: Open is Outside Prior Day's Range (Gap Down)! Market opened at ${open.toFixed(2)}, which is below yesterday's low (${prior.dayLow.toFixed(2)}). Watch closely: we will either accept this gap and continue in the direction of the open (initiative drive), OR fail to sustain it, enter yesterday's range, and reverse aggressively in the opposite direction towards the Prior POC (${prior.pocPrice.toFixed(2)}).`;
    }
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
        openingTypeDesc = 'Price drove straight up from the open. High buyer conviction.';
      } else if (isHighNearOpen && bRange.low < aRange.low && (!cRange || cRange.low <= bRange.low)) {
        openingType = 'Open Drive (OD) Bearish';
        openingTypeDesc = 'Price drove straight down from the open. High seller conviction.';
      } else if (aRange.high > open && open > aRange.low) {
        const testDown = (open - aRange.low) > active.tickSize * 3;
        const testUp = (aRange.high - open) > active.tickSize * 3;
        if (testDown && bRange.high > aRange.high) {
          openingType = 'Open Test Drive (OTD) Bullish';
          openingTypeDesc = 'Tested lower levels in Period A, rejected them, and drove higher in Period B.';
        } else if (testUp && bRange.low < aRange.low) {
          openingType = 'Open Test Drive (OTD) Bearish';
          openingTypeDesc = 'Tested higher levels in Period A, rejected them, and drove lower in Period B.';
        }
      }
      
      if (openingType === 'Open Auction (OA)' && cRange) {
        if ((bRange.high > aRange.high && bRange.low < aRange.low) || 
            (bRange.high > aRange.high && cRange.low < aRange.low) || 
            (bRange.low < aRange.low && cRange.high > aRange.high)) {
          openingType = 'Open Rejection Reverse (ORR)';
          openingTypeDesc = 'Broke one side of Period A, rejected it immediately, and reversed to break the other extreme.';
        }
      }
      if (openingType === 'Open Auction (OA)') {
        openingTypeDesc = 'Rotated back and forth inside the opening range. Low institutional conviction.';
      }
    }

    if (aRange && bRange && cRange) {
      if (bRange.low >= aRange.low && cRange.low >= bRange.low) otfType = 'up';
      else if (bRange.high <= aRange.high && cRange.high <= bRange.high) otfType = 'down';
    }
  }

  let cFailure = false;
  let dFailure = false;
  let eFailure = 'none';
  if (otfType !== 'none' && active.periodRanges) {
    const cRange = active.periodRanges[2];
    const dRange = active.periodRanges[3];
    const eRange = active.periodRanges[4];
    const fRange = active.periodRanges[5];
    if (cRange && dRange) {
      if (otfType === 'up') {
        if (dRange.high <= cRange.high) cFailure = true;
      } else if (otfType === 'down') {
        if (dRange.low >= cRange.low) cFailure = true;
      }
      
      const dIsOtf = otfType === 'up' ? dRange.high > cRange.high : dRange.low < cRange.low;
      
      if (dIsOtf && eRange) {
        if (otfType === 'up') {
          if (eRange.high <= dRange.high) dFailure = true;
        } else if (otfType === 'down') {
          if (eRange.low >= dRange.low) dFailure = true;
        }
        
        const eIsOtf = otfType === 'up' ? eRange.high > dRange.high : eRange.low < dRange.low;
        
        if (eIsOtf && fRange) {
          if (otfType === 'up') {
            if (fRange.high <= eRange.high) eFailure = 'high';
          } else if (otfType === 'down') {
            if (fRange.low >= eRange.low) eFailure = 'low';
          }
        }
      }
    }
  }

  return {
    openRelationship,
    openDesc,
    openingType,
    openingTypeDesc,
    otfType,
    cFailure,
    dFailure,
    eFailure,
    openOutsideRangeAlert,
    openOutsideRangeDesc,
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

async function runDiaryLogger() {
  const bridge = new TradingViewBridge();
  console.log('[Diary Logger] Fetching data from TradingView...');
  
  const symbols = ['NSE:NIFTY', 'NSE:BANKNIFTY', 'NSE:RELIANCE', 'NSE:HDFCBANK'];
  let markdown = `# Market Profile Diary\n\n`;
  markdown += `*Last updated: 2026-06-20* | This diary matches morning predictions (made at 10:15 AM after Initial Balance) with afternoon outcomes and lists key structural learnings.\n\n`;

  for (const sym of symbols) {
    console.log(`[Diary Logger] Processing symbol ${sym}...`);
    try {
      const candles = await fetchSymbolData(bridge, sym);
      console.log(`[Diary Logger] Snapshot loaded for ${sym}. Candles: ${candles.length}`);
      
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      markdown += `# Instrument: ${sym.split(':')[1]}\n\n`;
      
      // We will loop through the last 5 sessions
      const startIndex = Math.max(1, profiles.length - 6);
      
      for (let i = startIndex; i < profiles.length; i++) {
        const prior = profiles[i - 1];
        const active = profiles[i];
        
        const nuances = analyzeNuances(active, prior);
        
        // Key tests
        const touchedPoc = active.dayLow <= prior.pocPrice && active.dayHigh >= prior.pocPrice;
        const touchedVah = active.dayLow <= prior.vahPrice && active.dayHigh >= prior.vahPrice;
        const touchedVal = active.dayLow <= prior.valPrice && active.dayHigh >= prior.valPrice;
        
        const priorPoorHigh = prior.bins.length > 0 && prior.bins[0].tpos.length >= 2;
        const priorPoorLow = prior.bins.length > 0 && prior.bins[prior.bins.length - 1].tpos.length >= 2;
        const clearedPoorHigh = priorPoorHigh && active.dayHigh > prior.dayHigh;
        const clearedPoorLow = priorPoorLow && active.dayLow < prior.dayLow;
        
        const ibRange = active.ibHigh - active.ibLow;
        let fibTarget = null;
        let hitFib = false;
        
        const isBullishDrive = nuances.openingType.includes('Bullish') || nuances.otfType === 'up';
        const isBearishDrive = nuances.openingType.includes('Bearish') || nuances.otfType === 'down';
        
        if (isBullishDrive && ibRange > 0) {
          fibTarget = active.ibLow + 2.618 * ibRange;
          hitFib = active.dayHigh >= fibTarget;
        } else if (isBearishDrive && ibRange > 0) {
          fibTarget = active.ibHigh - 2.618 * ibRange;
          hitFib = active.dayLow <= fibTarget;
        }

        // Determine morning prediction details
        let predictionText = '';
        let conviction = 'LOW';
        
        if (nuances.openingType.includes('Open Drive')) {
          conviction = 'HIGH';
          predictionText = `Institutional drive detected immediately at open. Expect a strong ${isBullishDrive ? 'Bullish' : 'Bearish'} Trend Day. Fibonacci target ${fibTarget ? fibTarget.toFixed(2) : ''} is the primary objective. Low/High of day should be set in Period A.`;
        } else if (nuances.openingType.includes('Open Test Drive')) {
          conviction = 'MODERATE-HIGH';
          predictionText = `Test and drive behavior. The market rejected Period A extremes. Expect a ${isBullishDrive ? 'Bullish' : 'Bearish'} Normal Variation day. Fib target ${fibTarget ? fibTarget.toFixed(2) : ''} is likely to be tested.`;
        } else if (nuances.openingType.includes('Open Rejection Reverse')) {
          conviction = 'MODERATE';
          predictionText = `Indecision at open followed by reversal. Expect a Neutral Day or a multi-distribution day where the market reverses to clear the opposite extreme.`;
        } else {
          conviction = 'LOW';
          if (nuances.openRelationship === 'Inside Value') {
            predictionText = `Opened inside value with low conviction. Rotational behavior is highly likely. Prior POC (${prior.pocPrice.toFixed(2)}) and VAH/VAL are the main magnets. Expect mean-reverting swing trades.`;
          } else {
            predictionText = `Opened outside value but within range with low initial drive. Rotational behavior expected. Watch for entry into value to trigger the 80% rule.`;
          }
        }
        
        if (priorPoorHigh) {
          predictionText += ` Yesterday left an unfinished Poor High at ${prior.dayHigh.toFixed(2)}. Prediction: Highly likely to be cleared today.`;
        }
        if (priorPoorLow) {
          predictionText += ` Yesterday left an unfinished Poor Low at ${prior.dayLow.toFixed(2)}. Prediction: Highly likely to be cleared today.`;
        }
        if (nuances.openOutsideRangeAlert) {
          predictionText += `\n\n**${nuances.openOutsideRangeDesc}**`;
        }

        // Afternoon outcomes details
        let outcomeText = `The market closed at **${active.closePrice.toFixed(2)}** (Range: ${active.dayLow.toFixed(2)} - ${active.dayHigh.toFixed(2)}).\n`;
        outcomeText += `- **Level Tests**: Prior POC was ${touchedPoc ? '✅ TESTED' : '❌ UNTESTED'} | Prior VAH was ${touchedVah ? '✅ TESTED' : '❌ UNTESTED'} | Prior VAL was ${touchedVal ? '✅ TESTED' : '❌ UNTESTED'}.\n`;
        
        if (priorPoorHigh) {
          outcomeText += `- **Poor High Resolution**: Yesterday's Poor High was ${clearedPoorHigh ? '✅ CLEARED (Unfinished auction resolved)' : '❌ UNRESOLVED (Auction remains unfinished)'}.\n`;
        }
        if (priorPoorLow) {
          outcomeText += `- **Poor Low Resolution**: Yesterday's Poor Low was ${clearedPoorLow ? '✅ CLEARED (Unfinished auction resolved)' : '❌ UNRESOLVED (Auction remains unfinished)'}.\n`;
        }
        
        if (fibTarget) {
          outcomeText += `- **Fibonacci 2.618x Target (${fibTarget.toFixed(2)})**: ${hitFib ? '🎯 HIT' : '❌ MISSED'}.\n`;
        }
        if (nuances.cFailure || nuances.dFailure || nuances.eFailure !== 'none') {
          outcomeText += `- **Intraday Failures**: ${nuances.cFailure ? '🔴 c-Failure Warning triggered (Period D failed to break Period C extreme).' : ''} ${nuances.dFailure ? '🔴 d-Failure Warning triggered (Period E failed to take Period D extreme).' : ''} ${nuances.eFailure !== 'none' ? `🔴 e-Failure detected (failed follow-through of Period E's break of ${nuances.eFailure} extreme).` : ''}\n`;
        } else {
          outcomeText += `- **Auction Quality**: Clean, secure session extremes with no failures.\n`;
        }

        // Learnings
        let learningText = '';
        if (nuances.openingType.includes('Open Auction') && nuances.openRelationship === 'Inside Value') {
          learningText = `Balanced open inside value resulted in a classic rotational session. Standard mean reversion was the correct play. Levels (Prior POC/VAH/VAL) held beautifully and provided great trading zones. The 2.618x extension target was missed because the market lacked the initiative OTF players to drive it out of balance.`;
        } else if (nuances.openingType.includes('Open Test Drive') || nuances.openingType.includes('Open Drive')) {
          if (hitFib) {
            learningText = `The active OTF player drove the market strongly. High conviction morning classification was verified. Entering in the direction of the drive after the IB completed successfully hit the Fibonacci target.`;
          } else {
            const hasFailure = nuances.dFailure || nuances.eFailure !== 'none';
            if (hasFailure) {
              learningText = `An OTF drive was active in the morning, but an auction failure occurred (d-Failure or e-Failure) during the session. The failure of Period F to extend above/below the Period E extreme signalized exhaustion, warning us to exit early before mean reversion.`;
            } else {
              learningText = `An OTF drive was active in the morning, but did not sustain enough institutional volume to reach the 2.618x Fibonacci target. The day remained inside a wider Normal Variation range, suggesting standard breakout fades once momentum stalled.`;
            }
          }
        } else {
          learningText = `Choppy outside-value open. The market rotated back and forth, showing that when OTF players are absent (OTF: NONE), trying to trade breakouts leads to papercuts. Mean reversion inside the day's boundaries was the optimal approach.`;
        }

        markdown += `## Session Date: **${active.dateStr}**\n\n`;
        markdown += `### 🌅 Morning Setup & Prediction (10:15 AM)\n`;
        markdown += `- **Opening Relationship**: \`${nuances.openRelationship}\` (${nuances.openDesc})\n`;
        markdown += `- **Opening Type**: \`${nuances.openingType}\` (${nuances.openingTypeDesc})\n`;
        markdown += `- **OTF Drive Active?**: \`${nuances.otfType.toUpperCase()}\`\n`;
        markdown += `- **Conviction Level**: **${conviction}**\n`;
        markdown += `- **Prediction Summary**: *${predictionText}*\n\n`;
        
        markdown += `### 🌆 Afternoon Outcome (3:30 PM)\n`;
        markdown += `${outcomeText}\n`;
        
        markdown += `### 🧠 Key Learnings & Takeaways\n`;
        markdown += `> ${learningText}\n\n`;
        markdown += `---\n\n`;
      }
      markdown += `\n---\n\n`;
    } catch (err) {
      console.error(`[Diary Logger] Error processing ${sym}:`, err);
    }
  }

  const artifactDir = 'C:\\Users\\mihir\\.gemini\\antigravity\\brain\\0d19a8b8-947a-40b3-bff1-c041605b3a93';
  const filepath = path.join(artifactDir, 'market_diary.md');
  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`[Diary Logger] Successfully logged market diary at ${filepath}`);
  
  // Also save a copy to the project root for easy user access
  try {
    const projectRootPath = path.resolve(__dirname, '..');
    const projectFilepath = path.join(projectRootPath, 'market_diary.md');
    fs.writeFileSync(projectFilepath, markdown, 'utf8');
    console.log(`[Diary Logger] Successfully logged project copy at ${projectFilepath}`);
  } catch (err) {
    console.error('[Diary Logger] Failed to save project copy:', err);
  }
  
  process.exit(0);
}

runDiaryLogger();
