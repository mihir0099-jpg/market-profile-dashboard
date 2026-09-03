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

function calculateDayProfile(dateStr, dayCandles, tickSize) {
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
    const istSeconds = c.time + 19800;
    const istDate = new Date(istSeconds * 1000);
    const hour = istDate.getUTCHours();
    const min = istDate.getUTCMinutes();
    const minsFromOpen = (hour * 60 + min) - (9 * 60 + 15);
    let periodIndex = Math.floor(minsFromOpen / 30);
    if (periodIndex < 0) periodIndex = 0;
    
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
    const isIncluded = new Array(bins.length).fill(false);
    isIncluded[pocIdx] = true;

    let L = 1;
    let N = 1;
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
    closePrice: sorted[sorted.length - 1]?.close || 0,
  };
}

function fetchSymbolData(bridge, symbol, limit = 5000) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    bridge.subscribeSymbol(symbol, '30', (data) => {
      if (data.isSnapshot) {
        resolved = true;
        resolve(data.candles);
      }
    }, (err) => {
      reject(err);
    }, limit).catch(reject);
  });
}

async function runBacktest() {
  const bridge = new TradingViewBridge();
  console.log('[Backtest] Fetching historical data (5000 candles)...');
  
  const niftyCandles = await fetchSymbolData(bridge, 'NSE:NIFTY', 5000);
  const bankniftyCandles = await fetchSymbolData(bridge, 'NSE:BANKNIFTY', 5000);
  
  const niftyGroups = groupCandlesByDay(niftyCandles);
  const bankniftyGroups = groupCandlesByDay(bankniftyCandles);

  let markdown = `# 📊 Categorized Poor Low Reversal & Repair Extended Backtest Report\n\n`;
  markdown += `*Generated on: ${new Date().toISOString().split('T')[0]}*\n`;
  markdown += `*Backtest Period: Last 5000 candles (~384 market sessions)*\n\n`;
  markdown += `This report provides an extended backtest analysis of **Poor Lows** (daily lows printed with no excess, having multiple TPOs in the bottom-most price bin) grouped by structural formation type:\n\n`;
  
  markdown += `1. **AB Morning Poor Lows:** Low established in Period A and/or B (9:15 AM - 10:15 AM IST).\n`;
  markdown += `2. **BC Lunchtime Poor Lows:** Low established in Period B and C (9:45 AM - 10:45 AM IST, excluding A).\n`;
  markdown += `3. **Late-Day Poor Lows:** Low established in afternoon sessions (after 10:45 AM IST, periods D to M).\n\n`;

  markdown += `> [!IMPORTANT]\n`;
  markdown += `> Standard structural tick sizes of **10 points for Nifty** and **30 points for Bank Nifty** are used to prevent micro-tick noise from splitting the profile extremes.\n\n`;

  const configs = [
    { name: 'NIFTY', groups: niftyGroups, tickSize: 10 },
    { name: 'BANKNIFTY', groups: bankniftyGroups, tickSize: 30 }
  ];

  configs.forEach(cfg => {
    const profiles = Object.entries(cfg.groups).map(([dateStr, dayCandles]) => {
      return calculateDayProfile(dateStr, dayCandles, cfg.tickSize);
    }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    const totalSessions = profiles.length;
    let allPoorLows = [];

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      if (p.bins.length === 0) continue;
      
      const bottomBin = p.bins[p.bins.length - 1];
      const isPoorLow = bottomBin.tpos.length >= 2;
      
      if (isPoorLow) {
        // Categorize Poor Low
        let type = 'Late-Day';
        const hasA = bottomBin.tpos.includes('A');
        const hasB = bottomBin.tpos.includes('B');
        const hasC = bottomBin.tpos.includes('C');
        
        if (hasA || (hasB && !hasC)) {
          type = 'AB Morning';
        } else if (hasB && hasC) {
          type = 'BC Lunchtime';
        } else if (hasC && !hasA && !hasB) {
          type = 'BC Lunchtime';
        }

        // Trace repair
        let repairDay = -1;
        let repairDate = 'never';
        for (let j = i + 1; j < profiles.length; j++) {
          if (profiles[j].dayLow < p.dayLow) {
            repairDay = j - i;
            repairDate = profiles[j].dateStr;
            break;
          }
        }

        allPoorLows.push({
          index: i,
          profile: p,
          type,
          tpos: bottomBin.tpos,
          repairDay,
          repairDate
        });
      }
    }

    markdown += `## 📈 Instrument: ${cfg.name} (Tick Size: ${cfg.tickSize} pts)\n`;
    markdown += `* **Total Sessions Analysed:** ${totalSessions}\n`;
    markdown += `* **Total Poor Lows Formed:** **${allPoorLows.length}** (${((allPoorLows.length / totalSessions) * 100).toFixed(1)}% of sessions)\n\n`;

    const categories = ['AB Morning', 'BC Lunchtime', 'Late-Day'];
    
    categories.forEach(cat => {
      const catList = allPoorLows.filter(item => item.type === cat);
      const count = catList.length;
      
      markdown += `### 🏷️ Category: ${cat} Poor Lows (Count: ${count})\n`;
      if (count === 0) {
        markdown += `*No Poor Lows of this category were recorded during the backtest period.*\n\n`;
        return;
      }

      let closeAbovePoc = 0;
      let closeAboveVah = 0;
      let sumCloseLoc = 0;
      let t1HighAbovePoc = 0;
      let t1HighAboveVah = 0;
      let t1HighAboveSessionHigh = 0;

      let repairedT1 = 0;
      let repairedT2 = 0;
      let repairedT3 = 0;
      let repairedT4 = 0;
      let repairedT5 = 0;
      let repairedLater = 0;
      let neverRepaired = 0;
      let sumRepairDays = 0;
      let repairedCount = 0;

      catList.forEach(item => {
        const p = item.profile;
        const range = p.dayHigh - p.dayLow;
        const closeLoc = range > 0 ? (p.closePrice - p.dayLow) / range : 0;
        sumCloseLoc += closeLoc;

        if (p.closePrice > p.pocPrice) closeAbovePoc++;
        if (p.closePrice > p.vahPrice) closeAboveVah++;

        if (item.index + 1 < profiles.length) {
          const nextP = profiles[item.index + 1];
          if (nextP.dayHigh > p.pocPrice) t1HighAbovePoc++;
          if (nextP.dayHigh > p.vahPrice) t1HighAboveVah++;
          if (nextP.dayHigh > p.dayHigh) t1HighAboveSessionHigh++;
        }

        const rDay = item.repairDay;
        if (rDay === 1) repairedT1++;
        else if (rDay === 2) repairedT2++;
        else if (rDay === 3) repairedT3++;
        else if (rDay === 4) repairedT4++;
        else if (rDay === 5) repairedT5++;
        else if (rDay > 5) repairedLater++;
        else neverRepaired++;

        if (rDay > 0) {
          sumRepairDays += rDay;
          repairedCount++;
        }
      });

      const avgCloseLocPct = ((sumCloseLoc / count) * 100).toFixed(1);
      const closeAbovePocPct = ((closeAbovePoc / count) * 100).toFixed(1);
      const closeAboveVahPct = ((closeAboveVah / count) * 100).toFixed(1);

      const possibleNextDays = Math.min(count, totalSessions - 1);
      const t1PocPct = ((t1HighAbovePoc / possibleNextDays) * 100).toFixed(1);
      const t1VahPct = ((t1HighAboveVah / possibleNextDays) * 100).toFixed(1);
      const t1HighPct = ((t1HighAboveSessionHigh / possibleNextDays) * 100).toFixed(1);

      const avgRepairDays = repairedCount > 0 ? (sumRepairDays / repairedCount).toFixed(1) : 'N/A';

      markdown += `* **Intraday Reversal Strength:**\n`;
      markdown += `  - Closed Above Daily POC: **${closeAbovePoc} / ${count}** (${closeAbovePocPct}%)\n`;
      markdown += `  - Closed Above Daily VAH: **${closeAboveVah} / ${count}** (${closeAboveVahPct}%)\n`;
      markdown += `  - Avg Close Location: **${avgCloseLocPct}%** of range (0% = low, 100% = high)\n`;
      markdown += `* **Next-Day (T+1) Reversal/Extension:**\n`;
      markdown += `  - Swipe Session POC: **${t1HighAbovePoc} / ${possibleNextDays}** (${t1PocPct}%)\n`;
      markdown += `  - Swipe Session VAH: **${t1HighAboveVah} / ${possibleNextDays}** (${t1VahPct}%)\n`;
      markdown += `  - Swipe Session High: **${t1HighAboveSessionHigh} / ${possibleNextDays}** (${t1HighPct}%)\n`;
      markdown += `* **Interday Repair Performance (Break of Low):**\n`;
      markdown += `  - Repaired on T+1: **${repairedT1}** (${((repairedT1 / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Repaired on T+2: **${repairedT2}** (${((repairedT2 / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Repaired on T+3: **${repairedT3}** (${((repairedT3 / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Repaired on T+4: **${repairedT4}** (${((repairedT4 / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Repaired on T+5: **${repairedT5}** (${((repairedT5 / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Repaired after 5 Days: **${repairedLater}** (${((repairedLater / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Never Repaired: **${neverRepaired}** (${((neverRepaired / count) * 100).toFixed(1)}%)\n`;
      markdown += `  - Avg Days to Repair (excluding never): **${avgRepairDays} days**\n\n`;
    });

    markdown += `#### 📋 All Poor Low Sessions Detail Log\n`;
    markdown += `| Date | Category | Low Price | POC Price | Bottom TPOs | Repair Date | Repair Delay |\n`;
    markdown += `|---|---|---|---|---|---|---|\n`;
    allPoorLows.forEach(item => {
      const p = item.profile;
      const delayStr = item.repairDay > 0 ? `${item.repairDay} days` : 'never';
      markdown += `| ${p.dateStr} | ${item.type} | ₹${p.dayLow.toFixed(2)} | ₹${p.pocPrice.toFixed(2)} | [${item.tpos.join(', ')}] | ${item.repairDate} | ${delayStr} |\n`;
    });

    markdown += `\n---\n\n`;
  });

  const filepath = path.join('C:\\Users\\mihir\\.gemini\\antigravity\\brain\\0d19a8b8-947a-40b3-bff1-c041605b3a93', 'bc_poor_low_backtest_report.md');
  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`[Backtest] Extended report saved successfully to ${filepath}`);
  
  process.exit(0);
}

runBacktest();
