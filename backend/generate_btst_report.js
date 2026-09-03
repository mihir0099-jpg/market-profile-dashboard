import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All preset symbols
const symbols = [
  "NSE:NIFTY", "NSE:BANKNIFTY", "NSE:NIFTY1!", "OANDA:XAUUSD", "COINBASE:BTCUSD", "NSE:AARTIIND", "NSE:ABB", "NSE:ABBOTINDIA", "NSE:ABCAPITAL", "NSE:ABFRL", "NSE:ACC", "NSE:ADANIENSOL",
  "NSE:ADANIENT", "NSE:ADANIGREEN", "NSE:ADANIPORTS", "NSE:ADANIPOWER", "NSE:ALKEM", "NSE:AMBUJACEM", "NSE:APARINDS", "NSE:APOLLOHOSP",
  "NSE:APOLLOTYRE", "NSE:ASHOKLEY", "NSE:ASIANPAINT", "NSE:ASTRAL", "NSE:ATGL", "NSE:ATUL", "NSE:AUBANK", "NSE:AUROPHARMA",
  "NSE:AWL", "NSE:AXISBANK", "NSE:BAJAJ_AUTO", "NSE:BAJFINANCE", "NSE:BAJAJFINSV", "NSE:BALRAMCHIN", "NSE:BANDHANBNK",
  "NSE:BANKBARODA", "NSE:BATAINDIA", "NSE:BDL", "NSE:BEL", "NSE:BEML", "NSE:BERGEPAINT", "NSE:BHARTIARTL", "NSE:BHEL",
  "NSE:BIOCON", "NSE:BOSCHLTD", "NSE:BPCL", "NSE:BRITANNIA", "NSE:BSE", "NSE:BSOFT", "NSE:CANBK", "NSE:CANFINHOME",
  "NSE:CDSL", "NSE:CENTRALBK", "NSE:CHAMBLFERT", "NSE:CHOLAFIN", "NSE:CIPLA", "NSE:COALINDIA", "NSE:COCHINSHIP", "NSE:COFORGE",
  "NSE:COLPAL", "NSE:CONCOR", "NSE:COROMANDEL", "NSE:CROMPTON", "NSE:CUB", "NSE:CUMMINSIND", "NSE:DABUR", "NSE:DALBHARAT",
  "NSE:DEEPAKNTR", "NSE:DELHIVERY", "NSE:DIVISLAB", "NSE:DIXON", "NSE:DLF", "NSE:DRREDDY", "NSE:EICHERMOT", "NSE:ESCORTS",
  "NSE:EXIDEIND", "NSE:FEDERALBNK", "NSE:GAIL", "NSE:GLENMARK", "NSE:GMRINFRA", "NSE:GNFC", "NSE:GODREJCP", "NSE:GODREJPROP",
  "NSE:GRANULES", "NSE:GRASIM", "NSE:GRSE", "NSE:GUJGASLTD", "NSE:HAL", "NSE:HAVELLS", "NSE:HCLTECH", "NSE:HDFCBANK",
  "NSE:HDFCLIFE", "NSE:HEROMOTOCO", "NSE:HFCL", "NSE:HINDALCO", "NSE:HINDCOPPER", "NSE:HINDUNILVR", "NSE:HUDCO", "NSE:ICICIBANK",
  "NSE:ICICIGI", "NSE:ICICIPRULI", "NSE:IDEA", "NSE:IDFCFIRSTB", "NSE:IEX", "NSE:IFCI", "NSE:IGL",
  "NSE:INDHOTEL", "NSE:INDIACEM", "NSE:INDIAMART", "NSE:INDIGO", "NSE:INDUSINDBK", "NSE:INDUSTOWER", "NSE:INFY", "NSE:IOB",
  "NSE:IOC", "NSE:IPCALAB", "NSE:IRCTC", "NSE:IREDA", "NSE:IRFC", "NSE:ITC", "NSE:JINDALSTEL", "NSE:JIOFIN", "NSE:JKCEMENT",
  "NSE:JSWENERGY", "NSE:JSWSTEEL", "NSE:JUBLFOOD", "NSE:KARURVYSYA", "NSE:KEI", "NSE:KOTAKBANK", "NSE:KPITTECH", "NSE:LTF",
  "NSE:LALPATHLAB", "NSE:LICHSGFIN", "NSE:LTIM", "NSE:LT", "NSE:LUPIN", "NSE:M_M", "NSE:M_MFIN", "NSE:MAHABANK",
  "NSE:MANAPPURAM", "NSE:MARICO", "NSE:MARUTI", "NSE:MAZDOCK", "NSE:MCX", "NSE:METROPOLIS", "NSE:MPHASIS", "NSE:MRF",
  "NSE:MUTHOOTFIN", "NSE:NATIONALUM", "NSE:NAVINFLUOR", "NSE:NBCC", "NSE:NCC", "NSE:NESTLEIND", "NSE:NHPC", "NSE:NLCINDIA",
  "NSE:NMDC", "NSE:NTPC", "NSE:NYKAA", "NSE:OBEROIRLTY", "NSE:OFSS", "NSE:ONGC", "NSE:PAGEIND", "NSE:PEL", "NSE:PERSISTENT",
  "NSE:PETRONET", "NSE:PFC", "NSE:PIDILITIND", "NSE:PIIND", "NSE:PNB", "NSE:POLYCAB", "NSE:POWERGRID", "NSE:PVRINOX",
  "NSE:RAMCOCEM", "NSE:RBLBANK", "NSE:RECLTD", "NSE:RELIANCE", "NSE:RVNL", "NSE:SAIL", "NSE:SBICARD", "NSE:SBILIFE",
  "NSE:SBIN", "NSE:SHREECEM", "NSE:SHRIRAMFIN", "NSE:SIEMENS", "NSE:SRF", "NSE:SUNPHARMA", "NSE:SUNTV", "NSE:SYNGENE",
  "NSE:TATACHEM", "NSE:TATACOMM", "NSE:TATACONSUM", "NSE:TATAMOTORS", "NSE:TATAPOWER", "NSE:TATASTEEL", "NSE:TCS", "NSE:TECHM",
  "NSE:TITAN", "NSE:TORNTPHARM", "NSE:TORNTPOWER", "NSE:TRENT", "NSE:TVSMOTOR", "NSE:UBL", "NSE:ULTRACEMCO", "NSE:UPL",
  "NSE:VEDL", "NSE:VOLTAS", "NSE:WIPRO", "NSE:ZEEL", "NSE:ZYDUSLIFE",
  "NSE:AMARAJA", "NSE:BALKRISIND", "NSE:BLUESTARCO", "NSE:CEATLTD", "NSE:DEVYANI",
  "NSE:FORTIS", "NSE:HINDPETRO", "NSE:IBREALEST", "NSE:IBULHSGFIN", "NSE:J_KBANK",
  "NSE:LODHA", "NSE:MAXHEALTH", "NSE:OIL", "NSE:PAYTM", "NSE:PRESTIGE",
  "NSE:SOBHA", "NSE:SOUTHBANK", "NSE:SPICEJET", "NSE:SUPREMEIND", "NSE:SUZLON",
  "NSE:TATAELXSI", "NSE:TATATECH", "NSE:UCOBANK", "NSE:UNIONBANK", "NSE:WESTLIFE",
  "NSE:YESBANK", "NSE:ZOMATO"
];

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

