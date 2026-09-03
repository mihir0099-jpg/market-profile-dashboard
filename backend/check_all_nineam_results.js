import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAnalysis() {
  const reportPath = path.join(__dirname, 'nineam_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('Pre-market report not found at:', reportPath);
    return;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log(`Loaded pre-market report generated at: ${report.generatedAt}`);

  // Gather unique symbols
  const uniqueSymbols = new Set();
  const compressions = report.compressionCandidates || [];
  const poorHighs = report.poorHighCandidates || [];
  const poorLows = report.poorLowCandidates || [];
  const pcrExtremes = report.pcrExtremeCandidates || [];

  compressions.forEach(c => uniqueSymbols.add(c.symbol));
  poorHighs.forEach(ph => uniqueSymbols.add(ph.symbol));
  poorLows.forEach(pl => uniqueSymbols.add(pl.symbol));
  pcrExtremes.forEach(pe => uniqueSymbols.add(pe.symbol));

  const symbolList = sortedList(uniqueSymbols);
  console.log(`Found ${symbolList.length} unique symbols to analyze.`);

  const bridge = new TradingViewBridge();
  const symbolData = {};

  // Fetch in batches of 15
  const BATCH_SIZE = 15;
  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    const batch = symbolList.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(symbolList.length / BATCH_SIZE)}: ${batch.join(', ')}`);
    
    await Promise.all(batch.map(async (sym) => {
      try {
        const candles = await fetchCandles(bridge, sym);
        if (candles && candles.length > 0) {
          symbolData[sym] = candles;
        }
      } catch (err) {
        console.error(`Failed to fetch data for ${sym}:`, err.message);
      }
    }));
    
    // Tiny delay between batches to ease socket usage
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nAll data fetched. Running evaluation metrics...');
  const todayStr = '2026-07-06';
  
  // 1. Compression Candidates
  const compResults = [];
  compressions.forEach(c => {
    const candles = symbolData[c.symbol];
    if (!candles) return;
    const { today, yesterday } = splitTodayYesterday(candles, todayStr);
    if (!today) return;

    const bHigh = parseFloat(c.bracketHigh);
    const bLow = parseFloat(c.bracketLow);
    const tHigh = Math.max(...today.map(can => can.high));
    const tLow = Math.min(...today.map(can => can.low));
    const tClose = today[today.length - 1].close;

    const brokeHigh = tHigh > bHigh;
    const brokeLow = tLow < bLow;
    let status = 'No Breakout';
    if (brokeHigh && brokeLow) status = 'Double Breakout (Chop)';
    else if (brokeHigh) status = tClose > bHigh ? 'Bullish Breakout (Sustained)' : 'Bullish Breakout (Failed/Reverted)';
    else if (brokeLow) status = tClose < bLow ? 'Bearish Breakout (Sustained)' : 'Bearish Breakout (Failed/Reverted)';

    compResults.push({
      symbol: c.symbol,
      bracketLow: bLow,
      bracketHigh: bHigh,
      todayHigh: tHigh,
      todayLow: tLow,
      todayClose: tClose,
      status
    });
  });

  // 2. Poor High Candidates
  const phResults = [];
  poorHighs.forEach(ph => {
    const candles = symbolData[ph.symbol];
    if (!candles) return;
    const { today } = splitTodayYesterday(candles, todayStr);
    if (!today) return;

    const pHigh = parseFloat(ph.poorHighPrice);
    const tHigh = Math.max(...today.map(can => can.high));
    const cleared = tHigh >= pHigh;

    phResults.push({
      symbol: ph.symbol,
      poorHigh: pHigh,
      todayHigh: tHigh,
      cleared
    });
  });

  // 3. Poor Low Candidates
  const plResults = [];
  poorLows.forEach(pl => {
    const candles = symbolData[pl.symbol];
    if (!candles) return;
    const { today } = splitTodayYesterday(candles, todayStr);
    if (!today) return;

    const pLow = parseFloat(pl.poorLowPrice);
    const tLow = Math.min(...today.map(can => can.low));
    const cleared = tLow <= pLow;

    plResults.push({
      symbol: pl.symbol,
      poorLow: pLow,
      todayLow: tLow,
      cleared
    });
  });

  // 4. PCR Extremes
  const pcrResults = [];
  pcrExtremes.forEach(pe => {
    const candles = symbolData[pe.symbol];
    if (!candles) return;
    const { today, yesterday } = splitTodayYesterday(candles, todayStr);
    if (!today || !yesterday) return;

    const yClose = yesterday[yesterday.length - 1].close;
    const tClose = today[today.length - 1].close;
    const isFear = pe.type.includes('Fear');
    
    // expectedDirection: isFear ? BULLISH (Close > Close) : BEARISH (Close < Close)
    const success = isFear ? (tClose > yClose) : (tClose < yClose);

    pcrResults.push({
      symbol: pe.symbol,
      pcr: parseFloat(pe.pcr),
      type: pe.type,
      yClose,
      tClose,
      success
    });
  });

  // Generate Markdown Artifact
  const md = generateMarkdownReport(report.generatedAt, compResults, phResults, plResults, pcrResults);
  const outPath = path.join('C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93', 'nineam_results_analysis.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`\nSuccessfully compiled final analysis and saved to artifact: ${outPath}`);

  try {
    bridge.closeSession();
  } catch (e) {}
}

function sortedList(s) {
  return Array.from(s).sort();
}

function fetchCandles(bridge, symbol) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    bridge.subscribeSymbol(symbol, '30', (data) => {
      if (data.isSnapshot && !resolved) {
        resolved = true;
        resolve(data.candles);
      }
    }, (err) => {
      reject(err);
    });
  });
}

function splitTodayYesterday(candles, todayStr) {
  const groups = {};
  candles.forEach(c => {
    const date = new Date((c.time + 19800) * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(c);
  });

  const dates = Object.keys(groups).sort();
  const todayIdx = dates.indexOf(todayStr);
  
  if (todayIdx === -1) {
    return { today: null, yesterday: null };
  }

  const today = groups[todayStr];
  const yesterday = todayIdx > 0 ? groups[dates[todayIdx - 1]] : null;
  return { today, yesterday };
}

function generateMarkdownReport(generatedAt, comps, phs, pls, pcrs) {
  const compSustained = comps.filter(c => c.status.includes('Sustained')).length;
  const compTotal = comps.length;
  const compRate = compTotal > 0 ? (compSustained / compTotal * 100).toFixed(1) : '0';

  const phCleared = phs.filter(p => p.cleared).length;
  const phTotal = phs.length;
  const phRate = phTotal > 0 ? (phCleared / phTotal * 100).toFixed(1) : '0';

  const plCleared = pls.filter(p => p.cleared).length;
  const plTotal = pls.length;
  const plRate = plTotal > 0 ? (plCleared / plTotal * 100).toFixed(1) : '0';

  const pcrSuccess = pcrs.filter(p => p.success).length;
  const pcrTotal = pcrs.length;
  const pcrRate = pcrTotal > 0 ? (pcrSuccess / pcrTotal * 100).toFixed(1) : '0';

  let md = `# 📊 9:00 AM Scanner Results Analysis (July 6, 2026 Session)

This document contains a comprehensive backtest evaluating how the pre-market setups identified at 9:02 AM this morning played out in today's live market session.

---

## 🚦 Performance Dashboard

| Setup Classification | Metric Mode | Success / Total | Hit Rate |
| :--- | :--- | :--- | :--- |
| **3-Day Compression Springs** | Sustained Breakouts | ${compSustained} / ${compTotal} | **${compRate}%** |
| **Poor High Auctions** | Cleared / Repaired | ${phCleared} / ${phTotal} | **${phRate}%** |
| **Poor Low Auctions** | Cleared / Repaired | ${plCleared} / ${plTotal} | **${plRate}%** |
| **PCR Extreme Reversals** | Expected Reversal Close | ${pcrSuccess} / ${pcrTotal} | **${pcrRate}%** |

---

## ⚡ 1. 3-Day Compression Spring Breakouts

Evaluates symbols that were coiled in a tight 3-day range. A breakout is marked *Sustained* if today's close accepted value outside the bracket boundaries.

| Symbol | Bracket Range | Today High / Low | Close | Resolution Status |
| :--- | :--- | :--- | :--- | :--- |
`;

  comps.forEach(c => {
    md += `| **${c.symbol}** | ${c.bracketLow.toFixed(2)} - ${c.bracketHigh.toFixed(2)} | ${c.todayHigh.toFixed(2)} / ${c.todayLow.toFixed(2)} | ${c.todayClose.toFixed(2)} | ${c.status} |\n`;
  });

  md += `
---

## 🧲 2. Poor High Magnet Resolutions

Poor Highs are unfinished auctions at the session extremes. They act as magnets and are cleared if today's high tests or sweeps above yesterday's high.

| Symbol | Yesterday Poor High | Today High | Auction Repaired? |
| :--- | :--- | :--- | :--- |
`;

  phs.forEach(p => {
    md += `| **${p.symbol}** | ${p.poorHigh.toFixed(2)} | ${p.todayHigh.toFixed(2)} | ${p.cleared ? '✅ REPAIRED' : '❌ UNRESOLVED'} |\n`;
  });

  md += `
---

## 🧲 3. Poor Low Magnet Resolutions

Poor Lows are unresolved auction extremes at the bottom of the TPO profile. They are repaired if today's low sweeps yesterday's low.

| Symbol | Yesterday Poor Low | Today Low | Auction Repaired? |
| :--- | :--- | :--- | :--- |
`;

  pls.forEach(p => {
    md += `| **${p.symbol}** | ${p.poorLow.toFixed(2)} | ${p.todayLow.toFixed(2)} | ${p.cleared ? '✅ REPAIRED' : '❌ UNRESOLVED'} |\n`;
  });

  md += `
---

## 🤑 4. PCR Extreme Reversals (Greed & Fear)

Evaluates whether symbols at sentiment extremes (PCR >= 1.25 for Fear or <= 0.65 for Greed) achieved the expected contrarian direction (Fear -> closed higher, Greed -> closed lower).

| Symbol | Open PCR | Sentiment Type | Yesterday Close | Today Close | Expected Close? |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  pcrs.forEach(p => {
    md += `| **${p.symbol}** | ${p.pcr.toFixed(2)} | ${p.type} | ${p.yClose.toFixed(2)} | ${p.tClose.toFixed(2)} | ${p.success ? '✅ SUCCESS' : '❌ FAILED'} |\n`;
  });

  return md;
}

runAnalysis();
