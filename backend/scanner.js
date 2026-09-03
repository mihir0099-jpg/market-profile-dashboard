import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processSignalsForSymbol, updateIndexPcrDrift } from './signals_manager.js';
import { optimizeParameters } from './self_learner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Full list of symbols from DashboardHeader presets
const symbols = [
  "NSE:NIFTY", "NSE:BANKNIFTY", "NSE:NIFTY1!", "MCX:CRUDEOIL1!", "TVC:USOIL", "OANDA:XAUUSD", "COINBASE:BTCUSD", "DELTAIN:BTCUSD.P", "NSE:360ONE", "NSE:ABB",
  "NSE:ABCAPITAL", "NSE:ADANIENSOL", "NSE:ADANIENT", "NSE:ADANIGREEN", "NSE:ADANIPORTS", "NSE:ADANIPOWER", "NSE:ALKEM", "NSE:AMBER",
  "NSE:AMBUJACEM", "NSE:ANGELONE", "NSE:APLAPOLLO", "NSE:APOLLOHOSP", "NSE:ASHOKLEY", "NSE:ASIANPAINT", "NSE:ASTRAL", "NSE:AUBANK",
  "NSE:AUROPHARMA", "NSE:AXISBANK", "NSE:BAJAJFINSV", "NSE:BAJAJHLDNG", "NSE:BAJAJ_AUTO", "NSE:BAJFINANCE", "NSE:BANDHANBNK", "NSE:BANKBARODA",
  "NSE:BANKINDIA", "NSE:BDL", "NSE:BEL", "NSE:BHARATFORG", "NSE:BHARTIARTL", "NSE:BHEL", "NSE:BIOCON", "NSE:BLUESTARCO",
  "NSE:BOSCHLTD", "NSE:BPCL", "NSE:BRITANNIA", "NSE:BSE", "NSE:CAMS", "NSE:CANBK", "NSE:CDSL", "NSE:CGPOWER",
  "NSE:CHOLAFIN", "NSE:CIPLA", "NSE:COALINDIA", "NSE:COCHINSHIP", "NSE:COFORGE", "NSE:COLPAL", "NSE:CONCOR", "NSE:CROMPTON",
  "NSE:CUMMINSIND", "NSE:DABUR", "NSE:DALBHARAT", "NSE:DELHIVERY", "NSE:DIVISLAB", "NSE:DIXON", "NSE:DLF", "NSE:DMART",
  "NSE:DRREDDY", "NSE:EICHERMOT", "NSE:ETERNAL", "NSE:EXIDEIND", "NSE:FEDERALBNK", "NSE:FORCEMOT", "NSE:FORTIS", "NSE:GAIL",
  "NSE:GLENMARK", "NSE:GMRINFRA", "NSE:GODFRYPHLP", "NSE:GODREJCP", "NSE:GODREJPROP", "NSE:GRASIM", "NSE:GVT&D", "NSE:HAL",
  "NSE:HAVELLS", "NSE:HCLTECH", "NSE:HDFCAMC", "NSE:HDFCBANK", "NSE:HDFCLIFE", "NSE:HEROMOTOCO", "NSE:HINDALCO", "NSE:HINDPETRO",
  "NSE:HINDUNILVR", "NSE:HINDZINC", "NSE:HYUNDAI", "NSE:ICICIBANK", "NSE:ICICIGI", "NSE:ICICIPRULI", "NSE:IDEA", "NSE:IDFCFIRSTB",
  "NSE:IEX", "NSE:INDHOTEL", "NSE:INDIANB", "NSE:INDIGO", "NSE:INDUSINDBK", "NSE:INDUSTOWER", "NSE:INFY", "NSE:INOXWIND",
  "NSE:IOC", "NSE:IREDA", "NSE:IRFC", "NSE:ITC", "NSE:JINDALSTEL", "NSE:JIOFIN", "NSE:JSWENERGY", "NSE:JSWSTEEL",
  "NSE:JUBLFOOD", "NSE:KALYANKJIL", "NSE:KAYNES", "NSE:KEI", "NSE:KFINTECH", "NSE:KOTAKBANK", "NSE:KPITTECH", "NSE:LAURUSLABS",
  "NSE:LICHSGFIN", "NSE:LICI", "NSE:LODHA", "NSE:LT", "NSE:LTF", "NSE:LTIM", "NSE:LUPIN", "NSE:MANAPPURAM",
  "NSE:MANKIND", "NSE:MARICO", "NSE:MARUTI", "NSE:MAXHEALTH", "NSE:MAZDOCK", "NSE:MCX", "NSE:MFSL", "NSE:MOTHERSON",
  "NSE:MOTILALOFS", "NSE:MPHASIS", "NSE:MUTHOOTFIN", "NSE:M_M", "NSE:NAM_INDIA", "NSE:NATIONALUM", "NSE:NAUKRI", "NSE:NBCC",
  "NSE:NESTLEIND", "NSE:NHPC", "NSE:NMDC", "NSE:NTPC", "NSE:NUVAMA", "NSE:NYKAA", "NSE:OBEROIRLTY", "NSE:OFSS",
  "NSE:OIL", "NSE:ONGC", "NSE:PAGEIND", "NSE:PATANJALI", "NSE:PAYTM", "NSE:PERSISTENT", "NSE:PETRONET", "NSE:PFC",
  "NSE:PGEL", "NSE:PHOENIXLTD", "NSE:PIDILITIND", "NSE:PIIND", "NSE:PNB", "NSE:PNBHOUSING", "NSE:POLICYBZR", "NSE:POLYCAB",
  "NSE:POWERGRID", "NSE:POWERINDIA", "NSE:PREMIERENE", "NSE:PRESTIGE", "NSE:RADICO", "NSE:RBLBANK", "NSE:RECLTD", "NSE:RELIANCE",
  "NSE:RVNL", "NSE:SAIL", "NSE:SBICARD", "NSE:SBILIFE", "NSE:SBIN", "NSE:SHREECEM", "NSE:SHRIRAMFIN", "NSE:SIEMENS",
  "NSE:SOLARINDS", "NSE:SONACOMS", "NSE:SRF", "NSE:SUNPHARMA", "NSE:SUPREMEIND", "NSE:SUZLON", "NSE:SWIGGY", "NSE:TATACONSUM",
  "NSE:TATAELXSI", "NSE:TATAPOWER", "NSE:TATASTEEL", "NSE:TCS", "NSE:TECHM", "NSE:TIINDIA", "NSE:TITAN", "NSE:TMPV",
  "NSE:TORNTPHARM", "NSE:TRENT", "NSE:TVSMOTOR", "NSE:ULTRACEMCO", "NSE:UNIONBANK", "NSE:UNITDSPR", "NSE:UNOMINDA", "NSE:UPL",
  "NSE:VBL", "NSE:VEDL", "NSE:VMM", "NSE:VOLTAS", "NSE:WAAREEENER", "NSE:WIPRO", "NSE:YESBANK", "NSE:ZYDUSLIFE"
];