function checkSellingTail(profile) {
  const bins = profile.bins;
  if (!bins || bins.length < 3) return false;
  let count = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].tpos && bins[i].tpos.length === 1) {
      count++;
    } else {
      break;
    }
  }
  return count >= 2;
}

function getRoundedTickSize(rawTick, price) {
  if (price < 50) {
    if (rawTick < 0.05) return 0.05;
    return Math.round(rawTick * 20) / 20; 
  }
  if (price < 200) {
    if (rawTick < 0.1) return 0.1;
    if (rawTick < 0.25) return 0.2;
    if (rawTick < 0.5) return 0.5;
    return Math.round(rawTick);
  }
  if (price < 1000) {
    if (rawTick < 0.5) return 0.5;
    if (rawTick < 1) return 1;
    if (rawTick < 2) return 2;
    return Math.round(rawTick / 5) * 5 || 5;
  }
  if (price < 5000) {
    if (rawTick < 1) return 1;
    if (rawTick < 2) return 2;
    if (rawTick < 5) return 5;
    return Math.round(rawTick / 10) * 10 || 10;
  }
  if (rawTick < 5) return 5;
  if (rawTick < 10) return 10;
  if (rawTick < 25) return 20;
  return Math.round(rawTick / 50) * 50 || 50;
}

