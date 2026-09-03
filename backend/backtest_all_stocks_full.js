import './patch_ws.js';
import { TradingViewBridge } from './tradingview.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All 200+ NSE symbols from scanner list
const symbols = [
  "NSE:RELIANCE", "NSE:HDFCBANK", "NSE:TCS", "NSE:INFY", "NSE:ICICIBANK", "NSE:SBIN", "NSE:BHARTIARTL", "NSE:AXISBANK", "NSE:LT", "NSE:ITC",
  "NSE:360ONE", "NSE:ABB", "NSE:ABCAPITAL", "NSE:ADANIENSOL", "NSE:ADANIENT", "NSE:ADANIGREEN", "NSE:ADANIPORTS", "NSE:ADANIPOWER", "NSE:ALKEM", "NSE:AMBER",
  "NSE:AMBUJACEM", "NSE:ANGELONE", "NSE:APLAPOLLO", "NSE:APOLLOHOSP", "NSE:ASHOKLEY", "NSE:ASIANPAINT", "NSE:ASTRAL", "NSE:AUBANK",
  "NSE:AUROPHARMA", "NSE:BAJAJFINSV", "NSE:BAJAJHLDNG", "NSE:BAJAJ_AUTO", "NSE:BAJFINANCE", "NSE:BANDHANBNK", "NSE:BANKBARODA",
  "NSE:BANKINDIA", "NSE:BDL", "NSE:BEL", "NSE:BHARATFORG", "NSE:BHEL", "NSE:BIOCON", "NSE:BLUESTARCO",
  "NSE:BOSCHLTD", "NSE:BPCL", "NSE:BRITANNIA", "NSE:BSE", "NSE:CAMS", "NSE:CANBK", "NSE:CDSL", "NSE:CGPOWER",
  "NSE:CHOLAFIN", "NSE:CIPLA", "NSE:COALINDIA", "NSE:COCHINSHIP", "NSE:COFORGE", "NSE:COLPAL", "NSE:CONCOR", "NSE:CROMPTON",
  "NSE:CUMMINSIND", "NSE:DABUR", "NSE:DALBHARAT", "NSE:DELHIVERY", "NSE:DIVISLAB", "NSE:DIXON", "NSE:DLF", "NSE:DMART",
  "NSE:DRREDDY", "NSE:EICHERMOT", "NSE:EXIDEIND", "NSE:FEDERALBNK", "NSE:GAIL",
  "NSE:GLENMARK", "NSE:GMRINFRA", "NSE:GODREJCP", "NSE:GODREJPROP", "NSE:GRASIM", "NSE:HAL",
  "NSE:HAVELLS", "NSE:HCLTECH", "NSE:HDFCAMC", "NSE:HDFCLIFE", "NSE:HEROMOTOCO", "NSE:HINDALCO", "NSE:HINDPETRO",
  "NSE:HINDUNILVR", "NSE:HINDZINC", "NSE:ICICIGI", "NSE:ICICIPRULI", "NSE:IDEA", "NSE:IDFCFIRSTB",
  "NSE:IEX", "NSE:INDHOTEL", "NSE:INDIANB", "NSE:INDIGO", "NSE:INDUSINDBK", "NSE:INDUSTOWER", "NSE:INOXWIND",
  "NSE:IOC", "NSE:IREDA", "NSE:IRFC", "NSE:JINDALSTEL", "NSE:JIOFIN", "NSE:JSWENERGY", "NSE:JSWSTEEL",
  "NSE:JUBLFOOD", "NSE:KALYANKJIL", "NSE:KOTAKBANK", "NSE:KPITTECH", "NSE:LAURUSLABS",
  "NSE:LICHSGFIN", "NSE:LICI", "NSE:LODHA", "NSE:LTF", "NSE:LTIM", "NSE:LUPIN", "NSE:MANAPPURAM",
  "NSE:MANKIND", "NSE:MARICO", "NSE:MARUTI", "NSE:MAXHEALTH", "NSE:MAZDOCK", "NSE:MCX", "NSE:MFSL", "NSE:MOTHERSON",
  "NSE:MOTILALOFS", "NSE:MPHASIS", "NSE:MUTHOOTFIN", "NSE:M_M", "NSE:NAM_INDIA", "NSE:NATIONALUM", "NSE:NAUKRI", "NSE:NBCC",
  "NSE:NESTLEIND", "NSE:NHPC", "NSE:NMDC", "NSE:NTPC", "NSE:NUVAMA", "NSE:NYKAA", "NSE:OBEROIRLTY", "NSE:OFSS",
  "NSE:OIL", "NSE:ONGC", "NSE:PAGEIND", "NSE:PATANJALI", "NSE:PAYTM", "NSE:PERSISTENT", "NSE:PETRONET", "NSE:PFC",
  "NSE:PGEL", "NSE:PHOENIXLTD", "NSE:PIDILITIND", "NSE:PIIND", "NSE:PNB", "NSE:POLICYBZR", "NSE:POLYCAB",
  "NSE:POWERGRID", "NSE:PREMIERENE", "NSE:PRESTIGE", "NSE:RADICO", "NSE:RBLBANK", "NSE:RECLTD",
  "NSE:RVNL", "NSE:SAIL", "NSE:SBICARD", "NSE:SBILIFE", "NSE:SBIN", "NSE:SHREECEM", "NSE:SHRIRAMFIN", "NSE:SIEMENS",
  "NSE:SONACOMS", "NSE:SRF", "NSE:SUNPHARMA", "NSE:SUPREMEIND", "NSE:SUZLON", "NSE:SWIGGY", "NSE:TATACONSUM",
  "NSE:TATAELXSI", "NSE:TATAPOWER", "NSE:TATASTEEL", "NSE:TECHM", "NSE:TITAN",
  "NSE:TORNTPHARM", "NSE:TRENT", "NSE:TVSMOTOR", "NSE:ULTRACEMCO", "NSE:UNIONBANK", "NSE:UNITDSPR", "NSE:UNOMINDA", "NSE:UPL",
  "NSE:VBL", "NSE:VEDL", "NSE:VOLTAS", "NSE:WIPRO", "NSE:YESBANK", "NSE:ZYDUSLIFE"
];

