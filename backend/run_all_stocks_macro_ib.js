// run_all_stocks_macro_ib.js
import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchSymbolData(bridge, symbol, timeframe = 'D') {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Timeout fetching data for ${symbol}`));
      }
    }, 15000); // 15 seconds timeout per symbol

    bridge.subscribeSymbol(symbol, timeframe, (data) => {
      if (data.isSnapshot && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(data.candles);
      }
    }, (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

// Group weekly cycle ID
function getWeeklyCycleId(dateStr, symbol) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const cleanSym = symbol.replace("NSE:", "").replace("BSE:", "").toUpperCase();
  
  let targetDate = new Date(d);
  if (cleanSym === 'NIFTY') {
    if (dateStr < '2024-03-05') {
      if (day >= 5) targetDate.setDate(d.getDate() + (11 - day));
      else targetDate.setDate(d.getDate() + (4 - day));
    } else {
      if (day <= 2) targetDate.setDate(d.getDate() + (2 - day));
      else targetDate.setDate(d.getDate() + (9 - day));
    }
  } else if (cleanSym === 'BANKNIFTY') {
    if (dateStr < '2023-09-06') {
      if (day >= 5) targetDate.setDate(d.getDate() + (11 - day));
      else targetDate.setDate(d.getDate() + (4 - day));
    } else {
      if (day <= 3) targetDate.setDate(d.getDate() + (3 - day));
      else targetDate.setDate(d.getDate() + (10 - day));
    }
  } else {
    // Default to Thursday expiry
    if (day >= 5) targetDate.setDate(d.getDate() + (11 - day));
    else targetDate.setDate(d.getDate() + (4 - day));
  }
  return targetDate.toISOString().split('T')[0];
}

// Get monthly last Thursday
function getLastThursdayOfMonth(year, month) {
  const d = new Date(year, month + 1, 0);
  const day = d.getDay();
  const diff = (day - 4 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
}

function getMonthlyCycleId(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  
  const lastThursday = getLastThursdayOfMonth(year, month);
  if (dateStr <= lastThursday) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  } else {
    const nextDate = new Date(year, month + 1, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  }
}

async function runBacktest() {
  // Load symbols from new_symbols.txt
  const symbolsFilePath = path.join(__dirname, 'new_symbols.txt');
  let symbolsContent = fs.readFileSync(symbolsFilePath, 'utf8');
  
  // Extract symbols array using regex
  const symbolsMatch = symbolsContent.match(/\[([\s\S]*?)\]/);
  if (!symbolsMatch) {
    console.error('Failed to parse symbols array from new_symbols.txt');
    process.exit(1);
  }
  
  const symbols = symbolsMatch[1]
    .split(',')
    .map(s => s.replace(/["'\s]/g, ''))
    .filter(s => s.startsWith('NSE:')); // Only run for Indian equities/indices

  console.log(`Loaded ${symbols.length} NSE symbols to backtest.`);

  const bridge = new TradingViewBridge();
  const allResults = {};

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    console.log(`[${i+1}/${symbols.length}] Processing ${sym}...`);

    try {
      const candles = await fetchSymbolData(bridge, sym, 'D');
      if (!candles || candles.length < 50) {
        console.log(`Skipping ${sym} - insufficient historical data.`);
        continue;
      }

      candles.sort((a, b) => a.time - b.time);
      const candlesWithDates = candles.map(c => {
        const d = new Date(c.time * 1000);
        return {
          ...c,
          dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        };
      });

      // Weekly analysis
      const weeklyGroups = {};
      for (const c of candlesWithDates) {
        const cycleId = getWeeklyCycleId(c.dateStr, sym);
        if (!weeklyGroups[cycleId]) weeklyGroups[cycleId] = [];
        weeklyGroups[cycleId].push(c);
      }

      let wTotal = 0, wBroke = 0, wUpside = 0, wDownside = 0, wBoth = 0;
      let w1618 = 0, w2618 = 0, w3618 = 0;

      for (const cycleId of Object.keys(weeklyGroups)) {
        const grp = weeklyGroups[cycleId];
        if (grp.length < 3) continue;

        wTotal++;
        const ibDays = grp.slice(0, 2);
        const restDays = grp.slice(2);
        const ibHigh = Math.max(...ibDays.map(d => d.high));
        const ibLow = Math.min(...ibDays.map(d => d.low));
        const ibRange = ibHigh - ibLow;

        let maxH = -Infinity, minL = Infinity;
        for (const d of restDays) {
          if (d.high > maxH) maxH = d.high;
          if (d.low < minL) minL = d.low;
        }

        const up = maxH > ibHigh;
        const dn = minL < ibLow;

        if (up) wUpside++;
        if (dn) wDownside++;
        if (up || dn) wBroke++;
        if (up && dn) wBoth++;

        const maxExt = Math.max(up ? (maxH - ibLow) / ibRange : 0, dn ? (ibHigh - minL) / ibRange : 0);
        if (maxExt >= 1.618) w1618++;
        if (maxExt >= 2.618) w2618++;
        if (maxExt >= 3.618) w3618++;
      }

      // Monthly analysis
      const monthlyGroups = {};
      for (const c of candlesWithDates) {
        const cycleId = getMonthlyCycleId(c.dateStr);
        if (!monthlyGroups[cycleId]) monthlyGroups[cycleId] = [];
        monthlyGroups[cycleId].push(c);
      }

      let mTotal = 0, mBroke = 0, mUpside = 0, mDownside = 0, mBoth = 0;
      let m1618 = 0, m2618 = 0, m3618 = 0;

      for (const cycleId of Object.keys(monthlyGroups)) {
        const grp = monthlyGroups[cycleId];
        if (grp.length < 8) continue;

        mTotal++;
        const ibDays = grp.slice(0, 5);
        const restDays = grp.slice(5);
        const ibHigh = Math.max(...ibDays.map(d => d.high));
        const ibLow = Math.min(...ibDays.map(d => d.low));
        const ibRange = ibHigh - ibLow;

        let maxH = -Infinity, minL = Infinity;
        for (const d of restDays) {
          if (d.high > maxH) maxH = d.high;
          if (d.low < minL) minL = d.low;
        }

        const up = maxH > ibHigh;
        const dn = minL < ibLow;

        if (up) mUpside++;
        if (dn) mDownside++;
        if (up || dn) mBroke++;
        if (up && dn) mBoth++;

        const maxExt = Math.max(up ? (maxH - ibLow) / ibRange : 0, dn ? (ibHigh - minL) / ibRange : 0);
        if (maxExt >= 1.618) m1618++;
        if (maxExt >= 2.618) m2618++;
        if (maxExt >= 3.618) m3618++;
      }

      allResults[sym] = {
        symbol: sym.replace('NSE:', ''),
        weekly: {
          total: wTotal,
          brokeOut: wBroke,
          breakoutPct: wTotal > 0 ? (wBroke / wTotal) * 100 : 0,
          upsidePct: wTotal > 0 ? (wUpside / wTotal) * 100 : 0,
          downsidePct: wTotal > 0 ? (wDownside / wTotal) * 100 : 0,
          bothPct: wTotal > 0 ? (wBoth / wTotal) * 100 : 0,
          ext1618Pct: wBroke > 0 ? (w1618 / wBroke) * 100 : 0,
          ext2618Pct: wBroke > 0 ? (w2618 / wBroke) * 100 : 0,
          ext3618Pct: wBroke > 0 ? (w3618 / wBroke) * 100 : 0
        },
        monthly: {
          total: mTotal,
          brokeOut: mBroke,
          breakoutPct: mTotal > 0 ? (mBroke / mTotal) * 100 : 0,
          upsidePct: mTotal > 0 ? (mUpside / mTotal) * 100 : 0,
          downsidePct: mTotal > 0 ? (mDownside / mTotal) * 100 : 0,
          bothPct: mTotal > 0 ? (mBoth / mTotal) * 100 : 0,
          ext1618Pct: mBroke > 0 ? (m1618 / mBroke) * 100 : 0,
          ext2618Pct: mBroke > 0 ? (m2618 / mBroke) * 100 : 0,
          ext3618Pct: mBroke > 0 ? (m3618 / mBroke) * 100 : 0
        }
      };

      // Add a slight delay of 50ms between requests to stay safe
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      console.error(`Error processing ${sym}:`, err.message || err);
    }
  }

  // Save raw data to JSON
  const outJsonPath = path.join(__dirname, 'all_stocks_macro_ib_stats.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`Saved JSON stats to: ${outJsonPath}`);

  // Create a markdown report of leaders
  const sortedWeekly = Object.values(allResults).sort((a,b) => b.weekly.breakoutPct - a.weekly.breakoutPct);
  const sortedMonthly1618 = Object.values(allResults).filter(x => x.monthly.brokeOut > 5).sort((a,b) => b.monthly.ext1618Pct - a.monthly.ext1618Pct);

  let mdReport = `# All Stocks Macro IB Breakout Leaderboard\n\n`;
  mdReport += `## Top 20 Weekly Breakout Leaders (Highest IB Breakout %)\n`;
  mdReport += `| Symbol | Total Weeks | Breakout % | Upside % | Downside % | Hit 1.618 % (on Breakout) |\n`;
  mdReport += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (let i = 0; i < Math.min(20, sortedWeekly.length); i++) {
    const x = sortedWeekly[i];
    mdReport += `| **${x.symbol}** | ${x.weekly.total} | ${x.weekly.breakoutPct.toFixed(1)}% | ${x.weekly.upsidePct.toFixed(1)}% | ${x.weekly.downsidePct.toFixed(1)}% | ${x.weekly.ext1618Pct.toFixed(1)}% |\n`;
  }

  mdReport += `\n## Top 20 Monthly 1.618 Extension Leaders (Highest 1.618 Hit Rate upon Breakout)\n`;
  mdReport += `| Symbol | Total Months | Breakout % | Hit 1.618 % (on Breakout) | Hit 2.618 % | Hit 3.618 % |\n`;
  mdReport += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (let i = 0; i < Math.min(20, sortedMonthly1618.length); i++) {
    const x = sortedMonthly1618[i];
    mdReport += `| **${x.symbol}** | ${x.monthly.total} | ${x.monthly.breakoutPct.toFixed(1)}% | **${x.monthly.ext1618Pct.toFixed(1)}%** | ${x.monthly.ext2618Pct.toFixed(1)}% | ${x.monthly.ext3618Pct.toFixed(1)}% |\n`;
  }

  const outMdPath = path.join(__dirname, 'all_stocks_macro_ib_report.md');
  fs.writeFileSync(outMdPath, mdReport, 'utf8');
  console.log(`Saved Markdown Report to: ${outMdPath}`);

  // Copy to artifacts folder as well
  const artifactsDir = "C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93";
  fs.writeFileSync(path.join(artifactsDir, 'all_stocks_macro_ib_stats.json'), JSON.stringify(allResults, null, 2), 'utf8');
  fs.writeFileSync(path.join(artifactsDir, 'all_stocks_macro_ib_report.md'), mdReport, 'utf8');
  
  console.log('All Stocks Macro IB Backtest completed successfully!');
  process.exit(0);
}

runBacktest().catch(err => {
  console.error('Fatal backtest error:', err);
  process.exit(1);
});