function calculateDayProfile(dateStr, dayCandles, binCount = 40, symbol) {
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

  let tickSize = 0;
  const cleanSym = symbol ? symbol.replace("NSE:", "").replace("BSE:", "").replace("_S", "").toUpperCase() : "";
  if (cleanSym === 'NIFTY') {
    tickSize = 2; // Daily TPO
  } else if (cleanSym === 'BANKNIFTY') {
    tickSize = 5; // Daily TPO
  } else if (cleanSym === 'FINNIFTY' || cleanSym === 'MIDCPNIFTY') {
    tickSize = 2;
  } else if (cleanSym === 'SENSEX') {
    tickSize = 5;
  } else {
    const range = dayHigh - dayLow;
    const rawTick = range / binCount;
    const avgPrice = (dayHigh + dayLow) / 2;
    tickSize = getRoundedTickSize(rawTick, avgPrice);
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
    // Align TPO periods exactly to IST Exchange Hours (09:15 AM IST Open)
    const istSeconds = c.time + 19800; // 5 hours 30 mins
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

export async function generateBtstReport() {
  const bridge = new TradingViewBridge();
  console.log('[BTST Report] Starting 3:15 PM market scan...');
  
  const gapUpCandidates = [];
  const gapDownCandidates = [];
  const buyingTailCandidates = [];
  const sellingTailCandidates = [];
  const poorHighCandidates = [];
  const poorLowCandidates = [];

  for (const sym of symbols) {
    try {
      const candles = await fetchSymbolData(bridge, sym);
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles, 40, sym);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      if (profiles.length >= 2) {
        const prior = profiles[profiles.length - 2];
        const active = profiles[profiles.length - 1]; // active today's price up to 3:15 PM

        if (active && prior) {
          const currentPrice = active.closePrice;
          
          // Gap Up Candidates (Closing above VAH)
          if (currentPrice > prior.vahPrice) {
            gapUpCandidates.push({
              symbol: sym,
              closePrice: currentPrice,
              vahPrice: prior.vahPrice,
              distance: ((currentPrice - prior.vahPrice) / prior.vahPrice * 100).toFixed(2)
            });
          }

          // Gap Down Candidates (Closing below VAL)
          if (currentPrice < prior.valPrice) {
            gapDownCandidates.push({
              symbol: sym,
              closePrice: currentPrice,
              valPrice: prior.valPrice,
              distance: ((prior.valPrice - currentPrice) / prior.valPrice * 100).toFixed(2)
            });
          }

          // Buying Tail Candidates
          if (checkBuyingTail(active)) {
            buyingTailCandidates.push({ symbol: sym, closePrice: currentPrice });
          }

          // Selling Tail Candidates
          if (checkSellingTail(active)) {
            sellingTailCandidates.push({ symbol: sym, closePrice: currentPrice });
          }

          // Poor High Candidates
          if (active.bins.length > 0 && active.bins[0].tpos.length >= 2) {
            poorHighCandidates.push({ symbol: sym, closePrice: currentPrice });
          }

          // Poor Low Candidates
          if (active.bins.length > 0 && active.bins[active.bins.length - 1].tpos.length >= 2) {
            poorLowCandidates.push({ symbol: sym, closePrice: currentPrice });
          }
        }
      }
    } catch (e) {
      console.error(`[BTST Report] Error scanning ${sym}:`, e.message);
    }
  }

  const report = {
    generatedAt: new Date().toLocaleString('en-IN'),
    gapUpCandidates,
    gapDownCandidates,
    buyingTailCandidates,
    sellingTailCandidates,
    poorHighCandidates,
    poorLowCandidates
  };

  const filepath = path.join(__dirname, 'btst_report.json');
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[BTST Report] Successfully compiled and saved report at ${filepath}`);

  try {
    bridge.closeSession();
  } catch (e) {}
}
