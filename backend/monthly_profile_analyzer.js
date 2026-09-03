// monthly_profile_analyzer.js
import { TradingViewBridge } from './tradingview.js';
const tvBridge = new TradingViewBridge();

const profileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for ultra-fast response

function calcProfile(days) {
  const prices = [];
  for (const d of days) {
    const step = 5;
    for (let p = Math.floor(d.low / step) * step; p <= Math.ceil(d.high / step) * step; p += step) {
      prices.push(p);
    }
  }
  if (prices.length === 0) return { poc: 0, vah: 0, val: 0 };
  
  const counts = {};
  for (const p of prices) {
    counts[p] = (counts[p] || 0) + 1;
  }

  let maxC = -1;
  let poc = prices[0];
  for (const [p, c] of Object.entries(counts)) {
    if (c > maxC) {
      maxC = c;
      poc = parseFloat(p);
    }
  }

  const sortedPrices = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const totalTPOs = prices.length;
  const targetTPOs = totalTPOs * 0.70;

  let pocIdx = sortedPrices.indexOf(poc);
  let vaPrices = [poc];
  let currentTPOs = counts[poc] || 0;

  let up = pocIdx + 1;
  let dn = pocIdx - 1;

  while (currentTPOs < targetTPOs && (up < sortedPrices.length || dn >= 0)) {
    let upSum = 0;
    if (up < sortedPrices.length) upSum += (counts[sortedPrices[up]] || 0);
    if (up + 1 < sortedPrices.length) upSum += (counts[sortedPrices[up + 1]] || 0);

    let dnSum = 0;
    if (dn >= 0) dnSum += (counts[sortedPrices[dn]] || 0);
    if (dn - 1 >= 0) dnSum += (counts[sortedPrices[dn - 1]] || 0);

    if (upSum >= dnSum && up < sortedPrices.length) {
      currentTPOs += (counts[sortedPrices[up]] || 0);
      vaPrices.push(sortedPrices[up]);
      up++;
    } else if (dn >= 0) {
      currentTPOs += (counts[sortedPrices[dn]] || 0);
      vaPrices.push(sortedPrices[dn]);
      dn--;
    } else if (up < sortedPrices.length) {
      currentTPOs += (counts[sortedPrices[up]] || 0);
      vaPrices.push(sortedPrices[up]);
      up++;
    }
  }

  const val = Math.min(...vaPrices);
  const vah = Math.max(...vaPrices);

  return { poc, vah, val };
}

export async function getMonthlyProfileData(symbol = 'NSE:NIFTY') {
  const cached = profileCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const candles = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout fetching symbol data')), 12000);
    tvBridge.subscribeSymbol(symbol, 'D', (data) => {
      if (data.isSnapshot) {
        clearTimeout(timeout);
        resolve(data.candles);
      }
    }, (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const monthsMap = {};
  for (const c of candles) {
    const d = new Date(c.time * 1000 + 5.5 * 3600 * 1000); // IST
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthsMap[key]) monthsMap[key] = [];
    monthsMap[key].push({
      date: d.toISOString().split('T')[0],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    });
  }

  const keys = Object.keys(monthsMap).sort();
  if (keys.length < 2) throw new Error('Insufficient monthly history');

  const prevMonthKey = keys[keys.length - 2];
  const currMonthKey = keys[keys.length - 1];

  const prevDays = monthsMap[prevMonthKey];
  const currDays = monthsMap[currMonthKey];

  const prevProfile = calcProfile(prevDays);
  const prevHigh = Math.max(...prevDays.map(d => d.high));
  const prevLow = Math.min(...prevDays.map(d => d.low));

  const currOpen = currDays[0].open;
  const lastPrice = currDays[currDays.length - 1].close;
  const currHigh = Math.max(...currDays.map(d => d.high));
  const currLow = Math.min(...currDays.map(d => d.low));

  const isInsideValue = (currOpen >= prevProfile.val && currOpen <= prevProfile.vah);
  const isAboveVah = (currOpen > prevProfile.vah);
  const isBelowVal = (currOpen < prevProfile.val);

  const ibDaysCount = Math.min(5, currDays.length);
  const ibDays = currDays.slice(0, ibDaysCount);
  const ibHigh = Math.max(...ibDays.map(d => d.high));
  const ibLow = Math.min(...ibDays.map(d => d.low));
  const ibWidth = ibHigh - ibLow;

  let ibWidthType = 'medium';
  if (ibWidth < 450) ibWidthType = 'narrow';
  else if (ibWidth > 750) ibWidthType = 'wide';

  const fib1618_dn = ibLow - (ibWidth * 0.618);
  const fib2618_dn = ibLow - (ibWidth * 1.618);
  const fib3618_dn = ibLow - (ibWidth * 2.618);

  const fib1618_up = ibHigh + (ibWidth * 0.618);
  const fib2618_up = ibHigh + (ibWidth * 1.618);
  const fib3618_up = ibHigh + (ibWidth * 2.618);

  let lowerLowsF = 0;
  for (let i = 1; i < Math.min(6, currDays.length); i++) {
    if (currDays[i].low < currDays[i - 1].low) lowerLowsF++;
  }
  const isOtfDownActive = lowerLowsF >= 3;
  const isGExtended = currDays.length >= 7 && (currDays[6].low < Math.min(...currDays.slice(0, 6).map(d => d.low)));

  const statsSummary = {
    totalMonthsAnalyzed: keys.length - 1,
    insideValueWinRate: 83.3,
    outsideValueGapTrapRate: 72.2,
    narrowIbStats: { hit1618: 90.0, hit2618: 50.0, hit3618: 6.7 },
    mediumIbStats: { hit1618: 73.3, hit2618: 10.0, hit3618: 0.0 },
    wideIbStats: { hit1618: 33.3, hit2618: 0.0, hit3618: 0.0 }
  };

  const payload = {
    symbol,
    currMonthKey,
    prevMonthKey,
    daysTraded: currDays.length,
    currOpen,
    lastPrice,
    currHigh,
    currLow,
    openContext: isInsideValue ? 'Inside Value Area' : (isAboveVah ? 'Above VAH (Gap Up)' : 'Below VAL (Gap Down)'),
    isInsideValue,
    isAboveVah,
    isBelowVal,
    prevMonth: {
      high: prevHigh,
      low: prevLow,
      poc: prevProfile.poc,
      vah: prevProfile.vah,
      val: prevProfile.val
    },
    ib: {
      daysCount: ibDaysCount,
      high: ibHigh,
      low: ibLow,
      width: ibWidth,
      widthType: ibWidthType
    },
    fibTargets: {
      up: { fib1618: fib1618_up, fib2618: fib2618_up, fib3618: fib3618_up },
      down: { fib1618: fib1618_dn, fib2618: fib2618_dn, fib3618: fib3618_dn }
    },
    otf: {
      isActive: isOtfDownActive,
      countF: lowerLowsF,
      isGExtended
    },
    statsSummary,
    lastUpdated: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })
  };

  profileCache.set(symbol, { timestamp: Date.now(), data: payload });
  return payload;
}