let scanResults = [];
let scanStatus = {
  status: 'idle',
  progress: '0/0',
  lastScanTime: null
};

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

function hasDoubleDistribution(profile) {
  if (!profile || !profile.bins || profile.bins.length < 15) return false;
  
  const ascendingBins = [...profile.bins].reverse(); // Low to high price
  const n = ascendingBins.length;
  
  // 1. Identify all contiguous blocks of single prints (tpos.length === 1)
  let blocks = [];
  let currentStart = null;
  let currentEnd = null;
  
  for (let i = 0; i < n; i++) {
    const bin = ascendingBins[i];
    if (bin.tpos.length === 1) {
      if (currentStart === null) currentStart = i;
      currentEnd = i;
    } else {
      if (currentStart !== null && currentEnd !== null) {
        blocks.push({ start: currentStart, end: currentEnd });
        currentStart = null;
        currentEnd = null;
      }
    }
  }
  if (currentStart !== null && currentEnd !== null) {
    blocks.push({ start: currentStart, end: currentEnd });
  }
  
  // 2. Filter blocks to see if any represents a true Double Distribution separator
  for (const block of blocks) {
    const span = block.end - block.start + 1;
    // A true Double Distribution gap is usually at least 5 ticks wide
    if (span >= 5) {
      // Check if there is a valid distribution below the block (index < block.start)
      // We look for at least 4 consecutive bins with tpos.length > 1 below the block
      let hasLowerDist = false;
      let lowerCount = 0;
      for (let j = block.start - 1; j >= 0; j--) {
        if (ascendingBins[j].tpos.length > 1) {
          lowerCount++;
          if (lowerCount >= 4) {
            hasLowerDist = true;
            break;
          }
        } else {
          lowerCount = 0;
        }
      }
      
      // Check if there is a valid distribution above the block (index > block.end)
      // We look for at least 4 consecutive bins with tpos.length > 1 above the block
      let hasUpperDist = false;
      let upperCount = 0;
      for (let j = block.end + 1; j < n; j++) {
        if (ascendingBins[j].tpos.length > 1) {
          upperCount++;
          if (upperCount >= 4) {
            hasUpperDist = true;
            break;
          }
        } else {
          upperCount = 0;
        }
      }
      
      if (hasLowerDist && hasUpperDist) {
        return true; // Found a valid Double Distribution day profile!
      }
    }
  }
  
  return false;
}

function getProfileShape(profile) {
  if (!profile || !profile.bins || profile.bins.length === 0) return 'none';
  const totalHeight = profile.dayHigh - profile.dayLow;
  if (totalHeight <= 0) return 'none';
  const pocPct = (profile.pocPrice - profile.dayLow) / totalHeight;
  
  if (pocPct >= 0.6) {
    const lowerHalfIndexStart = Math.floor(profile.bins.length * 0.6);
    let lowerHalfTposSum = 0;
    let count = 0;
    for (let i = lowerHalfIndexStart; i < profile.bins.length; i++) {
      lowerHalfTposSum += profile.bins[i].tpos.length;
      count++;
    }
    const avgLowerWidth = count > 0 ? lowerHalfTposSum / count : 0;
    if (avgLowerWidth < 2.5) return 'P-shape';
  }
  
  if (pocPct <= 0.4) {
    const upperHalfIndexEnd = Math.floor(profile.bins.length * 0.4);
    let upperHalfTposSum = 0;
    let count = 0;
    for (let i = 0; i < upperHalfIndexEnd; i++) {
      upperHalfTposSum += profile.bins[i].tpos.length;
      count++;
    }
    const avgUpperWidth = count > 0 ? upperHalfTposSum / count : 0;
    if (avgUpperWidth < 2.5) return 'b-shape';
  }
  
  return 'none';
}