function getIstDate(timeSecs) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(timeSecs * 1000 + istOffset);
}

function groupCandlesByWeek(candles) {
  const weeks = {};
  for (const candle of candles) {
    const d = getIstDate(candle.time);
    
    // Find the next Tuesday on or after this date (Tuesday is the expiry day)
    const day = d.getUTCDay();
    const daysToTuesday = (2 - day + 7) % 7;
    const nextTuesday = new Date(d.getTime() + daysToTuesday * 24 * 60 * 60 * 1000);
    const y = nextTuesday.getUTCFullYear();
    
    // Calculate calendar week number of that Tuesday
    const tempDate = new Date(Date.UTC(nextTuesday.getUTCFullYear(), nextTuesday.getUTCMonth(), nextTuesday.getUTCDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
    
    const weekKey = `${y}-W${String(weekNo).padStart(2, '0')}`;
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(candle);
  }
  return weeks;
}

function groupCandlesByMonth(candles) {
  const months = {};
  for (const candle of candles) {
    const d = getIstDate(candle.time);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(candle);
  }
  return months;
}

function calculateTpoProfile(candles, tickSize) {
  const prices = {};
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  for (const c of candles) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
    const startTick = Math.floor(c.low / tickSize) * tickSize;
    const endTick = Math.floor(c.high / tickSize) * tickSize;
    for (let p = startTick; p <= endTick; p += tickSize) {
      prices[p] = (prices[p] || 0) + 1;
    }
  }
  let maxTpos = 0;
  let pocPrice = 0;
  const sortedPrices = Object.keys(prices).map(Number).sort((a,b)=>a-b);
  if (sortedPrices.length === 0) return null;
  for (const p of sortedPrices) {
    if (prices[p] > maxTpos) {
      maxTpos = prices[p];
      pocPrice = p;
    } else if (prices[p] === maxTpos) {
      const mid = (dayHigh + dayLow) / 2;
      if (Math.abs(p - mid) < Math.abs(pocPrice - mid)) pocPrice = p;
    }
  }
  const totalTpos = Object.values(prices).reduce((a,b)=>a+b, 0);
  const targetTpos = totalTpos * 0.70;
  let valPrice = pocPrice;
  let vahPrice = pocPrice;
  let accumulatedTpos = prices[pocPrice] || 0;
  while (accumulatedTpos < targetTpos) {
    const priceAbove = sortedPrices.find(p => p > vahPrice);
    const priceBelow = [...sortedPrices].reverse().find(p => p < valPrice);
    const tposAbove = priceAbove ? (prices[priceAbove] || 0) : 0;
    const tposBelow = priceBelow ? (prices[priceBelow] || 0) : 0;
    if (tposAbove === 0 && tposBelow === 0) break;
    if (tposAbove >= tposBelow) {
      accumulatedTpos += tposAbove;
      vahPrice = priceAbove;
    } else {
      accumulatedTpos += tposBelow;
      valPrice = priceBelow;
    }
  }
  return { high: dayHigh, low: dayLow, poc: pocPrice, vah: vahPrice, val: valPrice };
}

async function runFullStockMacroBacktest() {
  const bridge = new TradingViewBridge();
  console.log(`[Backtest] Starting complete macro backtest for ${symbols.length} symbols...`);
  
  const results = {};
  let count = 0;
  
  for (const sym of symbols) {
    count++;
    try {
      // Gentle throttle to avoid choking TradingView websocket
      await new Promise(r => setTimeout(r, 150));
      
      const rawCandles = await new Promise((resolve, reject) => {
        let resolved = false;
        bridge.subscribeSymbol(sym, 'D', (data) => {
          if (data.isSnapshot && !resolved) {
            resolved = true;
            resolve(data.candles);
          }
        }, reject).catch(reject);
      });
      
      if (!rawCandles || rawCandles.length < 20) continue;
      
      const lastPrice = rawCandles[rawCandles.length - 1].close;
      const tick = lastPrice > 2000 ? 10 : lastPrice > 1000 ? 5 : lastPrice > 500 ? 2 : 1;
      
      // 1. Weekly analysis
      const weekGroups = groupCandlesByWeek(rawCandles);
      const weekKeys = Object.keys(weekGroups).sort();
      const weeklyProfiles = {};
      for (const wk of weekKeys) {
        weeklyProfiles[wk] = calculateTpoProfile(weekGroups[wk], tick);
      }
      
      let wTotal = 0, wPocTouched = 0;
      let wInsideOpens = 0, wInsideReversions = 0;
      let wOutsideOpens = 0, wOutsideTraps = 0;
      
      for (let i = 1; i < weekKeys.length; i++) {
        const prevProf = weeklyProfiles[weekKeys[i-1]];
        const currCandles = weekGroups[weekKeys[i]];
        const currProf = weeklyProfiles[weekKeys[i]];
        if (!prevProf || !currProf || currCandles.length === 0) continue;
        
        wTotal++;
        let touchedPoc = false;
        for (const c of currCandles) {
          if (c.low <= prevProf.poc && c.high >= prevProf.poc) { touchedPoc = true; break; }
        }
        if (touchedPoc) wPocTouched++;
        
        const open = currCandles[0].open;
        if (open >= prevProf.val && open <= prevProf.vah) {
          wInsideOpens++;
          if (touchedPoc) wInsideReversions++;
        } else {
          wOutsideOpens++;
          const failedBreak = open > prevProf.vah ? currProf.low < prevProf.vah : currProf.high > prevProf.val;
          if (failedBreak) wOutsideTraps++;
        }
      }
      
      // 2. Monthly analysis
      const monthGroups = groupCandlesByMonth(rawCandles);
      const monthKeys = Object.keys(monthGroups).sort();
      const monthlyProfiles = {};
      for (const m of monthKeys) {
        monthlyProfiles[m] = calculateTpoProfile(monthGroups[m], tick);
      }
      
      let mTotal = 0, mPocTouched = 0;
      let mInsideOpens = 0, mInsideReversions = 0;
      let mOutsideOpens = 0, mOutsideTraps = 0;
      
      for (let i = 1; i < monthKeys.length; i++) {
        const prevProf = monthlyProfiles[monthKeys[i-1]];
        const currCandles = monthGroups[monthKeys[i]];
        const currProf = monthlyProfiles[monthKeys[i]];
        if (!prevProf || !currProf || currCandles.length === 0) continue;
        
        mTotal++;
        let touchedPoc = false;
        for (const c of currCandles) {
          if (c.low <= prevProf.poc && c.high >= prevProf.poc) { touchedPoc = true; break; }
        }
        if (touchedPoc) mPocTouched++;
        
        const open = currCandles[0].open;
        if (open >= prevProf.val && open <= prevProf.vah) {
          mInsideOpens++;
          if (touchedPoc) mInsideReversions++;
        } else {
          mOutsideOpens++;
          const failedBreak = open > prevProf.vah ? currProf.low < prevProf.vah : currProf.high > prevProf.val;
          if (failedBreak) mOutsideTraps++;
        }
      }
      
      results[sym] = {
        symbol: sym.split(':').pop(),
        weekly: {
          total: wTotal,
          pocTouchPct: wTotal > 0 ? (wPocTouched / wTotal) * 100 : 0,
          insideReversionPct: wInsideOpens > 0 ? (wInsideReversions / wInsideOpens) * 100 : 0,
          outsideTrapPct: wOutsideOpens > 0 ? (wOutsideTraps / wOutsideOpens) * 100 : 0
        },
        monthly: {
          total: mTotal,
          pocTouchPct: mTotal > 0 ? (mPocTouched / mTotal) * 100 : 0,
          insideReversionPct: mInsideOpens > 0 ? (mInsideReversions / mInsideOpens) * 100 : 0,
          outsideTrapPct: mOutsideOpens > 0 ? (mOutsideTraps / mOutsideOpens) * 100 : 0
        }
      };
      
      if (count % 20 === 0) {
        console.log(`[Backtest] Progress: ${count}/${symbols.length} symbols processed...`);
      }
      
    } catch (err) {
      console.error(`Error processing ${sym}:`, err.message);
    }
  }
  
  // Save full JSON results
  const jsonPath = path.join("C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93/all_stocks_macro_stats.json");
  const localJsonPath = path.join(__dirname, 'all_stocks_macro_stats.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(localJsonPath, JSON.stringify(results, null, 2));
  console.log(`[Backtest] Raw JSON stats saved to: ${jsonPath} and ${localJsonPath}`);
  
  // Sort and extract top leaders
  const list = Object.values(results);
  
  const wReversionLeaders = [...list].sort((a,b) => b.weekly.insideReversionPct - a.weekly.insideReversionPct).slice(0, 15);
  const wGapTrapLeaders = [...list].sort((a,b) => b.weekly.outsideTrapPct - a.weekly.outsideTrapPct).slice(0, 15);
  
  const mReversionLeaders = [...list].sort((a,b) => b.monthly.insideReversionPct - a.monthly.insideReversionPct).slice(0, 15);
  const mGapTrapLeaders = [...list].sort((a,b) => b.monthly.outsideTrapPct - a.monthly.outsideTrapPct).slice(0, 15);
  
  // Compile markdown report
  let report = `# 📊 Complete Stock Options Macro TPO Profiles Report
This report outlines the complete weekly and monthly TPO profile open relationships and Point of Control (POC) reversion probabilities calculated across all **${list.length} liquid F&O stocks** in our database over a 4-year history.

---

## 1. Top 15 Weekly Inside-Value Reversion Leaders (POC Touch)
*These stocks have the highest probability of reverting to the previous week's Point of Control when opening inside value.*

| Stock Symbol | Weekly Inside-Value Reversion Rate | Weekly POC Touch Rate |
| :--- | :---: | :---: |
`;

  for (const item of wReversionLeaders) {
    report += `| **${item.symbol}** | **${item.weekly.insideReversionPct.toFixed(1)}%** | ${item.weekly.pocTouchPct.toFixed(1)}% |\n`;
  }
  
  report += `\n---

## 2. Top 15 Weekly Outside-Value Open Trap (Gaps) Fades
*These stocks have the highest probability of gapping outside value at the start of the week and immediately failing, pulling back inside range.*

| Stock Symbol | Weekly Gap Failure Rate | Weekly POC Touch Rate |
| :--- | :---: | :---: |
`;

  for (const item of wGapTrapLeaders) {
    report += `| **${item.symbol}** | **${item.weekly.outsideTrapPct.toFixed(1)}%** | ${item.weekly.pocTouchPct.toFixed(1)}% |\n`;
  }
  
  report += `\n---

## 3. Top 15 Monthly Inside-Value Reversion Leaders (POC Touch)
*These stocks show the highest probability of testing the previous month's Point of Control when opening inside value.*

| Stock Symbol | Monthly Inside-Value Reversion Rate | Monthly POC Touch Rate |
| :--- | :---: | :---: |
`;

  for (const item of mReversionLeaders) {
    report += `| **${item.symbol}** | **${item.monthly.insideReversionPct.toFixed(1)}%** | ${item.monthly.pocTouchPct.toFixed(1)}% |\n`;
  }
  
  report += `\n---

## 4. Top 15 Monthly Outside-Value Open Trap (Gaps) Fades
*These stocks show the highest probability of gapping outside the monthly value area and failing, resulting in massive monthly counter-trend moves.*

| Stock Symbol | Monthly Gap Failure Rate | Monthly POC Touch Rate |
| :--- | :---: | :---: |
`;

  for (const item of mGapTrapLeaders) {
    report += `| **${item.symbol}** | **${item.monthly.outsideTrapPct.toFixed(1)}%** | ${item.monthly.pocTouchPct.toFixed(1)}% |\n`;
  }

  const reportPath = path.join("C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93/all_stocks_macro_report.md");
  fs.writeFileSync(reportPath, report);
  console.log(`[Backtest] Macro report written to: ${reportPath}`);
  
  try { bridge.closeSession(); } catch (e) {}
  process.exit(0);
}

runFullStockMacroBacktest();
