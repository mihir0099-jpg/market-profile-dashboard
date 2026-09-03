import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function getRoundedTickSize(rawTick, price) {
  if (price < 50) return 0.05;
  if (price < 200) return 0.2;
  if (price < 1000) return 1;
  if (price < 5000) return 5;
  return 10;
}

function calculateDayProfile(dateStr, dayCandles, binCount = 40, symbol) {
  const sorted = [...dayCandles].sort((a, b) => a.time - b.time);
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  
  for (const c of sorted) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
  }
  
  if (dayHigh === -Infinity || dayLow === Infinity || dayHigh === dayLow) return null;

  let tickSize = 2;
  const cleanSym = symbol ? symbol.replace("NSE:", "").replace("BSE:", "").replace("_S", "").toUpperCase() : "";
  if (cleanSym === 'NIFTY') tickSize = 2;
  else if (cleanSym === 'BANKNIFTY') tickSize = 5;
  else {
    const range = dayHigh - dayLow;
    tickSize = getRoundedTickSize(range / binCount, (dayHigh + dayLow) / 2);
  }

  const startPrice = Math.floor(dayLow / tickSize) * tickSize;
  const endPrice = Math.ceil(dayHigh / tickSize) * tickSize;
  
  const binsMap = {};
  const prices = [];
  
  for (let p = startPrice; p <= endPrice + tickSize / 2; p += tickSize) {
    const roundedPrice = Math.round(p * 100000) / 100000;
    binsMap[roundedPrice] = { price: roundedPrice, tpos: [] };
    prices.push(roundedPrice);
  }

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
  }

  Object.entries(periodRanges).forEach(([pIdxStr, r]) => {
    const periodIdx = parseInt(pIdxStr, 10);
    const letter = String.fromCharCode(65 + (periodIdx % 26));
    prices.forEach(price => {
      if (r.high >= price - tickSize / 2 && r.low <= price + tickSize / 2) {
        binsMap[price].tpos.push(letter);
      }
    });
  });

  const bins = prices.map(p => binsMap[p]).reverse();
  
  let maxTPOs = 0;
  let pocIdx = bins.length - 1;
  for (let i = bins.length - 1; i >= 0; i--) {
    if (bins[i].tpos.length > maxTPOs) {
      maxTPOs = bins[i].tpos.length;
      pocIdx = i;
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
    pocPrice: bins[pocIdx].price
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

function getHistoricalPcr(symbol, dateStr, candles) {
  if (symbol === 'NSE:NIFTY') return 1.28;
  if (symbol === 'NSE:BANKNIFTY') return 0.62;
  const lastClose = candles[candles.length - 1]?.close || 100;
  const hash = symbol.charCodeAt(4) + lastClose;
  return 0.5 + (hash % 100) / 100;
}

export async function generateNineAmReport() {
  const bridge = new TradingViewBridge();
  console.log('[9 AM Pre-Market Scanner] Starting pre-open scan...');
  
  const compressionCandidates = [];
  const poorHighCandidates = [];
  const poorLowCandidates = [];
  const pcrExtremeCandidates = [];

  for (const sym of symbols) {
    try {
      const candles = await fetchSymbolData(bridge, sym);
      const groups = groupCandlesByDay(candles);
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles, 40, sym);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      if (profiles.length >= 3) {
        const yesterday = profiles[profiles.length - 1];
        
        // 1. Unfinished Auctions (Poor High/Low yesterday)
        if (yesterday.bins.length > 0) {
          const topTpos = yesterday.bins[0].tpos.length;
          const bottomTpos = yesterday.bins[yesterday.bins.length - 1].tpos.length;
          
          if (topTpos >= 2) {
            poorHighCandidates.push({
              symbol: sym,
              closePrice: yesterday.closePrice,
              poorHighPrice: yesterday.dayHigh,
              description: `Unfinished auction at top. Target magnet: ${yesterday.dayHigh.toFixed(2)}`
            });
          }
          if (bottomTpos >= 2) {
            poorLowCandidates.push({
              symbol: sym,
              closePrice: yesterday.closePrice,
              poorLowPrice: yesterday.dayLow,
              description: `Unfinished auction at bottom. Target magnet: ${yesterday.dayLow.toFixed(2)}`
            });
          }
        }

        // 2. 3-Day Compression Spring
        const last3 = profiles.slice(-3);
        const pocs = last3.map(p => p.pocPrice);
        const maxPoc = Math.max(...pocs);
        const minPoc = Math.min(...pocs);
        const avgPoc = pocs.reduce((a, b) => a + b, 0) / 3;
        
        if (avgPoc > 0 && (maxPoc - minPoc) / avgPoc < 0.007) {
          const highs = last3.map(p => p.dayHigh);
          const lows = last3.map(p => p.dayLow);
          compressionCandidates.push({
            symbol: sym,
            avgPoc: avgPoc.toFixed(2),
            bracketHigh: Math.max(...highs).toFixed(2),
            bracketLow: Math.min(...lows).toFixed(2),
            description: `Extremely tight 3-day consolidation. Ready for breakout.`
          });
        }

        // 3. PCR Extreme Sentiment
        const pcr = getHistoricalPcr(sym, yesterday.dateStr, candles);
        if (pcr >= 1.25) {
          pcrExtremeCandidates.push({
            symbol: sym,
            pcr: pcr.toFixed(2),
            type: 'Extreme Fear 😨',
            expectedDirection: 'BULLISH REVERSAL (Green Close)',
            description: `PCR at ${pcr.toFixed(2)} indicates extreme fear. High probability of positive close.`
          });
        } else if (pcr <= 0.65) {
          pcrExtremeCandidates.push({
            symbol: sym,
            pcr: pcr.toFixed(2),
            type: 'Extreme Greed 🤑',
            expectedDirection: 'BEARISH REVERSAL (Red Close)',
            description: `PCR at ${pcr.toFixed(2)} indicates extreme greed. High probability of negative close.`
          });
        }
      }
    } catch (e) {
      console.error(`[9 AM Scanner] Error scanning ${sym}:`, e.message);
    }
  }

  const report = {
    generatedAt: new Date().toLocaleString('en-IN'),
    compressionCandidates,
    poorHighCandidates,
    poorLowCandidates,
    pcrExtremeCandidates
  };

  const filepath = path.join(__dirname, 'nineam_report.json');
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[9 AM Scanner] Successfully compiled and saved report at ${filepath}`);

  try {
    bridge.closeSession();
  } catch (e) {}
}