function detectLedges(periodRanges, tickSize) {
  if (!periodRanges || !tickSize) {
    return { hasLedge: false, type: 'none', level: 0, desc: '' };
  }
  
  const rangesArray = Object.values(periodRanges);
  if (rangesArray.length < 3) {
    return { hasLedge: false, type: 'none', level: 0, desc: '' };
  }
  
  const tolerance = tickSize * 1.5;
  
  const highs = rangesArray.map(p => p.high).filter(h => h > 0);
  const lows = rangesArray.map(p => p.low).filter(l => l > 0);
  
  for (let i = 0; i < highs.length; i++) {
    let matchCount = 1;
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i] - highs[j]) <= tolerance) {
        matchCount++;
      }
    }
    if (matchCount >= 3) {
      return { 
        hasLedge: true, 
        type: 'High Ledge', 
        level: Math.round(highs[i] * 100) / 100, 
        desc: `High Ledge at ${highs[i].toFixed(2)}: Price repeatedly stalled here in multiple periods. A breakout above this level indicates departure from balance.`
      };
    }
  }
  
  for (let i = 0; i < lows.length; i++) {
    let matchCount = 1;
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i] - lows[j]) <= tolerance) {
        matchCount++;
      }
    }
    if (matchCount >= 3) {
      return { 
        hasLedge: true, 
        type: 'Low Ledge', 
        level: Math.round(lows[i] * 100) / 100, 
        desc: `Low Ledge at ${lows[i].toFixed(2)}: Price repeatedly found support here. A break below this level indicates departure from balance.`
      };
    }
  }
  
  return { hasLedge: false, type: 'none', level: 0, desc: '' };
}

function detectSpike(profile) {
  if (!profile || !profile.bins || profile.bins.length < 5) {
    return { type: 'none', base: 0, extreme: 0, range: 0 };
  }
  
  // Find single prints at the top extreme (Selling Spike or Buying Spike late-day)
  let topSingleLength = 0;
  const topLetters = new Set();
  for (let i = 0; i < profile.bins.length; i++) {
    if (profile.bins[i].tpos.length === 1) {
      topSingleLength++;
      topLetters.add(profile.bins[i].tpos[0]);
    } else {
      break;
    }
  }
  
  // If the top single prints are at least 2 TPOs long, and include L or M (or K)
  const isLateTop = topLetters.has('L') || topLetters.has('M') || topLetters.has('K');
  if (topSingleLength >= 2 && isLateTop) {
    const extremeHigh = profile.bins[0].price;
    const basePrice = profile.bins[topSingleLength].price;
    return {
      type: 'Buying Spike',
      base: basePrice,
      extreme: extremeHigh,
      range: extremeHigh - basePrice
    };
  }
  
  // Find single prints at the bottom extreme
  let bottomSingleLength = 0;
  const bottomLetters = new Set();
  for (let i = profile.bins.length - 1; i >= 0; i--) {
    if (profile.bins[i].tpos.length === 1) {
      bottomSingleLength++;
      bottomLetters.add(profile.bins[i].tpos[0]);
    } else {
      break;
    }
  }
  
  const isLateBottom = bottomLetters.has('L') || bottomLetters.has('M') || bottomLetters.has('K');
  if (bottomSingleLength >= 2 && isLateBottom) {
    const extremeLow = profile.bins[profile.bins.length - 1].price;
    const basePrice = profile.bins[profile.bins.length - 1 - bottomSingleLength].price;
    return {
      type: 'Selling Spike',
      base: basePrice,
      extreme: extremeLow,
      range: basePrice - extremeLow
    };
  }
  
  return { type: 'none', base: 0, extreme: 0, range: 0 };
}

function detectThreeToOneDay(profile, nuances) {
  if (!profile || !nuances) {
    return 'none';
  }
  
  const hasBuyingTail = nuances.buyingTail === true;
  const hasUpsideExtension = profile.dayHigh > profile.ibHigh;
  const hasBuyingTPOs = nuances.rotationFactor > 0 && (profile.closePrice > (profile.dayHigh + profile.dayLow) / 2);
  
  if (hasBuyingTail && hasUpsideExtension && hasBuyingTPOs) {
    return '3 to I Buying Day';
  }
  
  const hasSellingTail = nuances.sellingTail === true;
  const hasDownsideExtension = profile.dayLow < profile.ibLow;
  const hasSellingTPOs = nuances.rotationFactor < 0 && (profile.closePrice < (profile.dayHigh + profile.dayLow) / 2);
  
  if (hasSellingTail && hasDownsideExtension && hasSellingTPOs) {
    return '3 to I Selling Day';
  }
  
  if ((hasBuyingTail || hasSellingTail) && (hasUpsideExtension || hasDownsideExtension)) {
    return '2I to 1R Day';
  }
  
  return 'none';
}

