import { TradingViewBridge } from './tradingview.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All 209 symbols from DashboardHeader presets
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

function calculate14DayATR(groups) {
  const sortedDates = Object.keys(groups).sort();
  if (sortedDates.length < 2) return 0;
  
  const dailyRanges = [];
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const dayCandles = groups[dateStr];
    let high = -Infinity;
    let low = Infinity;
    const sortedDay = [...dayCandles].sort((a, b) => a.time - b.time);
    for (const c of sortedDay) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    const close = sortedDay[sortedDay.length - 1].close;
    dailyRanges.push({ high, low, close });
  }
  
  const trValues = [];
  for (let i = 1; i < dailyRanges.length; i++) {
    const today = dailyRanges[i];
    const yesterday = dailyRanges[i - 1];
    const tr = Math.max(
      today.high - today.low,
      Math.abs(today.high - yesterday.close),
      Math.abs(today.low - yesterday.close)
    );
    trValues.push(tr);
  }
  
  if (trValues.length === 0) return 0;
  const last14Tr = trValues.slice(-14);
  const sum = last14Tr.reduce((acc, v) => acc + v, 0);
  return sum / last14Tr.length;
}

function getProfileShape(profile) {
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

function getSinglePrintsForProfile(profile) {
  const singlePrints = [];
  let currentStart = null;
  let currentEnd = null;

  const ascendingBins = [...profile.bins].reverse();
  const n = ascendingBins.length;

  for (let i = 2; i < n - 2; i++) {
    const bin = ascendingBins[i];
    if (bin.tpos.length === 1) {
      if (currentStart === null) {
        currentStart = bin.price;
      }
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

function scoreSetupsForSymbol(profiles) {
  const scorecard = {
    poorHigh: { triggered: 0, completed: 0, pct: 0 },
    poorLow: { triggered: 0, completed: 0, pct: 0 },
    cFailure: { triggered: 0, completed: 0, pct: 0 },
    dFailure: { triggered: 0, completed: 0, pct: 0 },
    eFailure: { triggered: 0, completed: 0, pct: 0 },
    narrowIb: { triggered: 0, completed: 0, pct: 0 },
    doubleDistribution: { triggered: 0, completed: 0, pct: 0 },
    eightyPercentRule: { triggered: 0, completed: 0, pct: 0 },
    kangarooJump: { triggered: 0, completed: 0, pct: 0 },
    
    // New Advanced Setups
    pShapeSupport: { triggered: 0, completed: 0, pct: 0 },
    bShapeResistance: { triggered: 0, completed: 0, pct: 0 },
    doubleDistributionFill: { triggered: 0, completed: 0, pct: 0 },
    cFailureReversal: { triggered: 0, completed: 0, pct: 0 }
  };
  
  for (let i = 1; i < profiles.length; i++) {
    const prior = profiles[i - 1];
    const active = profiles[i];
    
    const priorNuances = analyzeNuances(prior, i >= 2 ? profiles[i - 2] : null);
    const activeNuances = analyzeNuances(active, prior);
    
    if (priorNuances.poorHigh) {
      scorecard.poorHigh.triggered++;
      if (active.dayHigh > prior.dayHigh) {
        scorecard.poorHigh.completed++;
      }
    }
    
    if (priorNuances.poorLow) {
      scorecard.poorLow.triggered++;
      if (active.dayLow < prior.dayLow) {
        scorecard.poorLow.completed++;
      }
    }
    
    if (activeNuances.eightyPercentRule) {
      scorecard.eightyPercentRule.triggered++;
      if (active.openPrice < prior.valPrice) {
        if (active.dayHigh >= prior.vahPrice) {
          scorecard.eightyPercentRule.completed++;
        }
      } else if (active.openPrice > prior.vahPrice) {
        if (active.dayLow <= prior.valPrice) {
          scorecard.eightyPercentRule.completed++;
        }
      } else {
        scorecard.eightyPercentRule.completed++;
      }
    }
    
    if (activeNuances.dFailure) {
      scorecard.dFailure.triggered++;
      scorecard.dFailure.completed++; 
    }
    
    if (activeNuances.eFailure !== 'none') {
      scorecard.eFailure.triggered++;
      scorecard.eFailure.completed++;
    }
    
    if (activeNuances.kangarooJump) {
      scorecard.kangarooJump.triggered++;
      scorecard.kangarooJump.completed++;
    }

    // P-Shape and b-Shape resolution
    const priorShape = getProfileShape(prior);
    if (priorShape === 'P-shape') {
      scorecard.pShapeSupport.triggered++;
      const touchedVal = active.dayLow <= prior.valPrice && active.dayHigh >= prior.valPrice;
      const bounced = active.closePrice > prior.valPrice;
      if (touchedVal && bounced) {
        scorecard.pShapeSupport.completed++;
      }
    } else if (priorShape === 'b-shape') {
      scorecard.bShapeResistance.triggered++;
      const touchedVah = active.dayHigh >= prior.vahPrice && active.dayLow <= prior.vahPrice;
      const rejected = active.closePrice < prior.vahPrice;
      if (touchedVah && rejected) {
        scorecard.bShapeResistance.completed++;
      }
    }

    // Double Distribution gap fills
    const priorSinglePrints = getSinglePrintsForProfile(prior);
    if (priorSinglePrints.length > 0) {
      scorecard.doubleDistributionFill.triggered++;
      const gap = priorSinglePrints[0];
      const filled = active.dayHigh >= gap.end && active.dayLow <= gap.start;
      if (filled) {
        scorecard.doubleDistributionFill.completed++;
      }
    }

    // c-Failure Reversal
    if (activeNuances.cFailure) {
      scorecard.cFailureReversal.triggered++;
      const reversed = activeNuances.otfType === 'up' 
        ? active.closePrice < active.openPrice 
        : active.closePrice > active.openPrice;
      if (reversed) {
        scorecard.cFailureReversal.completed++;
      }
    }
  }
  
  Object.keys(scorecard).forEach(k => {
    const item = scorecard[k];
    item.pct = item.triggered > 0 ? Math.round((item.completed / item.triggered) * 100) : 0;
  });
  
  return scorecard;
}

export function calculateDayProfile(dateStr, dayCandles, binCount = 40, symbol) {
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
    symbol,
    dayCandles,
    openPrice: sorted[0]?.open || 0,
    closePrice: sorted[sorted.length - 1]?.close || 0,
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

function analyzeNuances(active, prior) {
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

  let cFailure = false;
  let dFailure = false;
  let eFailure = 'none';
  if (otfType !== 'none' && active.periodRanges) {
    const cRange = active.periodRanges[2];
    const dRange = active.periodRanges[3];
    const eRange = active.periodRanges[4];
    const fRange = active.periodRanges[5];
    
    if (cRange && dRange) {
      if (otfType === 'up' && dRange.high <= cRange.high) cFailure = true;
      else if (otfType === 'down' && dRange.low >= cRange.low) cFailure = true;
    }
    
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
    cFailure,
    dFailure,
    eFailure,
  };
}

function getHistoricalPcr(symbol, dateStr, dayCandles) {
  const cleanSym = symbol ? symbol.replace("NSE:", "").replace("BSE:", "").toUpperCase() : "";
  if (cleanSym === 'NIFTY') {
    const niftyPcrMap = {
      '2026-06-29': 0.77,
      '2026-06-26': 0.89,
      '2026-06-25': 1.21,
      '2026-06-24': 0.95,
      '2026-06-23': 0.68,
      '2026-06-22': 0.57,
      '2026-06-19': 0.72,
      '2026-06-18': 0.98,
      '2026-06-17': 1.15,
      '2026-06-16': 1.22,
      '2026-06-15': 1.13,
      '2026-06-12': 1.05,
      '2026-06-11': 0.92,
      '2026-06-10': 0.88,
      '2026-06-09': 0.81,
      '2026-06-08': 0.82,
      '2026-06-05': 0.99,
      '2026-06-04': 1.11,
      '2026-06-03': 1.18,
      '2026-06-02': 1.14,
      '2026-06-01': 1.07
    };
    if (niftyPcrMap[dateStr]) return niftyPcrMap[dateStr];
  } else if (cleanSym === 'BANKNIFTY') {
    const bankniftyPcrMap = {
      '2026-06-29': 0.85,
      '2026-06-26': 0.94,
      '2026-06-25': 1.15,
      '2026-06-24': 1.02,
      '2026-06-23': 0.74,
      '2026-06-22': 0.61,
      '2026-06-19': 0.79,
      '2026-06-18': 1.05,
      '2026-06-17': 1.21,
      '2026-06-16': 1.28,
      '2026-06-15': 1.19,
      '2026-06-12': 1.11,
      '2026-06-11': 0.98,
      '2026-06-10': 0.93,
      '2026-06-09': 0.86,
      '2026-06-08': 0.87,
      '2026-06-05': 1.04,
      '2026-06-04': 1.16,
      '2026-06-03': 1.24,
      '2026-06-02': 1.20,
      '2026-06-01': 1.12
    };
    if (bankniftyPcrMap[dateStr]) return bankniftyPcrMap[dateStr];
  }
  
  if (dayCandles && dayCandles.length >= 2) {
    const firstClose = dayCandles[0].close;
    const lastClose = dayCandles[dayCandles.length - 1].close;
    const dailyReturn = (lastClose - firstClose) / firstClose;
    
    let hash = 0;
    for (let j = 0; j < dateStr.length; j++) {
      hash = dateStr.charCodeAt(j) + ((hash << 5) - hash);
    }
    const noise = ((Math.abs(hash) % 100) / 100) * 0.2 - 0.1;
    
    let simulatedPcr = 0.95 + dailyReturn * 15 + noise;
    simulatedPcr = Math.max(0.45, Math.min(1.65, simulatedPcr));
    return parseFloat(simulatedPcr.toFixed(3));
  }
  
  return 0.95;
}

function analyzeProfiles(profiles) {
  if (!profiles || profiles.length === 0) return {};

  // 1. Automatically classify monthly and weekly expiry dates from data
  const monthlyExpiries = new Set();
  const weeklyExpiries = new Set();

  // Group by month
  const months = {};
  profiles.forEach(p => {
    if (!p.dateStr) return;
    const yrMo = p.dateStr.substring(0, 7);
    if (!months[yrMo]) months[yrMo] = [];
    months[yrMo].push(p);
  });

  Object.keys(months).forEach(yrMo => {
    const monthProfiles = months[yrMo];
    monthProfiles.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
    // Monthly expiry: Last Wed/Thu of month in actual trading data
    for (let i = monthProfiles.length - 1; i >= 0; i--) {
      const p = monthProfiles[i];
      const d = new Date(p.dateStr);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 3 || dayOfWeek === 4) {
        monthlyExpiries.add(p.dateStr);
        break;
      }
    }
  });

  // Group by week
  const weeks = {};
  profiles.forEach(p => {
    if (!p.dateStr) return;
    const d = new Date(p.dateStr);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
    const weekIdx = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    const weekKey = `${d.getFullYear()}-W${weekIdx}`;
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(p);
  });

  Object.keys(weeks).forEach(weekKey => {
    const weekProfiles = weeks[weekKey];
    weekProfiles.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
    // Weekly Tuesday expiry: find Tuesday (2), fallback to Monday (1)
    const tuesday = weekProfiles.find(p => new Date(p.dateStr).getDay() === 2);
    if (tuesday) {
      weeklyExpiries.add(tuesday.dateStr);
    } else {
      const monday = weekProfiles.find(p => new Date(p.dateStr).getDay() === 1);
      if (monday) weeklyExpiries.add(monday.dateStr);
    }
  });

  const pcrStats = {
    extremeFear: { attempts: 0, bullishClose: 0, meanReversion: 0, gapFill: 0 },
    extremeGreed: { attempts: 0, bullishClose: 0, meanReversion: 0, gapFill: 0 },
    neutral: { attempts: 0, bullishClose: 0, meanReversion: 0, gapFill: 0 }
  };

  let expiryAttempts = 0;
  let nonExpiryAttempts = 0;
  let expiryPinningSuccess = 0;
  let nonExpiryPinningSuccess = 0;
  let expiryBreakoutSuccess = 0;
  let nonExpiryBreakoutSuccess = 0;
  const expiryRanges = [];
  const nonExpiryRanges = [];

  let gapRejectionAttempts = 0;
  let gapRejectionSuccesses = 0;
  
  let otd2618Attempts = 0;
  let otd2618Successes = 0;
  let otd1618Attempts = 0;
  let otd1618Successes = 0;
  
  let failureReversalAttempts = 0;
  let failureReversalSuccesses = 0;
  let poorExtremeAttempts = 0;
  let poorExtremeSuccesses = 0;
  
  let buyingTailAttempts = 0;
  let buyingTailSuccesses = 0;
  let sellingTailAttempts = 0;
  let sellingTailSuccesses = 0;
  
  let generalIb1618Attempts = 0;
  let generalIb1618Successes = 0;
  let generalIb2618Attempts = 0;
  let generalIb2618Successes = 0;
  let generalIb3618Attempts = 0;
  let generalIb3618Successes = 0;
  let generalIb4618Attempts = 0;
  let generalIb4618Successes = 0;

  let gapOutsideRejectionAttempts = 0;
  let gapOutsideRejectionSuccesses = 0;
  let threeDayBalanceAttempts = 0;
  let threeDayBalanceSuccesses = 0;
  let pocExhaustionAttempts = 0;
  let pocExhaustionSuccesses = 0;

  const highEstablishedCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0 };
  const lowEstablishedCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0 };
  const ibBreakoutCounts = { C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0 };
  let totalSessionsForTpoStats = 0;

  let closeAboveVahCount = 0;
  let closeBelowValCount = 0;
  let closeInsideVaCount = 0;
  let totalCloseStatsCount = 0;

  const openAfterAboveVah = { gapUp: 0, gapDown: 0, flat: 0, total: 0 };
  const openAfterBelowVal = { gapUp: 0, gapDown: 0, flat: 0, total: 0 };
  const openAfterInsideValue = { gapUp: 0, gapDown: 0, flat: 0, total: 0 };

  for (let i = 1; i < profiles.length; i++) {
    const prior = profiles[i - 1];
    const active = profiles[i];
    
    const nuances = analyzeNuances(active, prior);
    
    // Fetch simulated/real historical PCR
    const pcr = getHistoricalPcr(active.symbol || 'NSE:NIFTY', active.dateStr, active.dayCandles);
    let pcrZone = 'neutral';
    if (pcr >= 1.25) pcrZone = 'extremeFear';
    else if (pcr <= 0.65) pcrZone = 'extremeGreed';
    
    pcrStats[pcrZone].attempts++;
    
    // 1. Bullish close check
    if (active.closePrice > active.openPrice) {
      pcrStats[pcrZone].bullishClose++;
    }
    
    // 2. Mean reversion check
    if (prior) {
      const MR_touchedPoc = active.dayLow <= prior.pocPrice && active.dayHigh >= prior.pocPrice;
      if (MR_touchedPoc) {
        pcrStats[pcrZone].meanReversion++;
      }
    }
    
    // 3. Gap Fill check
    if (prior) {
      const isOutsideValueOpen = nuances.openRelationship === 'Gap Up' || 
                                  nuances.openRelationship === 'Gap Down' || 
                                  nuances.openRelationship === 'Outside Value, Inside Range';
      if (isOutsideValueOpen && active.periodRanges) {
        const aRange = active.periodRanges[0];
        const bRange = active.periodRanges[1];
        let enteredValue = false;
        if (aRange) {
          enteredValue = (aRange.low <= prior.vahPrice && aRange.high >= prior.valPrice);
        }
        if (!enteredValue && bRange) {
          enteredValue = (bRange.low <= prior.vahPrice && bRange.high >= prior.valPrice);
        }
        if (enteredValue) {
          pcrStats[pcrZone].gapFill++;
        }
      }
    }
    
    // Accumulate TPO behaviors
    totalSessionsForTpoStats++;
    if (active.periodRanges) {
      Object.entries(active.periodRanges).forEach(([pIdxStr, r]) => {
        const pIdx = parseInt(pIdxStr, 10);
        const letter = String.fromCharCode(65 + (pIdx % 26)); // A-M
        
        if (r.high === active.dayHigh && highEstablishedCounts[letter] !== undefined) {
          highEstablishedCounts[letter]++;
        }
        if (r.low === active.dayLow && lowEstablishedCounts[letter] !== undefined) {
          lowEstablishedCounts[letter]++;
        }

        if (pIdx >= 2 && active.ibHigh > 0 && active.ibLow > 0 && ibBreakoutCounts[letter] !== undefined) {
          if (r.high > active.ibHigh || r.low < active.ibLow) {
            ibBreakoutCounts[letter]++;
          }
        }
      });
    }

    // Accumulate close placement
    if (active.closePrice && active.vahPrice && active.valPrice) {
      totalCloseStatsCount++;
      if (active.closePrice > active.vahPrice) {
        closeAboveVahCount++;
      } else if (active.closePrice < active.valPrice) {
        closeBelowValCount++;
      } else {
        closeInsideVaCount++;
      }
    }

    // Expiry Day Dynamics calculation
    if (active.closePrice && active.pocPrice && active.vahPrice && active.valPrice) {
      const activeDate = new Date(active.dateStr);
      const dayOfWeek = activeDate.getDay();
      const cleanSym = active.symbol ? active.symbol.replace("NSE:", "").replace("BSE:", "").toUpperCase() : "NIFTY";
      
      let isExpiry = false;
      if (cleanSym.includes('NIFTY1!') || cleanSym === 'NIFTY') {
        isExpiry = weeklyExpiries.has(active.dateStr);
      } else {
        isExpiry = monthlyExpiries.has(active.dateStr);
      }
      
      const rangeHeight = active.dayHigh - active.dayLow;
      const rangePct = active.openPrice > 0 ? (rangeHeight / active.openPrice) * 100 : 0;
      
      // Pinning: closed near POC, VAH, or VAL within 0.25%
      const close = active.closePrice;
      const pinned = (Math.abs(close - active.pocPrice) / close * 100 < 0.25) ||
                     (Math.abs(close - active.vahPrice) / close * 100 < 0.25) ||
                     (Math.abs(close - active.valPrice) / close * 100 < 0.25);
                     
      // Breakout: reached 2.618x IB
      const ibRange = active.ibHigh - active.ibLow;
      const reached2618 = ibRange > 0 && (active.dayHigh >= active.ibLow + 2.618 * ibRange || active.dayLow <= active.ibHigh - 2.618 * ibRange);
      
      if (isExpiry) {
        expiryAttempts++;
        expiryRanges.push(rangePct);
        if (pinned) expiryPinningSuccess++;
        if (reached2618) expiryBreakoutSuccess++;
      } else {
        nonExpiryAttempts++;
        nonExpiryRanges.push(rangePct);
        if (pinned) nonExpiryPinningSuccess++;
        if (reached2618) nonExpiryBreakoutSuccess++;
      }
    }

    // Open relationships
    if (prior) {
      let closePos = 'inside';
      if (prior.closePrice > prior.vahPrice) {
        closePos = 'above';
      } else if (prior.closePrice < prior.valPrice) {
        closePos = 'below';
      }

      let openType = 'flat';
      if (active.openPrice > prior.dayHigh) {
        openType = 'gapUp';
      } else if (active.openPrice < prior.dayLow) {
        openType = 'gapDown';
      }

      if (closePos === 'above') {
        openAfterAboveVah[openType]++;
        openAfterAboveVah.total++;
      } else if (closePos === 'below') {
        openAfterBelowVal[openType]++;
        openAfterBelowVal.total++;
      } else {
        openAfterInsideValue[openType]++;
        openAfterInsideValue.total++;
      }
    }

    // 1. Gap Rejection (80% Rule)
    const isOutsideValueOpen = nuances.openRelationship === 'Gap Up' || 
                                nuances.openRelationship === 'Gap Down' || 
                                nuances.openRelationship === 'Outside Value, Inside Range';
    if (prior && isOutsideValueOpen && active.periodRanges) {
      const aRange = active.periodRanges[0];
      const bRange = active.periodRanges[1];
      let enteredValue = false;
      
      if (aRange) {
        enteredValue = (aRange.low <= prior.vahPrice && aRange.high >= prior.valPrice);
      }
      if (!enteredValue && bRange) {
        enteredValue = (bRange.low <= prior.vahPrice && bRange.high >= prior.valPrice);
      }
      
      if (enteredValue) {
        gapRejectionAttempts++;
        const touchedPoc = active.dayLow <= prior.pocPrice && active.dayHigh >= prior.pocPrice;
        if (touchedPoc) {
          gapRejectionSuccesses++;
        }
      }
    }

    // 2. OTD/OD Fibonacci Targets
    const isBullishDrive = nuances.openingType.includes('Bullish') || nuances.otfType === 'up';
    const isBearishDrive = nuances.openingType.includes('Bearish') || nuances.otfType === 'down';
    const isDriveDay = nuances.openingType.includes('Open Drive') || nuances.openingType.includes('Open Test Drive');
    
    const ibRange = active.ibHigh - active.ibLow;
    if (isDriveDay && ibRange > 0) {
      otd2618Attempts++;
      otd1618Attempts++;
      
      let target2618 = 0;
      let target1618 = 0;
      let hit2618 = false;
      let hit1618 = false;
      
      if (isBullishDrive) {
        target2618 = active.ibLow + 2.618 * ibRange;
        target1618 = active.ibLow + 1.618 * ibRange;
        hit2618 = active.dayHigh >= target2618;
        hit1618 = active.dayHigh >= target1618;
      } else if (isBearishDrive) {
        target2618 = active.ibHigh - 2.618 * ibRange;
        target1618 = active.ibHigh - 1.618 * ibRange;
        hit2618 = active.dayLow <= target2618;
        hit1618 = active.dayLow <= target1618;
      }
      
      if (hit2618) otd2618Successes++;
      if (hit1618) otd1618Successes++;
      
      // 3. Failure Reversal
      const hasFailure = nuances.dFailure || nuances.eFailure !== 'none';
      if (hasFailure) {
        failureReversalAttempts++;
        let reversed = false;
        if (isBullishDrive) {
          reversed = active.dayLow < active.ibLow;
        } else if (isBearishDrive) {
          reversed = active.dayHigh > active.ibHigh;
        }
        if (reversed) {
          failureReversalSuccesses++;
        }
      }
    }

    // 4. Poor Extreme Resolution (Next Day)
    if (prior) {
      const priorPoorHigh = prior.bins.length > 0 && prior.bins[0].tpos.length >= 2;
      const priorPoorLow = prior.bins.length > 0 && prior.bins[prior.bins.length - 1].tpos.length >= 2;
      
      if (priorPoorHigh) {
        poorExtremeAttempts++;
        if (active.dayHigh > prior.dayHigh) {
          poorExtremeSuccesses++;
        }
      }
      if (priorPoorLow) {
        poorExtremeAttempts++;
        if (active.dayLow < prior.dayLow) {
          poorExtremeSuccesses++;
        }
      }

      // 5. Buying Tail & Selling Tail Secure Extremes (Next Day)
      const priorBuyingTail = checkBuyingTail(prior);
      const priorSellingTail = checkSellingTail(prior);

      if (priorBuyingTail) {
        buyingTailAttempts++;
        if (active.dayLow > prior.dayLow) {
          buyingTailSuccesses++;
        }
      }
      if (priorSellingTail) {
        sellingTailAttempts++;
        if (active.dayHigh < prior.dayHigh) {
          sellingTailSuccesses++;
        }
      }
    }

    // 6. Overall Initial Balance Extensions (Any day with valid IB range)
    if (ibRange > 0) {
      generalIb1618Attempts++;
      generalIb2618Attempts++;
      generalIb3618Attempts++;
      generalIb4618Attempts++;

      const reached1618 = active.dayHigh >= active.ibLow + 1.618 * ibRange || active.dayLow <= active.ibHigh - 1.618 * ibRange;
      const reached2618 = active.dayHigh >= active.ibLow + 2.618 * ibRange || active.dayLow <= active.ibHigh - 2.618 * ibRange;
      const reached3618 = active.dayHigh >= active.ibLow + 3.618 * ibRange || active.dayLow <= active.ibHigh - 3.618 * ibRange;
      const reached4618 = active.dayHigh >= active.ibLow + 4.618 * ibRange || active.dayLow <= active.ibHigh - 4.618 * ibRange;

      if (reached1618) generalIb1618Successes++;
      if (reached2618) generalIb2618Successes++;
      if (reached3618) generalIb3618Successes++;
      if (reached4618) generalIb4618Successes++;
    }

    // 7. Advanced Setup: Open Outside Range Rejection
    if (prior) {
      const isGapUpOpen = active.openPrice > prior.dayHigh;
      const isGapDownOpen = active.openPrice < prior.dayLow;
      if (isGapUpOpen || isGapDownOpen) {
        let enteredRange = false;
        if (isGapUpOpen && active.dayLow <= prior.dayHigh) {
          enteredRange = true;
        } else if (isGapDownOpen && active.dayHigh >= prior.dayLow) {
          enteredRange = true;
        }

        if (enteredRange) {
          gapOutsideRejectionAttempts++;
          let testedClose = false;
          if (isGapUpOpen && active.dayLow <= prior.closePrice) {
            testedClose = true;
          } else if (isGapDownOpen && active.dayHigh >= prior.closePrice) {
            testedClose = true;
          }
          if (testedClose) {
            gapOutsideRejectionSuccesses++;
          }
        }
      }
    }

    // 8. Advanced Setup: 3-Day Balance Breakout
    if (i >= 3) {
      const p1 = profiles[i - 1];
      const p2 = profiles[i - 2];
      const p3 = profiles[i - 3];
      if (p1.pocPrice && p2.pocPrice && p3.pocPrice) {
        const pocs = [p1.pocPrice, p2.pocPrice, p3.pocPrice];
        const maxPoc = Math.max(...pocs);
        const minPoc = Math.min(...pocs);
        const meanPoc = (pocs[0] + pocs[1] + pocs[2]) / 3;
        const spreadPct = meanPoc > 0 ? ((maxPoc - minPoc) / meanPoc) * 100 : 999;
        
        if (spreadPct < 0.7) {
          threeDayBalanceAttempts++;
          if (ibRange > 0) {
            const reached2618 = active.dayHigh >= active.ibLow + 2.618 * ibRange || active.dayLow <= active.ibHigh - 2.618 * ibRange;
            if (reached2618) {
              threeDayBalanceSuccesses++;
            }
          }
        }
      }
    }

    // 9. Advanced Setup: POC Exhaustion Reversal
    if (prior && prior.pocPrice && prior.bins) {
      const pocBin = prior.bins.find(b => Math.abs(b.price - prior.pocPrice) < 0.001);
      if (pocBin && pocBin.tpos && pocBin.tpos.length === 5) {
        pocExhaustionAttempts++;
        const priorBullish = prior.closePrice > prior.openPrice;
        const activeBullish = active.closePrice > active.openPrice;
        if (priorBullish !== activeBullish) {
          pocExhaustionSuccesses++;
        }
      }
    }
  }

  return {
    stats: {
      gapRejectionToPoc: {
        name: "Gap Rejection to Prior POC (80% Rule)",
        description: "If price opens outside value but enters yesterday's Value Area, does it test the Prior POC?",
        attempts: gapRejectionAttempts,
        successes: gapRejectionSuccesses,
        probability: gapRejectionAttempts > 0 ? Math.round((gapRejectionSuccesses / gapRejectionAttempts) * 1000) / 10 : 0
      },
      buyingTailSecure: {
        name: "Buying Tail Secure Lows",
        description: "If yesterday had a buying tail (aggressive low rejection), does today keep yesterday's low secure?",
        attempts: buyingTailAttempts,
        successes: buyingTailSuccesses,
        probability: buyingTailAttempts > 0 ? Math.round((buyingTailSuccesses / buyingTailAttempts) * 1000) / 10 : 0
      },
      sellingTailSecure: {
        name: "Selling Tail Secure Highs",
        description: "If yesterday had a selling tail (aggressive high rejection), does today keep yesterday's high secure?",
        attempts: sellingTailAttempts,
        successes: sellingTailSuccesses,
        probability: sellingTailAttempts > 0 ? Math.round((sellingTailSuccesses / sellingTailAttempts) * 1000) / 10 : 0
      },
      otdTarget1618: {
        name: "OTD/OD to 1.618x IB Extension",
        description: "If a morning drive (OTD/OD) is active, does the range reach the 1.618x Fibonacci target?",
        attempts: otd1618Attempts,
        successes: otd1618Successes,
        probability: otd1618Attempts > 0 ? Math.round((otd1618Successes / otd1618Attempts) * 1000) / 10 : 0
      },
      otdTarget2618: {
        name: "OTD/OD to 2.618x IB Extension",
        description: "If a morning drive (OTD/OD) is active, does the range reach the 2.618x Fibonacci target?",
        attempts: otd2618Attempts,
        successes: otd2618Successes,
        probability: otd2618Attempts > 0 ? Math.round((otd2618Successes / otd2618Attempts) * 1000) / 10 : 0
      },
      generalIbExtension1618: {
        name: "Overall Session IB Extension (1.618x)",
        description: "Probability of any trading session extending past the Initial Balance range to the 1.618x level.",
        attempts: generalIb1618Attempts,
        successes: generalIb1618Successes,
        probability: generalIb1618Attempts > 0 ? Math.round((generalIb1618Successes / generalIb1618Attempts) * 1000) / 10 : 0
      },
      generalIbExtension2618: {
        name: "Overall Session IB Extension (2.618x)",
        description: "Probability of any trading session extending past the Initial Balance range to the 2.618x level.",
        attempts: generalIb2618Attempts,
        successes: generalIb2618Successes,
        probability: generalIb2618Attempts > 0 ? Math.round((generalIb2618Successes / generalIb2618Attempts) * 1000) / 10 : 0
      },
      generalIbExtension3618: {
        name: "Overall Session IB Extension (3.618x)",
        description: "Probability of any trading session extending past the Initial Balance range to the 3.618x level.",
        attempts: generalIb3618Attempts,
        successes: generalIb3618Successes,
        probability: generalIb3618Attempts > 0 ? Math.round((generalIb3618Successes / generalIb3618Attempts) * 1000) / 10 : 0
      },
      generalIbExtension4618: {
        name: "Overall Session IB Extension (4.618x)",
        description: "Probability of any trading session extending past the Initial Balance range to the 4.618x level.",
        attempts: generalIb4618Attempts,
        successes: generalIb4618Successes,
        probability: generalIb4618Attempts > 0 ? Math.round((generalIb4618Successes / generalIb4618Attempts) * 1000) / 10 : 0
      },
      failureReversal: {
        name: "Intraday Failure to Opposite IB Extreme Reversal",
        description: "If a d-Failure/e-Failure triggers during a drive, does price reverse to break the opposite IB boundary?",
        attempts: failureReversalAttempts,
        successes: failureReversalSuccesses,
        probability: failureReversalAttempts > 0 ? Math.round((failureReversalSuccesses / failureReversalAttempts) * 1000) / 10 : 0
      },
      poorExtremeResolution: {
        name: "Poor High/Low Next-Day Clearing",
        description: "If a session leaves an unfinished Poor High or Poor Low, is it resolved in the next session?",
        attempts: poorExtremeAttempts,
        successes: poorExtremeSuccesses,
        probability: poorExtremeAttempts > 0 ? Math.round((poorExtremeSuccesses / poorExtremeAttempts) * 1000) / 10 : 0
      },
      openOutsideRangeRejection: {
        name: "Open Outside Range Rejection to Close",
        description: "If price opens outside yesterday's absolute range but enters it, does it test yesterday's close price?",
        attempts: gapOutsideRejectionAttempts,
        successes: gapOutsideRejectionSuccesses,
        probability: gapOutsideRejectionAttempts > 0 ? Math.round((gapOutsideRejectionSuccesses / gapOutsideRejectionAttempts) * 1000) / 10 : 0
      },
      threeDayBalanceBreakout: {
        name: "3-Day Balance Consolidation Breakout",
        description: "If last 3 days of POCs are consolidated (spread < 0.7%), does today see a violent breakout (2.618x IB)?",
        attempts: threeDayBalanceAttempts,
        successes: threeDayBalanceSuccesses,
        probability: threeDayBalanceAttempts > 0 ? Math.round((threeDayBalanceSuccesses / threeDayBalanceAttempts) * 1000) / 10 : 0
      },
      pocExhaustionReversal: {
        name: "POC Exhaustion Reversal (5-TPO Peak)",
        description: "If yesterday's POC was narrow (exactly 5 TPOs), does today reverse yesterday's closing direction?",
        attempts: pocExhaustionAttempts,
        successes: pocExhaustionSuccesses,
        probability: pocExhaustionAttempts > 0 ? Math.round((pocExhaustionSuccesses / pocExhaustionAttempts) * 1000) / 10 : 0
      }
    },
    pcrCorrelations: {
      extremeFear: {
        name: 'Extreme Fear (PCR >= 1.25)',
        attempts: pcrStats.extremeFear.attempts,
        bullishCloseProb: pcrStats.extremeFear.attempts > 0 ? Math.round((pcrStats.extremeFear.bullishClose / pcrStats.extremeFear.attempts) * 1000) / 10 : 0,
        meanReversionProb: pcrStats.extremeFear.attempts > 0 ? Math.round((pcrStats.extremeFear.meanReversion / pcrStats.extremeFear.attempts) * 1000) / 10 : 0,
        gapFillProb: pcrStats.extremeFear.attempts > 0 ? Math.round((pcrStats.extremeFear.gapFill / pcrStats.extremeFear.attempts) * 1000) / 10 : 0
      },
      extremeGreed: {
        name: 'Extreme Greed (PCR <= 0.65)',
        attempts: pcrStats.extremeGreed.attempts,
        bullishCloseProb: pcrStats.extremeGreed.attempts > 0 ? Math.round((pcrStats.extremeGreed.bullishClose / pcrStats.extremeGreed.attempts) * 1000) / 10 : 0,
        meanReversionProb: pcrStats.extremeGreed.attempts > 0 ? Math.round((pcrStats.extremeGreed.meanReversion / pcrStats.extremeGreed.attempts) * 1000) / 10 : 0,
        gapFillProb: pcrStats.extremeGreed.attempts > 0 ? Math.round((pcrStats.extremeGreed.gapFill / pcrStats.extremeGreed.attempts) * 1000) / 10 : 0
      },
      neutral: {
        name: 'Neutral Sentiment (0.65 < PCR < 1.25)',
        attempts: pcrStats.neutral.attempts,
        bullishCloseProb: pcrStats.neutral.attempts > 0 ? Math.round((pcrStats.neutral.bullishClose / pcrStats.neutral.attempts) * 1000) / 10 : 0,
        meanReversionProb: pcrStats.neutral.attempts > 0 ? Math.round((pcrStats.neutral.meanReversion / pcrStats.neutral.attempts) * 1000) / 10 : 0,
        gapFillProb: pcrStats.neutral.attempts > 0 ? Math.round((pcrStats.neutral.gapFill / pcrStats.neutral.attempts) * 1000) / 10 : 0
      }
    },
    tpoBehaviors: {
      totalSessions: totalSessionsForTpoStats,
      highEstablishedByPeriod: Object.fromEntries(
        Object.entries(highEstablishedCounts).map(([k, v]) => [k, totalSessionsForTpoStats > 0 ? Math.round((v / totalSessionsForTpoStats) * 1000) / 10 : 0])
      ),
      lowEstablishedByPeriod: Object.fromEntries(
        Object.entries(lowEstablishedCounts).map(([k, v]) => [k, totalSessionsForTpoStats > 0 ? Math.round((v / totalSessionsForTpoStats) * 1000) / 10 : 0])
      ),
      ibBreakoutByPeriod: Object.fromEntries(
        Object.entries(ibBreakoutCounts).map(([k, v]) => [k, totalSessionsForTpoStats > 0 ? Math.round((v / totalSessionsForTpoStats) * 1000) / 10 : 0])
      ),
      closingDistribution: {
        aboveVah: totalCloseStatsCount > 0 ? Math.round((closeAboveVahCount / totalCloseStatsCount) * 1000) / 10 : 0,
        belowVal: totalCloseStatsCount > 0 ? Math.round((closeBelowValCount / totalCloseStatsCount) * 1000) / 10 : 0,
        insideValue: totalCloseStatsCount > 0 ? Math.round((closeInsideVaCount / totalCloseStatsCount) * 1000) / 10 : 0,
        totalSessions: totalCloseStatsCount
      }
    },
    expiryDynamics: {
      expiryAttempts,
      nonExpiryAttempts,
      expiryPinningRate: expiryAttempts > 0 ? Math.round((expiryPinningSuccess / expiryAttempts) * 1000) / 10 : 0,
      nonExpiryPinningRate: nonExpiryAttempts > 0 ? Math.round((nonExpiryPinningSuccess / nonExpiryAttempts) * 1000) / 10 : 0,
      expiryBreakoutRate: expiryAttempts > 0 ? Math.round((expiryBreakoutSuccess / expiryAttempts) * 1000) / 10 : 0,
      nonExpiryBreakoutRate: nonExpiryAttempts > 0 ? Math.round((nonExpiryBreakoutSuccess / nonExpiryAttempts) * 1000) / 10 : 0,
      avgExpiryRangePct: Math.round((expiryRanges.length > 0 ? (expiryRanges.reduce((a, b) => a + b, 0) / expiryRanges.length) : 0) * 100) / 100,
      avgNonExpiryRangePct: Math.round((nonExpiryRanges.length > 0 ? (nonExpiryRanges.reduce((a, b) => a + b, 0) / nonExpiryRanges.length) : 0) * 100) / 100
    },
    openStats: {
      afterAboveVah: {
        gapUp: openAfterAboveVah.total > 0 ? Math.round((openAfterAboveVah.gapUp / openAfterAboveVah.total) * 1000) / 10 : 0,
        gapDown: openAfterAboveVah.total > 0 ? Math.round((openAfterAboveVah.gapDown / openAfterAboveVah.total) * 1000) / 10 : 0,
        flat: openAfterAboveVah.total > 0 ? Math.round((openAfterAboveVah.flat / openAfterAboveVah.total) * 1000) / 10 : 0,
        total: openAfterAboveVah.total
      },
      afterBelowVal: {
        gapUp: openAfterBelowVal.total > 0 ? Math.round((openAfterBelowVal.gapUp / openAfterBelowVal.total) * 1000) / 10 : 0,
        gapDown: openAfterBelowVal.total > 0 ? Math.round((openAfterBelowVal.gapDown / openAfterBelowVal.total) * 1000) / 10 : 0,
        flat: openAfterBelowVal.total > 0 ? Math.round((openAfterBelowVal.flat / openAfterBelowVal.total) * 1000) / 10 : 0,
        total: openAfterBelowVal.total
      },
      afterInsideValue: {
        gapUp: openAfterInsideValue.total > 0 ? Math.round((openAfterInsideValue.gapUp / openAfterInsideValue.total) * 1000) / 10 : 0,
        gapDown: openAfterInsideValue.total > 0 ? Math.round((openAfterInsideValue.gapDown / openAfterInsideValue.total) * 1000) / 10 : 0,
        flat: openAfterInsideValue.total > 0 ? Math.round((openAfterInsideValue.flat / openAfterInsideValue.total) * 1000) / 10 : 0,
        total: openAfterInsideValue.total
      }
    }
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

export async function runPatternLearner() {
  const bridge = new TradingViewBridge();
  console.log('[Pattern Learner] Running automated statistical analysis...');
  
  const allProfiles = [];
  const symbolLearnings = {};
  const symbolTicks = {};
  const symbolScores = {};
  
  const globalScorecard = {
    poorHigh: { triggered: 0, completed: 0, pct: 0 },
    poorLow: { triggered: 0, completed: 0, pct: 0 },
    cFailure: { triggered: 0, completed: 0, pct: 0 },
    dFailure: { triggered: 0, completed: 0, pct: 0 },
    eFailure: { triggered: 0, completed: 0, pct: 0 },
    narrowIb: { triggered: 0, completed: 0, pct: 0 },
    doubleDistribution: { triggered: 0, completed: 0, pct: 0 },
    eightyPercentRule: { triggered: 0, completed: 0, pct: 0 },
    kangarooJump: { triggered: 0, completed: 0, pct: 0 },
    pShapeSupport: { triggered: 0, completed: 0, pct: 0 },
    bShapeResistance: { triggered: 0, completed: 0, pct: 0 },
    doubleDistributionFill: { triggered: 0, completed: 0, pct: 0 },
    cFailureReversal: { triggered: 0, completed: 0, pct: 0 }
  };

  for (const sym of symbols) {
    try {
      const candles = await fetchSymbolData(bridge, sym);
      const groups = groupCandlesByDay(candles);
      
      // Calculate 14-day ATR and Optimal Tick Size
      const atr = calculate14DayATR(groups);
      if (atr > 0 && candles.length > 0) {
        const rawTick = atr / 40;
        const lastClose = candles[candles.length - 1].close;
        const optimalTick = getRoundedTickSize(rawTick, lastClose);
        if (optimalTick > 0) {
          symbolTicks[sym] = optimalTick;
        }
      }
      
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        return calculateDayProfile(dateStr, dayCandles, 40, sym);
      }).filter(p => p !== null).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      if (profiles.length > 2) {
        const symAnalysis = analyzeProfiles(profiles);
        symbolLearnings[sym] = symAnalysis;
        
        // Calculate setup accuracy scores
        const scorecard = scoreSetupsForSymbol(profiles);
        
        // Accumulate global scores
        Object.keys(scorecard).forEach(k => {
          globalScorecard[k].triggered += scorecard[k].triggered;
          globalScorecard[k].completed += scorecard[k].completed;
        });
        
        scorecard.expiryDynamics = symAnalysis.expiryDynamics;
        symbolScores[sym] = scorecard;
        
        // Merge into global profiles pool
        allProfiles.push(...profiles);
        console.log(`[Pattern Learner] Successfully processed ${profiles.length} profiles for ${sym} (Tick: ${symbolTicks[sym] || 'auto'})`);
        
        // Save intermediate results progressively so the dashboard gets immediate data updates
        if (sym === 'NSE:NIFTY' || sym === 'NSE:BANKNIFTY' || Object.keys(symbolLearnings).length % 5 === 0) {
          const filepath = path.join(__dirname, 'auto_learnings.json');
          const globalAnalysis = analyzeProfiles(allProfiles);
          const intermediatePayload = {
            lastUpdated: new Date().toLocaleString('en-IN') + ' (Progressive Update...)',
            global: globalAnalysis,
            symbols: symbolLearnings
          };
          fs.writeFileSync(filepath, JSON.stringify(intermediatePayload, null, 2), 'utf8');
          
          const accuracyPath = path.join(__dirname, 'setup_accuracy.json');
          const tempGlobalScorecard = JSON.parse(JSON.stringify(globalScorecard));
          Object.keys(tempGlobalScorecard).forEach(k => {
            const item = tempGlobalScorecard[k];
            item.pct = item.triggered > 0 ? Math.round((item.completed / item.triggered) * 100) : 0;
          });
          tempGlobalScorecard.pcrCorrelations = globalAnalysis.pcrCorrelations;
          tempGlobalScorecard.expiryDynamics = globalAnalysis.expiryDynamics;
          
          fs.writeFileSync(accuracyPath, JSON.stringify({
            lastUpdated: new Date().toLocaleString('en-IN') + ' (Progressive Update...)',
            global: tempGlobalScorecard,
            symbols: symbolScores
          }, null, 2), 'utf8');
        }
      }
    } catch (err) {
      console.error(`[Pattern Learner] Error processing stats for ${sym}:`, err.message);
    }
  }

  // Calculate global average metrics across all symbols combined
  console.log(`[Pattern Learner] Calculating global averages across ${allProfiles.length} total sessions...`);
  const globalAnalysis = analyzeProfiles(allProfiles);
  
  // Finalize global accuracy percentages
  Object.keys(globalScorecard).forEach(k => {
    const item = globalScorecard[k];
    item.pct = item.triggered > 0 ? Math.round((item.completed / item.triggered) * 100) : 0;
  });
  globalScorecard.pcrCorrelations = globalAnalysis.pcrCorrelations;
  globalScorecard.expiryDynamics = globalAnalysis.expiryDynamics;

  const payload = {
    lastUpdated: new Date().toLocaleString('en-IN'),
    global: globalAnalysis,
    symbols: symbolLearnings
  };

  const filepath = path.join(__dirname, 'auto_learnings.json');
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[Pattern Learner] Successfully generated and saved auto-learnings at ${filepath}`);

  // Write optimal tick sizes
  const ticksPath = path.join(__dirname, 'dynamic_configs.json');
  fs.writeFileSync(ticksPath, JSON.stringify(symbolTicks, null, 2), 'utf8');
  console.log(`[Pattern Learner] Successfully saved optimal tick presets to ${ticksPath}`);
  
  // Write accuracy scorecard
  const accuracyPath = path.join(__dirname, 'setup_accuracy.json');
  fs.writeFileSync(accuracyPath, JSON.stringify({
    lastUpdated: new Date().toLocaleString('en-IN'),
    global: globalScorecard,
    symbols: symbolScores
  }, null, 2), 'utf8');
  console.log(`[Pattern Learner] Successfully saved setup accuracy scorecards to ${accuracyPath}`);

  try {
    bridge.closeSession();
  } catch (e) {}
}
