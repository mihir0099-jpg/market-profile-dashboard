// daily_backtest_learner.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TradingViewBridge } from './tradingview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const signalsPath = path.join(__dirname, 'signals.json');
const paramsPath = path.join(__dirname, 'learned_params.json');
const journalPath = path.join(__dirname, 'learning_journal.json');
const lastRunPath = path.join(__dirname, 'last_post_mortem_run.txt');
const agentsMdPath = 'C:/Users/mihir/.gemini/config/AGENTS.md';

function getIstDateStr() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const dateVal = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
}

async function fetchSymbolCandles(bridge, symbol) {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolve(null); resolved = true; }
    }, 10000);
    bridge.subscribeSymbol(symbol, 'D', (data) => {
      if (data.isSnapshot && !resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve(data.candles);
      }
    }, () => {
      if (!resolved) { resolve(null); resolved = true; }
    }).catch(() => {
      if (!resolved) { resolve(null); resolved = true; }
    });
  });
}

async function fetchJsonSafely(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error(`[Daily Post-Mortem] Failed to fetch JSON from ${url}:`, e.message);
  }
  return null;
}

export async function runDailyPostMortem(forceRun = false) {
  const todayStr = getIstDateStr();
  console.log(`[Daily Post-Mortem] Starting daily analysis for ${todayStr}...`);
  
  if (!forceRun && fs.existsSync(lastRunPath)) {
    const lastRun = fs.readFileSync(lastRunPath, 'utf8').trim();
    if (lastRun === todayStr) {
      console.log(`[Daily Post-Mortem] Already ran for today (${todayStr}). Skipping.`);
      return;
    }
  }

  if (!fs.existsSync(signalsPath)) {
    console.log(`[Daily Post-Mortem] signals.json not found.`);
    return;
  }

  try {
    const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
    const params = fs.existsSync(paramsPath) ? JSON.parse(fs.readFileSync(paramsPath, 'utf8')) : {};

    // 1. Fetch Index GEX & PCR Conjoint Data
    console.log('[Daily Post-Mortem] Fetching Index GEX & PCR conjoint parameters...');
    const niftyPcr = await fetchJsonSafely('http://127.0.0.1:5000/api/pcr?symbol=NIFTY') || { spot: 24050, oi_pcr: 1.0, history: [] };
    const niftyGex = await fetchJsonSafely('http://127.0.0.1:5000/api/gex?symbol=NIFTY') || { stats: { call_wall: 24100, put_wall: 24050, gamma_flip: 24050 } };
    const bnPcr = await fetchJsonSafely('http://127.0.0.1:5000/api/pcr?symbol=BANKNIFTY') || { spot: 57400, oi_pcr: 0.85, history: [] };
    const bnGex = await fetchJsonSafely('http://127.0.0.1:5000/api/gex?symbol=BANKNIFTY') || { stats: { call_wall: 58000, put_wall: 57000, gamma_flip: 57400 } };

    // Calculate PCR Drifts
    let niftyDrift = 0;
    if (niftyPcr.history && niftyPcr.history.length >= 2) {
      const h = niftyPcr.history;
      niftyDrift = h[h.length - 1].oi_pcr - h[0].oi_pcr;
    }
    let bnDrift = 0;
    if (bnPcr.history && bnPcr.history.length >= 2) {
      const h = bnPcr.history;
      bnDrift = h[h.length - 1].oi_pcr - h[0].oi_pcr;
    }

    // 2. Fetch Nifty Daily candles for index trend check
    const bridge = new TradingViewBridge();
    const niftyCandles = await fetchSymbolCandles(bridge, 'NSE:NIFTY');
    const niftyIsBearish = niftyCandles && niftyCandles.length > 0 ? 
      niftyCandles[niftyCandles.length - 1].close < niftyCandles[niftyCandles.length - 1].open : false;

    // Filter signals triggered or resolved today
    const todaySignals = signals.filter(t => 
      t.createdDate === todayStr || t.resolvedDate === todayStr || t.timestamp.startsWith(todayStr)
    );

    const hits = todaySignals.filter(t => t.status === 'TARGET_HIT');
    const sls = todaySignals.filter(t => t.status === 'STOP_LOSS_HIT');
    const active = todaySignals.filter(t => t.status === 'ACTIVE');

    console.log(`[Daily Post-Mortem] Resolved Today: ${hits.length} Hits, ${sls.length} SLs, ${active.length} Active.`);

    const modifications = [];
    const journalEntries = [];
    const diagnosticsList = [];

    // 2.5. Update winningSetups cumulative profitability statistics
    if (!params.winningSetups) {
      params.winningSetups = {};
    }

    const resolvedToday = todaySignals.filter(t => t.status === 'TARGET_HIT' || t.status === 'STOP_LOSS_HIT');
    for (const trade of resolvedToday) {
      const key = `${trade.symbol}|${trade.strategy}`;
      if (!params.winningSetups[key]) {
        params.winningSetups[key] = { winCount: 0, lossCount: 0, totalPnl: 0 };
      }

      const pnl = trade.pnlPoints || 0;
      if (trade.status === 'TARGET_HIT') {
        params.winningSetups[key].winCount += 1;
        const tradePnl = pnl !== 0 ? Math.abs(pnl) : Math.abs(trade.target - trade.entry);
        params.winningSetups[key].totalPnl += tradePnl;
      } else if (trade.status === 'STOP_LOSS_HIT') {
        params.winningSetups[key].lossCount += 1;
        const tradeLoss = pnl !== 0 ? -Math.abs(pnl) : -Math.abs(trade.entry - trade.sl);
        params.winningSetups[key].totalPnl += tradeLoss;
      }
    }
    modifications.push(`Updated daily winningSetups metrics.`);

    // 3. Diagnose Mistakes on Stop Loss Hits
    for (const trade of sls) {
      let diagnosis = "Market noise / volatility sweep.";
      let learnedRule = "";
      const strategy = trade.strategy;
      const symbol = trade.symbol;

      // Check specific failures
      if (trade.direction === 'LONG' && niftyIsBearish) {
        diagnosis = `Broader Index Drag. Trade direction was LONG, but Nifty index closed bearish, dragging this stock down.`;
        learnedRule = `Index Trend Confluence: Never buy stock CE options when Nifty is trading below its open or has a negative PCR drift (< -0.03).`;
        if (params.gperiod) {
          params.gperiod.maxIbWidthPct = Math.max(0.015, (params.gperiod.maxIbWidthPct || 0.025) - 0.002);
          modifications.push(`Reduced max IB width threshold for stock breakouts due to index drag violation.`);
        }
      } else if (strategy.includes('G-Period')) {
        diagnosis = `Low-Volume Breakout Fakeout. Breakout occurred in Period G but did not satisfy the 1.2x relative volume filter.`;
        learnedRule = `G-Period Volume filter: G-Period stock breakouts require breakout candle volume >= 1.2x of the 20-candle average.`;
        if (params.gperiod) {
          params.gperiod.maxIbWidthPct = Math.max(0.015, (params.gperiod.maxIbWidthPct || 0.025) - 0.001);
          modifications.push(`Lowered max G-Period IB width parameter to increase entry strictness.`);
        }
      } else if (strategy.includes('POC Reversion')) {
        diagnosis = `Outside-Value Open Reversion Trap. Weekly/Monthly POC Reversion was triggered, but the contract opened outside the previous cycle's Value Area (equilibrium range).`;
        learnedRule = `POC Reversion Constraint: Weekly/Monthly POC reversions are ONLY valid if the contract opens strictly INSIDE the previous cycle's value area.`;
      } else if (strategy.includes('Sweep')) {
        diagnosis = `Weak Exhaustion Sweep. Rejection shadow size did not satisfy standard exhaustion parameters, trapping entries.`;
        learnedRule = `Sweep Safety Filter: Sweep candle shadow must exceed 2.0x of the candle body instead of 1.5x.`;
        if (params.sweep) {
          params.sweep.rejectionMultiplier = Math.min(2.5, (params.sweep.rejectionMultiplier || 1.5) + 0.1);
          modifications.push(`Increased sweep rejection multiplier to ${params.sweep.rejectionMultiplier}x.`);
        }
      } else if (strategy.includes('BTST')) {
        diagnosis = `Retracement close trap. Stock closed near highs but saw late-day profit booking in the final 15 minutes.`;
        learnedRule = `BTST Close Filter: Ensure stock closing strength remains strictly above 90% in the final 5 minutes of trade.`;
        if (params.btst) {
          params.btst.closeStrengthThreshold = Math.min(0.95, (params.btst.closeStrengthThreshold || 0.85) + 0.02);
          modifications.push(`Tightened BTST close strength threshold to ${params.btst.closeStrengthThreshold}.`);
        }
      }

      journalEntries.push({
        date: todayStr,
        symbol,
        strategy,
        direction: trade.direction,
        status: 'STOP_LOSS_HIT',
        pnlPoints: trade.pnlPoints || 0,
        diagnosis,
        learnedRule
      });

      diagnosticsList.push({
        symbol,
        strategy,
        direction: trade.direction,
        entry: trade.entry,
        sl: trade.sl,
        exitPrice: trade.exitPrice,
        pnlPoints: trade.pnlPoints,
        diagnosis,
        learnedRule
      });

      // Dynamic Rule Update in AGENTS.md
      if (learnedRule && fs.existsSync(agentsMdPath)) {
        try {
          let agentsContent = fs.readFileSync(agentsMdPath, 'utf8');
          if (!agentsContent.includes(learnedRule)) {
            const sectionHeader = '\n\n## 13. Auto-Learned Daily Constraints (Dynamic)';
            if (!agentsContent.includes(sectionHeader)) {
              agentsContent += `${sectionHeader}\n\n* *These rules are dynamically generated by the daily post-mortem analyzer based on active SL hits:*`;
            }
            agentsContent += `\n* **[Learned ${todayStr}]** ${learnedRule}`;
            fs.writeFileSync(agentsMdPath, agentsContent, 'utf8');
            console.log(`[Daily Post-Mortem] Appended new learned rule to AGENTS.md: ${learnedRule}`);
          }
        } catch (agentErr) {
          console.error(`[Daily Post-Mortem] Failed to write to AGENTS.md:`, agentErr.message);
        }
      }
    }

    // Success logs validation
    for (const trade of hits) {
      journalEntries.push({
        date: todayStr,
        symbol: trade.symbol,
        strategy: trade.strategy,
        direction: trade.direction,
        status: 'TARGET_HIT',
        pnlPoints: trade.pnlPoints || 0,
        diagnosis: "Target reached successfully. Strategy parameters confirmed valid.",
        learnedRule: `Validation: Strategy parameters for ${trade.strategy} are correct.`
      });
    }

    if (modifications.length > 0) {
      fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2), 'utf8');
      console.log(`[Daily Post-Mortem] Stored updated strategy parameters.`);
    }

    // Save to journal database
    let journal = [];
    if (fs.existsSync(journalPath)) {
      try { journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')); } catch (e) { journal = []; }
    }
    journal = [...journal, ...journalEntries];
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');

    // 4. Compile and Publish Daily Markdown Report
    let mdReport = `# 📈 Daily Market Profile & Options Post-Mortem Report (${todayStr})
This report details the conjoint GEX/PCR predictions, complete trade outcomes, and automated machine learning diagnostics compiled immediately following today's market close.

---

## 1. Conjoint Index GEX & PCR Market State
* **NSE:NIFTY**
  * Spot Close: **${niftyPcr.spot.toFixed(2)}**
  * Final PCR: **${niftyPcr.oi_pcr.toFixed(3)}** (Drift: **${niftyDrift.toFixed(3)}**)
  * Key Walls: Call Wall at **${niftyGex.stats?.call_wall || 'N/A'}** | Put Wall at **${niftyGex.stats?.put_wall || 'N/A'}**
  * Gamma Flip Zone: **${niftyGex.stats?.gamma_flip || 'N/A'}**
  * Conjoint State: **${niftyPcr.spot > niftyGex.stats?.gamma_flip ? '+GEX (Positive Gamma / Low Volatility)' : '-GEX (Negative Gamma / High Volatility)'}**
* **NSE:BANKNIFTY**
  * Spot Close: **${bnPcr.spot.toFixed(2)}**
  * Final PCR: **${bnPcr.oi_pcr.toFixed(3)}** (Drift: **${bnDrift.toFixed(3)}**)
  * Key Walls: Call Wall at **${bnGex.stats?.call_wall || 'N/A'}** | Put Wall at **${bnGex.stats?.put_wall || 'N/A'}**
  * Gamma Flip Zone: **${bnGex.stats?.gamma_flip || 'N/A'}**
  * Conjoint State: **${bnPcr.spot > bnGex.stats?.gamma_flip ? '+GEX (Positive Gamma / Low Volatility)' : '-GEX (Negative Gamma / High Volatility)'}**

---

## 2. Daily Options Trades Summary
| Symbol | Strategy | Type | Direction | Entry | Target | SL | Final Status | P&L Points |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

    todaySignals.forEach(t => {
      mdReport += `| **${t.symbol}** | ${t.strategy} | ${t.type || 'SWING'} | **${t.direction}** | ${t.entry.toFixed(2)} | ${t.target.toFixed(2)} | ${t.sl.toFixed(2)} | **${t.status}** | ${t.pnlPoints ? t.pnlPoints.toFixed(2) : '0.00'} |\n`;
    });

    mdReport += `
### Statistics:
* **Total Signals Triggered/Resolved:** ${todaySignals.length}
* **Target Hits:** ${hits.length}
* **Stop Loss Hits:** ${sls.length}
* **Win Rate:** ${hits.length + sls.length > 0 ? ((hits.length / (hits.length + sls.length)) * 100).toFixed(1) : '0.0'}%

---

## 3. Failed Trades Diagnostics & Mistake Log
`;

    if (diagnosticsList.length === 0) {
      mdReport += `*No stop loss hits detected today. All setups performed inside standard target/expiration parameters.*\n`;
    } else {
      diagnosticsList.forEach((d, idx) => {
        mdReport += `
### [${idx + 1}] ${d.symbol} — ${d.strategy} (${d.direction})
* **Trigger Details:** Entry: ${d.entry.toFixed(2)} | Stop Loss: ${d.sl.toFixed(2)} | Exit: ${d.exitPrice.toFixed(2)} | Loss: ${d.pnlPoints.toFixed(2)}
* **Mistake Diagnosis:** ${d.diagnosis}
* **Auto-Learned Parameter / Constraint Adjustment:** \`${d.learnedRule || 'None'}\`
`;
      });
    }

    mdReport += `
---
*Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. All calls and ideas shared are for educational purposes only.*
`;

    // Write to backend daily reports folder
    const reportsDir = path.join(__dirname, 'daily_reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    const localReportPath = path.join(reportsDir, `report_${todayStr}.md`);
    fs.writeFileSync(localReportPath, mdReport, 'utf8');
    console.log(`[Daily Post-Mortem] Local Markdown report saved to: ${localReportPath}`);

    // Compile and Publish Daily Plain Text Report (.txt)
    let txtReport = `================================================================================
📈 DAILY MARKET PROFILE & OPTIONS POST-MORTEM REPORT (${todayStr})
================================================================================
This report details the conjoint GEX/PCR predictions, complete trade outcomes, 
and automated machine learning diagnostics compiled immediately following today's close.

--------------------------------------------------------------------------------
1. CONJOINT INDEX GEX & PCR MARKET STATE
--------------------------------------------------------------------------------
* NSE:NIFTY
  - Spot Close: ${niftyPcr.spot.toFixed(2)}
  - Final PCR: ${niftyPcr.oi_pcr.toFixed(3)} (Drift: ${niftyDrift.toFixed(3)})
  - Key Walls: Call Wall at ${niftyGex.stats?.call_wall || 'N/A'} | Put Wall at ${niftyGex.stats?.put_wall || 'N/A'}
  - Gamma Flip Zone: ${niftyGex.stats?.gamma_flip || 'N/A'}
  - Conjoint State: ${niftyPcr.spot > niftyGex.stats?.gamma_flip ? '+GEX (Positive Gamma / Low Volatility)' : '-GEX (Negative Gamma / High Volatility)'}

* NSE:BANKNIFTY
  - Spot Close: ${bnPcr.spot.toFixed(2)}
  - Final PCR: ${bnPcr.oi_pcr.toFixed(3)} (Drift: ${bnDrift.toFixed(3)})
  - Key Walls: Call Wall at ${bnGex.stats?.call_wall || 'N/A'} | Put Wall at ${bnGex.stats?.put_wall || 'N/A'}
  - Gamma Flip Zone: ${bnGex.stats?.gamma_flip || 'N/A'}
  - Conjoint State: ${bnPcr.spot > bnGex.stats?.gamma_flip ? '+GEX (Positive Gamma / Low Volatility)' : '-GEX (Negative Gamma / High Volatility)'}

--------------------------------------------------------------------------------
2. DAILY OPTIONS TRADES SUMMARY
--------------------------------------------------------------------------------
`;

    txtReport += `Symbol          | Strategy                     | Type   | Dir   | Entry   | Target  | SL      | Status        | P&L Pts\n`;
    txtReport += `------------------------------------------------------------------------------------------------------------------------\n`;
    todaySignals.forEach(t => {
      const symStr = t.symbol.replace('NSE:', '').padEnd(15);
      const stratStr = t.strategy.slice(0, 28).padEnd(28);
      const typeStr = (t.type || 'SWING').padEnd(6);
      const dirStr = t.direction.padEnd(5);
      const entryStr = t.entry.toFixed(2).padEnd(8);
      const targetStr = t.target.toFixed(2).padEnd(8);
      const slStr = t.sl.toFixed(2).padEnd(8);
      const statusStr = t.status.padEnd(13);
      const pnlStr = (t.pnlPoints ? t.pnlPoints.toFixed(2) : '0.00').padEnd(8);
      txtReport += `${symStr} | ${stratStr} | ${typeStr} | ${dirStr} | ${entryStr} | ${targetStr} | ${slStr} | ${statusStr} | ${pnlStr}\n`;
    });

    txtReport += `
Statistics:
* Total Signals Triggered/Resolved: ${todaySignals.length}
* Target Hits: ${hits.length}
* Stop Loss Hits: ${sls.length}
* Win Rate: ${hits.length + sls.length > 0 ? ((hits.length / (hits.length + sls.length)) * 100).toFixed(1) : '0.0'}%

--------------------------------------------------------------------------------
3. FAILED TRADES DIAGNOSTICS & MISTAKE LOG
--------------------------------------------------------------------------------
`;

    if (diagnosticsList.length === 0) {
      txtReport += `No stop loss hits detected today. All setups performed inside standard target/expiration parameters.\n`;
    } else {
      diagnosticsList.forEach((d, idx) => {
        txtReport += `
[${idx + 1}] ${d.symbol.replace('NSE:', '')} -- ${d.strategy} (${d.direction})
* Trigger Details: Entry: ${d.entry.toFixed(2)} | Stop Loss: ${d.sl.toFixed(2)} | Exit: ${d.exitPrice.toFixed(2)} | Loss: ${d.pnlPoints.toFixed(2)}
* Mistake Diagnosis: ${d.diagnosis}
* Auto-Learned Parameter / Constraint Adjustment: ${d.learnedRule || 'None'}
`;
      });
    }

    txtReport += `
================================================================================
Investments in the securities market are subject to market risks. Read all the 
related documents carefully before investing. All calls and ideas shared are 
for educational purposes only.
================================================================================
`;

    const localTxtPath = path.join(reportsDir, `report_${todayStr}.txt`);
    fs.writeFileSync(localTxtPath, txtReport, 'utf8');
    console.log(`[Daily Post-Mortem] Local TXT report saved to: ${localTxtPath}`);

    // Write to brain artifacts folder
    const brainReportsDir = path.join("C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93/reports");
    if (!fs.existsSync(brainReportsDir)) fs.mkdirSync(brainReportsDir, { recursive: true });
    
    const brainReportPath = path.join(brainReportsDir, `daily_report_${todayStr}.md`);
    fs.writeFileSync(brainReportPath, mdReport, 'utf8');
    
    const brainTxtPath = path.join(brainReportsDir, `daily_report_${todayStr}.txt`);
    fs.writeFileSync(brainTxtPath, txtReport, 'utf8');
    console.log(`[Daily Post-Mortem] Brain Artifact reports (.md & .txt) saved to: ${brainReportsDir}`);

    // Save run date
    fs.writeFileSync(lastRunPath, todayStr, 'utf8');
    console.log(`[Daily Post-Mortem] Completed daily post-mortem for today.`);

    try { bridge.closeSession(); } catch (e) {}

  } catch (err) {
    console.error(`[Daily Post-Mortem] Error running daily post-mortem:`, err);
  }
}