function getDayType(profile, nuances) {
  if (!profile) return 'Rotational Day';
  
  if (nuances.doubleDistribution) return 'Double Distribution Day';
  
  const ibRange = profile.ibHigh - profile.ibLow;
  const ibPct = profile.openPrice > 0 ? (ibRange / profile.openPrice) * 100 : 0;
  
  const brokeIbHigh = profile.dayHigh > profile.ibHigh;
  const brokeIbLow = profile.dayLow < profile.ibLow;
  
  // Calculate profile width and range extensions
  const maxProfileWidth = profile.bins && profile.bins.length > 0
    ? Math.max(...profile.bins.map(b => b.tpos.length))
    : 10;
    
  let buyExtensions = 0;
  let sellExtensions = 0;
  if (profile.periodRanges) {
    let runningHigh = Math.max(profile.periodRanges[0]?.high || 0, profile.periodRanges[1]?.high || 0);
    let runningLow = Math.min(profile.periodRanges[0]?.low || Infinity, profile.periodRanges[1]?.low || Infinity);
    
    const numPeriods = Object.keys(profile.periodRanges).length;
    for (let i = 2; i < numPeriods; i++) {
      const p = profile.periodRanges[i];
      if (!p) continue;
      if (p.high > runningHigh) {
        buyExtensions++;
        runningHigh = p.high;
      }
      if (p.low < runningLow) {
        sellExtensions++;
        runningLow = p.low;
      }
    }
  }
  
  // 1. Neutral Day: both sides of IB are broken
  if (brokeIbHigh && brokeIbLow) {
    const dayRange = profile.dayHigh - profile.dayLow;
    if (dayRange > 0) {
      const closePct = (profile.closePrice - profile.dayLow) / dayRange;
      if (closePct >= 0.8 || closePct <= 0.2) {
        return 'Neutral-Extreme Day';
      }
    }
    return 'Neutral-Center Day';
  }
  
  // 2. Trend Day vs. Normal Variation: only one side of IB is broken
  if (brokeIbHigh || brokeIbLow) {
    const isThin = maxProfileWidth <= 5;
    const isBuyingTrend = brokeIbHigh && buyExtensions >= 2 && isThin;
    const isSellingTrend = brokeIbLow && sellExtensions >= 2 && isThin;
    
    if (isBuyingTrend || isSellingTrend) {
      return 'Trend Day';
    } else {
      return 'Normal Variation Day';
    }
  }
  
  // 3. Neither side of IB is broken: Normal Day vs. Nontrend Day
  if (ibPct >= 0.8) {
    return 'Normal Day';
  } else {
    return 'Nontrend Day';
  }
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
  try {
    const ticksPath = path.join(__dirname, 'dynamic_configs.json');
    if (fs.existsSync(ticksPath)) {
      const dynamicTicks = JSON.parse(fs.readFileSync(ticksPath, 'utf8'));
      if (dynamicTicks[symbol]) {
        tickSize = dynamicTicks[symbol];
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  if (tickSize === 0) {
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

  let eightyPercentRule = false;
  if (prior) {
    const open = active.openPrice;
    const openedAboveVA = open > prior.vahPrice;
    const openedBelowVA = open < prior.valPrice;
    
    if (openedAboveVA && active.dayLow < prior.vahPrice) {
      eightyPercentRule = true;
    } else if (openedBelowVA && active.dayHigh > prior.valPrice) {
      eightyPercentRule = true;
    }
  }

  let openOutsideRangeAlert = false;
  let openOutsideRangeDesc = '';
  
  if (prior) {
    const open = active.openPrice;
    if (open > prior.dayHigh) {
      openOutsideRangeAlert = true;
      openOutsideRangeDesc = `🚨 ALERT: Open is Outside Prior Day's Range (Gap Up)! Market opened at ${open.toFixed(2)}, which is above yesterday's high (${prior.dayHigh.toFixed(2)}).`;
    } else if (open < prior.dayLow) {
      openOutsideRangeAlert = true;
      openOutsideRangeDesc = `🚨 ALERT: Open is Outside Prior Day's Range (Gap Down)! Market opened at ${open.toFixed(2)}, which is below yesterday's low (${prior.dayLow.toFixed(2)}).`;
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

  // Poor High & Poor Low
  const poorHigh = active.bins.length > 0 && active.bins[0].tpos.length >= 2;
  const poorLow = active.bins.length > 0 && active.bins[active.bins.length - 1].tpos.length >= 2;

  // AB Poor High & Poor Low
  let abPoorExtreme = 'none';
  if (active.bins.length > 0) {
    const topBin = active.bins[0];
    const bottomBin = active.bins[active.bins.length - 1];
    const topHasAB = topBin.tpos.includes('A') || topBin.tpos.includes('B');
    const bottomHasAB = bottomBin.tpos.includes('A') || bottomBin.tpos.includes('B');
    
    const isAbPoorHigh = poorHigh && topHasAB;
    const isAbPoorLow = poorLow && bottomHasAB;
    
    if (isAbPoorHigh && isAbPoorLow) {
      abPoorExtreme = 'both';
    } else if (isAbPoorHigh) {
      abPoorExtreme = 'high';
    } else if (isAbPoorLow) {
      abPoorExtreme = 'low';
    }
  }

  const ibRange = active.ibHigh - active.ibLow;
  const ibPct = active.openPrice > 0 ? (ibRange / active.openPrice) * 100 : 0;
  const narrowIb = ibPct > 0 && ibPct < 0.45;

  // Buying Tail & Selling Tail calculation (Mind Over Markets definition: contiguous tpos.length === 1 of length >= 2 at the extremes)
  let sellingTail = false;
  let sellingTailLength = 0;
  if (active.bins && active.bins.length > 0) {
    for (let i = 0; i < active.bins.length; i++) {
      if (active.bins[i].tpos.length === 1) {
        sellingTailLength++;
      } else {
        break;
      }
    }
    if (sellingTailLength >= 2) {
      sellingTail = true;
    }
  }

  let buyingTail = false;
  let buyingTailLength = 0;
  if (active.bins && active.bins.length > 0) {
    for (let i = active.bins.length - 1; i >= 0; i--) {
      if (active.bins[i].tpos.length === 1) {
        buyingTailLength++;
      } else {
        break;
      }
    }
    if (buyingTailLength >= 2) {
      buyingTail = true;
    }
  }

  // Calculate Rotation Factor (Dalton Mind Over Markets Page 112)
  let rotationFactor = 0;
  if (active.periodRanges) {
    const keys = Object.keys(active.periodRanges).map(Number).sort((a, b) => a - b);
    for (let idx = 1; idx < keys.length; idx++) {
      const priorP = active.periodRanges[keys[idx - 1]];
      const currP = active.periodRanges[keys[idx]];
      if (priorP && currP) {
        let highScore = 0;
        if (currP.high > priorP.high) highScore = 1;
        else if (currP.high < priorP.high) highScore = -1;
        
        let lowScore = 0;
        if (currP.low > priorP.low) lowScore = 1;
        else if (currP.low < priorP.low) lowScore = -1;
        
        rotationFactor += (highScore + lowScore);
      }
    }
  }

  // Spike Detection & Acceptance/Rejection Rules (Dalton Mind Over Markets Page 247)
  let spikeOpenSetup = 'none';
  let spikeOpenDesc = '';
  
  if (prior) {
    const priorSpike = detectSpike(prior);
    if (priorSpike.type === 'Buying Spike') {
      const open = active.openPrice;
      if (open > priorSpike.extreme) {
        spikeOpenSetup = 'Bullish Acceptance';
        spikeOpenDesc = `🟢 SPIKE ACCEPTANCE (Bullish): Price opened at ${open.toFixed(2)}, above yesterday's Buying Spike extreme (${priorSpike.extreme.toFixed(2)}). Initiative buyers are in control. Expect trend continuation.`;
      } else if (open >= priorSpike.base && open <= priorSpike.extreme) {
        spikeOpenSetup = 'Balance within Spike';
        spikeOpenDesc = `🟡 BALANCE WITHIN SPIKE: Price opened at ${open.toFixed(2)}, inside yesterday's Buying Spike range (${priorSpike.base.toFixed(2)} - ${priorSpike.extreme.toFixed(2)}). Expect two-timeframe consolidation. The spike top acts as resistance, and the base acts as support.`;
      } else {
        spikeOpenSetup = 'Bearish Rejection';
        spikeOpenDesc = `🔴 SPIKE REJECTION (Bearish Reversal): Price opened at ${open.toFixed(2)}, below yesterday's Buying Spike base (${priorSpike.base.toFixed(2)}). This is a high-probability fade setup targeting yesterday's Value Area High (${prior.vahPrice.toFixed(2)}).`;
      }
    } else if (priorSpike.type === 'Selling Spike') {
      const open = active.openPrice;
      if (open < priorSpike.extreme) {
        spikeOpenSetup = 'Bearish Acceptance';
        spikeOpenDesc = `🔴 SPIKE ACCEPTANCE (Bearish): Price opened at ${open.toFixed(2)}, below yesterday's Selling Spike extreme (${priorSpike.extreme.toFixed(2)}). Initiative sellers are in control. Expect trend continuation.`;
      } else if (open >= priorSpike.extreme && open <= priorSpike.base) {
        spikeOpenSetup = 'Balance within Spike';
        spikeOpenDesc = `🟡 BALANCE WITHIN SPIKE: Price opened at ${open.toFixed(2)}, inside yesterday's Selling Spike range (${priorSpike.extreme.toFixed(2)} - ${priorSpike.base.toFixed(2)}). Expect two-timeframe consolidation. The spike bottom acts as support, and the base acts as resistance.`;
      } else {
        spikeOpenSetup = 'Bullish Rejection';
        spikeOpenDesc = `🟢 SPIKE REJECTION (Bullish Reversal): Price opened at ${open.toFixed(2)}, above yesterday's Selling Spike base (${priorSpike.base.toFixed(2)}). This is a high-probability fade setup targeting yesterday's Value Area Low (${prior.valPrice.toFixed(2)}).`;
      }
    }
  }

  // Overnight Inventory Adjustment Rule (Dalton Mind Over Markets Page 305)
  let overnightInventory = 'neutral';
  let overnightInventoryDesc = 'Overnight inventory is balanced.';
  if (prior) {
    const gapPct = ((active.openPrice - prior.closePrice) / prior.closePrice) * 100;
    if (gapPct >= 0.15) {
      overnightInventory = 'long';
      overnightInventoryDesc = `Overnight inventory is LONG (Opened higher by +${gapPct.toFixed(2)}%). Expect potential early inventory adjustment (profit-taking selloff) unless met by strong initiative buying.`;
    } else if (gapPct <= -0.15) {
      overnightInventory = 'short';
      overnightInventoryDesc = `Overnight inventory is SHORT (Opened lower by ${gapPct.toFixed(2)}%). Expect potential early inventory adjustment (short covering rally) unless met by strong initiative selling.`;
    }
  }

  // 3 to I Day & 2I to 1R Day Special Situations (Dalton Mind Over Markets Page 239)
  const threeToOneDay = detectThreeToOneDay(active, {
    buyingTail,
    sellingTail,
    rotationFactor,
    cFailure,
    dFailure,
    eFailure
  });
  
  let threeToOneDesc = '';
  if (threeToOneDay === '3 to I Buying Day') {
    threeToOneDesc = '🔥 3 TO I BUYING DAY: Confluence of Buying Tail + Upside Extension + Buying TPOs. High probability (94% win rate) of trading higher or opening above value tomorrow morning.';
  } else if (threeToOneDay === '3 to I Selling Day') {
    threeToOneDesc = '❄️ 3 TO I SELLING DAY: Confluence of Selling Tail + Downside Extension + Selling TPOs. High probability (94% win rate) of trading lower or opening below value tomorrow morning.';
  } else if (threeToOneDay === '2I to 1R Day') {
    threeToOneDesc = '⚡ 2I to 1R CONVICTION DAY: Contains responsive tail + initiative extensions. High probability (71% win rate) of trading better than value tomorrow morning.';
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
    poorHigh,
    poorLow,
    buyingTail,
    sellingTail,
    abPoorExtreme,
    narrowIb,
    doubleDistribution: hasDoubleDistribution(active),
    profileShape: getProfileShape(active),
    profileShapeDesc: getProfileShape(active) === 'P-shape'
      ? 'Short covering rally: price drove up rapidly, then consolidated at the high. Typically represents short covering rather than aggressive new buyers. High risk of fading back down.'
      : getProfileShape(active) === 'b-shape'
      ? 'Long liquidation break: price broke down rapidly, then consolidated at the low. Typically represents long positions exiting rather than aggressive new sellers. High chance of fading back up.'
      : '',
    ledge: detectLedges(active.periodRanges, active.tickSize),
    rotationFactor,
    eightyPercentRule,
    spikeOpenSetup,
    spikeOpenDesc,
    overnightInventory,
    overnightInventoryDesc,
    threeToOneDay,
    threeToOneDesc
  };
}

async function safeCleanup(cleanupFn) {
  if (!cleanupFn) return;
  try {
    const res = cleanupFn();
    if (res && typeof res.then === 'function') {
      await res;
    }
  } catch (e) {
    console.error('[Scanner] Error during cleanup:', e);
  }
}

function scanSymbol(tvBridge, symbol) {
  return new Promise((resolve) => {
    let resolved = false;
    let cleanup = null;
    
    const timeout = setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        console.log(`[Scanner] Timeout scanning ${symbol}`);
        await safeCleanup(cleanup);
        resolve(null);
      }
    }, 15000);
    
    tvBridge.subscribeSymbol(symbol, '30', async (data) => {
      if (data.isSnapshot) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          
          let result = null;
          try {
            if (data.candles && data.candles.length > 0) {
              const groups = groupCandlesByDay(data.candles);
              const dates = Object.keys(groups).sort();
              if (dates.length > 0) {
                // Calculate profiles for all days
                const profiles = dates.map(d => calculateDayProfile(d, groups[d], 40, symbol)).filter(p => p !== null);
                if (profiles.length > 0) {
                  const activeProfile = profiles[profiles.length - 1];
                  const priorProfile = profiles.length >= 2 ? profiles[profiles.length - 2] : null;
                  
                  const nuances = analyzeNuances(activeProfile, priorProfile);
                  
                  const hasOtf = nuances.otfType !== 'none';
                  const hasFailure = nuances.cFailure || nuances.dFailure || nuances.eFailure !== 'none';
                  const hasPoorExtreme = nuances.poorHigh || nuances.poorLow;
                  const hasAbPoorExtreme = nuances.abPoorExtreme !== 'none';
                  const isNarrowIb = nuances.narrowIb;
                  
                  // 1. POC Exhaustion: Point of Control has exactly 5 TPOs
                  const pocBin = activeProfile.bins.find(b => b.price === activeProfile.pocPrice);
                  const pocExhaustion = pocBin ? pocBin.tpos.length === 5 : false;

                  // 2. Late Day Drive: High or Low established in Period K, L, M (index >= 10)
                  let highPeriodIdx = -1;
                  let lowPeriodIdx = -1;
                  let setsHighLate = false;
                  let setsLowLate = false;
                  if (activeProfile.periodRanges) {
                    Object.entries(activeProfile.periodRanges).forEach(([pIdxStr, r]) => {
                      const pIdx = parseInt(pIdxStr, 10);
                      if (r.high === activeProfile.dayHigh) {
                        if (highPeriodIdx === -1 || pIdx < highPeriodIdx) highPeriodIdx = pIdx;
                      }
                      if (r.low === activeProfile.dayLow) {
                        if (lowPeriodIdx === -1 || pIdx < lowPeriodIdx) lowPeriodIdx = pIdx;
                      }
                    });
                    setsHighLate = highPeriodIdx >= 10;
                    setsLowLate = lowPeriodIdx >= 10;
                  }
                  const lateDayDrive = setsHighLate || setsLowLate;

                  // 3. 3-Day Balance: Consolidation within a tight range (POC spread < 0.7% on prior 3 sessions)
                  let threeDayBalance = false;
                  if (profiles.length >= 4) {
                    const p1 = profiles[profiles.length - 2]; // yesterday
                    const p2 = profiles[profiles.length - 3]; // 2 days ago
                    const p3 = profiles[profiles.length - 4]; // 3 days ago
                    const pocs = [p1.pocPrice, p2.pocPrice, p3.pocPrice];
                    const maxPoc = Math.max(...pocs);
                    const minPoc = Math.min(...pocs);
                    if (minPoc > 0) {
                      const spreadPct = ((maxPoc - minPoc) / minPoc) * 100;
                      threeDayBalance = spreadPct < 0.7;
                    }
                  }

                  // 4. Kangaroo Jump: Untested POC gaps over 3 consecutive days prior to today
                  let kangarooJump = false;
                  if (profiles.length >= 4) {
                    const p1 = profiles[profiles.length - 2]; // yesterday
                    const p2 = profiles[profiles.length - 3]; // 2 days ago
                    const p3 = profiles[profiles.length - 4]; // 3 days ago
                    
                    const risingPocs = p1.pocPrice > p2.pocPrice && p2.pocPrice > p3.pocPrice;
                    const risingUntested = p1.dayLow > p2.pocPrice && p2.dayLow > p3.pocPrice;
                    
                    const fallingPocs = p1.pocPrice < p2.pocPrice && p2.pocPrice < p3.pocPrice;
                    const fallingUntested = p1.dayHigh < p2.pocPrice && p2.dayHigh < p3.pocPrice;
                    
                    if ((risingPocs && risingUntested) || (fallingPocs && fallingUntested)) {
                      kangarooJump = true;
                    }
                  }
                  
                  // Compute Unrepaired Poor Extremes (chronologically)
                  let unrepairedPoorHighs = [];
                  let unrepairedPoorLows = [];
                  for (let i = 0; i < profiles.length - 1; i++) {
                    const p = profiles[i];
                    const dateStr = p.dateStr || p.date || `Day ${i}`;
                    
                    // 1. Check if day p repairs previous days' poor extremes
                    unrepairedPoorHighs = unrepairedPoorHighs.filter(h => p.dayHigh < h.price);
                    unrepairedPoorLows = unrepairedPoorLows.filter(l => p.dayLow > l.price);
                    
                    // 2. Check if day p leaves a new poor high/low
                    const hasPoorHigh = p.bins.length > 0 && p.bins[0].tpos.length >= 2;
                    if (hasPoorHigh) {
                      unrepairedPoorHighs.push({ price: p.dayHigh, date: dateStr });
                    }
                    
                    const hasPoorLow = p.bins.length > 0 && p.bins[p.bins.length - 1].tpos.length >= 2;
                    if (hasPoorLow) {
                      unrepairedPoorLows.push({ price: p.dayLow, date: dateStr });
                    }
                  }

                  // Today's active range check
                  unrepairedPoorHighs = unrepairedPoorHighs.filter(h => activeProfile.dayHigh < h.price);
                  unrepairedPoorLows = unrepairedPoorLows.filter(l => activeProfile.dayLow > l.price);

                  const todayPrice = data.candles[data.candles.length - 1].close;
                  let magnetTarget = 'none';
                  let magnetPrice = 0;

                  for (const h of unrepairedPoorHighs) {
                    const diffPct = (Math.abs(todayPrice - h.price) / h.price) * 100;
                    if (diffPct <= 0.5) {
                      magnetTarget = 'poor-high';
                      magnetPrice = h.price;
                      break;
                    }
                  }

                  if (magnetTarget === 'none') {
                    for (const l of unrepairedPoorLows) {
                      const diffPct = (Math.abs(todayPrice - l.price) / l.price) * 100;
                      if (diffPct <= 0.5) {
                        magnetTarget = 'poor-low';
                        magnetPrice = l.price;
                        break;
                      }
                    }
                  }

                  // Compute Balance Breakout Failure (Trap Scanner)
                  let breakoutFailure = 'none';
                  let breakoutFailureTarget = 0;
                  if (profiles.length >= 5) {
                    const p1 = profiles[profiles.length - 2];
                    const p2 = profiles[profiles.length - 3];
                    const p3 = profiles[profiles.length - 4];
                    const p4 = profiles[profiles.length - 5];
                    
                    const balanceHigh = Math.max(p1.dayHigh, p2.dayHigh, p3.dayHigh, p4.dayHigh);
                    const balanceLow = Math.min(p1.dayLow, p2.dayLow, p3.dayLow, p4.dayLow);
                    
                    const activeHigh = activeProfile.dayHigh;
                    const activeLow = activeProfile.dayLow;
                    const activeClose = todayPrice;
                    
                    if (activeHigh > balanceHigh && activeClose < balanceHigh && activeClose > balanceLow) {
                      breakoutFailure = 'bull-trap';
                      breakoutFailureTarget = balanceLow;
                    } else if (activeLow < balanceLow && activeClose > balanceLow && activeClose < balanceHigh) {
                      breakoutFailure = 'bear-trap';
                      breakoutFailureTarget = balanceHigh;
                    }
                  }
                  
                  let failureLabel = 'none';
                  if (nuances.cFailure) {
                    failureLabel = 'c-failure';
                  } else if (nuances.dFailure) {
                    failureLabel = 'd-failure';
                  } else if (nuances.eFailure !== 'none') {
                    failureLabel = `e-failure-${nuances.eFailure}`;
                  }
                  
                  let poorExtremeLabel = 'none';
                  if (nuances.abPoorExtreme !== 'none') {
                    poorExtremeLabel = `ab-poor-${nuances.abPoorExtreme}`;
                  } else if (nuances.poorHigh && nuances.poorLow) {
                    poorExtremeLabel = 'poor-both';
                  } else if (nuances.poorHigh) {
                    poorExtremeLabel = 'poor-high';
                  } else if (nuances.poorLow) {
                    poorExtremeLabel = 'poor-low';
                  }
                  
                  // Compute IB range class
                  const ibRangeValue = activeProfile.ibHigh - activeProfile.ibLow;
                  const ibPctValue = activeProfile.openPrice > 0 ? (ibRangeValue / activeProfile.openPrice) * 100 : 0;
                  let ibRangeClass = 'medium';
                  if (ibPctValue > 0) {
                    if (ibPctValue < 0.45) ibRangeClass = 'small';
                    else if (ibPctValue > 1.2) ibRangeClass = 'large';
                  }
 
                  // Compute day classification type
                  const dayType = getDayType(activeProfile, nuances);
 
                  // Compute Opening Auction Predictive Insights
                  let openingPrediction = 'No prediction available';
                  if (nuances.openingType.includes('Open Drive')) {
                    openingPrediction = symbol === 'NSE:BANKNIFTY' 
                      ? '📈 DIRECTIONAL DRIVE: 86.9% probability of single-direction range expansion (Trend/Normal Variation). Do not trade counter-trend.' 
                      : '📈 DIRECTIONAL DRIVE: 55.6% probability of single-direction range expansion. Moderate trend strength.';
                  } else if (nuances.openingType.includes('Open Rejection Reverse')) {
                    openingPrediction = symbol === 'NSE:BANKNIFTY'
                      ? '🚨 NEUTRAL DAY WARNING: 100% probability of Neutral Day double-sided sweeps! Look to fade extremes.'
                      : '🚨 NEUTRAL DAY WARNING: 50% probability of Neutral Day double-sided sweeps! Look to fade extremes.';
                  } else if (nuances.openingType.includes('Open Test Drive')) {
                    openingPrediction = '🔄 TEST DRIVE: ~70% - 80% probability of single-direction range expansion after reference rejection.';
                  } else if (nuances.openingType.includes('Open Auction')) {
                    openingPrediction = '⚖️ RANGE BOUND: ~85% probability of rotational trading (Normal / Normal Variation Day). Sell premium at wicks.';
                  }

                  // Compute C/D Failure Reversion Predictions
                  let failurePrediction = 'none';
                  if (failureLabel === 'c-failure') {
                    failurePrediction = `⚠️ PERIOD C FAILURE: Bullish OTF broken at Period D. Reversion to IBL (${activeProfile.ibLow.toFixed(2)}) has a 25.9% probability. Fades are highly active.`;
                  } else if (failureLabel === 'd-failure') {
                    failurePrediction = `⚠️ PERIOD D FAILURE: Bullish OTF broken at Period E. Reversion to IBL (${activeProfile.ibLow.toFixed(2)}) has a 16.7% probability. Shallow pullback is expected.`;
                  }

                  result = {
                    symbol,
                    otf: nuances.otfType,
                    failure: failureLabel,
                    poorExtreme: poorExtremeLabel,
                    narrowIb: isNarrowIb,
                    ibRangeClass,
                    dayType,
                    pocExhaustion,
                    threeDayBalance,
                    kangarooJump,
                    lateDayDrive,
                    doubleDistribution: nuances.doubleDistribution,
                    profileShape: nuances.profileShape,
                    profileShapeDesc: nuances.profileShapeDesc,
                    ledge: nuances.ledge,
                    buyingTail: nuances.buyingTail,
                    sellingTail: nuances.sellingTail,
                    rotationFactor: nuances.rotationFactor,
                    eightyPercentRule: nuances.eightyPercentRule,
                    spikeOpenSetup: nuances.spikeOpenSetup,
                    spikeOpenDesc: nuances.spikeOpenDesc,
                    overnightInventory: nuances.overnightInventory,
                    overnightInventoryDesc: nuances.overnightInventoryDesc,
                    threeToOneDay: nuances.threeToOneDay,
                    threeToOneDesc: nuances.threeToOneDesc,
                    openingType: nuances.openingType,
                    openingTypeDesc: nuances.openingTypeDesc,
                    openingPrediction,
                    failurePrediction,
                    breakoutFailure,
                    breakoutFailureTarget,
                    magnetTarget,
                    magnetPrice,
                    unfinishedAuctions: {
                      poorHighs: unrepairedPoorHighs,
                      poorLows: unrepairedPoorLows
                    },
                    price: todayPrice,
                    timestamp: new Date().toLocaleTimeString()
                  };

                  try {
                    processSignalsForSymbol(symbol, data.candles, profiles);
                  } catch (e) {
                    console.error(`[Scanner] Error tracking signals for ${symbol}:`, e.message);
                  }
                }
              }
            }
          } catch (err) {
            console.error(`[Scanner] Error parsing data for ${symbol}:`, err);
          }
          
          await safeCleanup(cleanup);
          resolve(result);
        }
      }
    }, async (err) => {
      console.error(`[Scanner] Bridge error for ${symbol}:`, err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        await safeCleanup(cleanup);
        resolve(null);
      }
    }).then(async (cleanupFn) => {
      cleanup = cleanupFn;
      if (resolved && cleanup) {
        await safeCleanup(cleanup);
      }
    }).catch(err => {
      console.error(`[Scanner] Subscription promise failed for ${symbol}:`, err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });
  });
}


async function scanInBatches(tvBridge, symbols, batchSize = 1) {
  let matchedResults = [];
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    // Update progress state
    scanStatus.progress = `${i}/${symbols.length}`;
    console.log(`[Scanner] Scanning symbol: ${batch.join(', ')} (${i}/${symbols.length})`);
    
    const promises = batch.map(sym => scanSymbol(tvBridge, sym));
    const results = await Promise.all(promises);
    
    for (const res of results) {
      if (res) {
        matchedResults.push(res);
      }
    }
    
    // Gentle delay between sequential scans to avoid connection drops
    await new Promise(r => setTimeout(r, 1000));
  }
  
  scanStatus.progress = `${symbols.length}/${symbols.length}`;
  return matchedResults;
}

export function startScanner(tvBridge) {
  console.log('[Scanner] Starting scanner engine...');
  
  (async () => {
    while (true) {
      scanStatus.status = 'scanning';
      console.log('[Scanner] Beginning full market scan...');
      
      try {
        try {
          await updateIndexPcrDrift();
        } catch (pcrErr) {
          console.error('[Scanner] Failed to update Index PCR drift:', pcrErr.message);
        }
        
        const results = await scanInBatches(tvBridge, symbols, 1);
        scanResults = results;
        scanStatus.lastScanTime = new Date().toLocaleTimeString();
        console.log(`[Scanner] Full scan completed! Found ${results.length} matches.`);
        
        try {
          optimizeParameters();
        } catch (e) {
          console.error('[Scanner] Error during auto-learning parameter optimization:', e.message);
        }

        // Trigger daily post-mortem after market hours (3:35 PM IST onwards)
        try {
          const now = new Date();
          const utc = now.getTime() + now.getTimezoneOffset() * 60000;
          const ist = new Date(utc + 3600000 * 5.5);
          const hrs = ist.getHours();
          const mins = ist.getMinutes();
          const minsSinceMidnight = hrs * 60 + mins;
          
          if (minsSinceMidnight >= 935) {
            console.log('[Scanner] Post-market hours detected. Running Daily Post-Mortem Analyzer...');
            // Dynamic import to prevent circular dependency
            const { runDailyPostMortem } = await import('./daily_backtest_learner.js');
            await runDailyPostMortem();
          }
        } catch (postMortemErr) {
          console.error('[Scanner] Error running daily post-mortem:', postMortemErr.message);
        }
      } catch (err) {
        console.error('[Scanner] Critical error in scan cycle:', err);
      } finally {
        try {
          await tvBridge.closeSession();
        } catch (e) {
          console.error('[Scanner] Error closing session at end of cycle:', e);
        }
        
        // Force garbage collection if flag is exposed
        if (global.gc) {
          try {
            global.gc();
            console.log('[Scanner] Forced garbage collection to free memory.');
          } catch (gcErr) {
            console.error('[Scanner] Garbage collection failed:', gcErr);
          }
        }
      }
      
      scanStatus.status = 'idle';
      
      // Pause for 10 minutes between cycles to reduce memory overhead and socket churn
      console.log('[Scanner] Sleeping for 10 minutes before next scan cycle...');
      await new Promise(r => setTimeout(r, 600 * 1000));
    }
  })();
}

export function getScannerState() {
  return {
    ...scanStatus,
    results: scanResults
  };
}
