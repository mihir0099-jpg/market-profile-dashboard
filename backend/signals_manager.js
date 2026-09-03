import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const signalsPath = path.join(__dirname, 'signals.json');
const paramsPath = path.join(__dirname, 'learned_params.json');

// Global memory state for Index Confluence tracking (cross-symbol sharing)
const indexState = {
  niftyOpen: null,
  niftyClose: null,
  niftyIsBearish: false,
  niftyHasBrokenIB: false,
  niftyPcrDrift: 0,
  bankniftyOpen: null,
  bankniftyClose: null,
  bankniftyIsBearish: false,
  bankniftyHasBrokenIB: false,
  bankniftyPcrDrift: 0
};

// Load parameters dynamically
function loadParams() {
  if (fs.existsSync(paramsPath)) {
    try {
      return JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
    } catch (e) {
      console.error('[Signals Manager] Error parsing learned_params.json:', e.message);
    }
  }
  return {
    btst: { closeStrengthThreshold: 0.85, exitRule: "OPEN" },
    trap: { targetType: "MIDPOINT", balancePeriodDays: 4 },
    magnet: { magnetBufferPercent: 0.004, stopLossBufferPercent: 0.003 },
    drive: { requireGap: true, rrRatio: 3.0 },
    gperiod: { maxIbWidthPct: 0.025 },
    sweep: { rejectionMultiplier: 1.5 }
  };
}

export async function updateIndexPcrDrift() {
  try {
    // Fetch Nifty PCR
    const niftyRes = await fetch('http://127.0.0.1:5000/api/pcr?symbol=NIFTY');
    if (niftyRes.ok) {
      const data = await niftyRes.json();
      const hist = data.history || [];
      if (hist.length >= 2) {
        const p915 = hist.find(h => h.time.startsWith('09:15') || h.time.startsWith('09:20') || h.time.startsWith('09:30'));
        const p1015 = hist.find(h => h.time.startsWith('10:15') || h.time.startsWith('10:20') || h.time.startsWith('10:30'));
        if (p915 && p1015) {
          indexState.niftyPcrDrift = p1015.oi_pcr - p915.oi_pcr;
        } else {
          indexState.niftyPcrDrift = hist[hist.length - 1].oi_pcr - hist[0].oi_pcr;
        }
      }
    }
    // Fetch Bank Nifty PCR
    const bnRes = await fetch('http://127.0.0.1:5000/api/pcr?symbol=BANKNIFTY');
    if (bnRes.ok) {
      const data = await bnRes.json();
      const hist = data.history || [];
      if (hist.length >= 2) {
        const p915 = hist.find(h => h.time.startsWith('09:15') || h.time.startsWith('09:20') || h.time.startsWith('09:30'));
        const p1015 = hist.find(h => h.time.startsWith('10:15') || h.time.startsWith('10:20') || h.time.startsWith('10:30'));
        if (p915 && p1015) {
          indexState.bankniftyPcrDrift = p1015.oi_pcr - p915.oi_pcr;
        } else {
          indexState.bankniftyPcrDrift = hist[hist.length - 1].oi_pcr - hist[0].oi_pcr;
        }
      }
    }
    console.log(`[Index PCR Drift] Nifty: ${indexState.niftyPcrDrift.toFixed(3)} | Bank Nifty: ${indexState.bankniftyPcrDrift.toFixed(3)}`);
  } catch (e) {
    console.error('[Index PCR Drift] Error updating:', e.message);
  }
}

// Helper functions for Weekly and Monthly Macro Reversions
function getIstDate(timeSecs) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(timeSecs * 1000 + istOffset);
}

function getWeeklyKey(candle) {
  const d = getIstDate(candle.time);
  
  // Find the next Tuesday on or after this date (Tuesday is the expiry day)
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
  const daysToTuesday = (2 - day + 7) % 7;
  
  const nextTuesday = new Date(d.getTime() + daysToTuesday * 24 * 60 * 60 * 1000);
  const y = nextTuesday.getUTCFullYear();
  
  // Calculate calendar week number of that Tuesday
  const tempDate = new Date(Date.UTC(nextTuesday.getUTCFullYear(), nextTuesday.getUTCMonth(), nextTuesday.getUTCDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
  
  return `${y}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthlyKey(candle) {
  const d = getIstDate(candle.time);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function calculateTpoProfile(candles, symbol) {
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  for (const c of candles) {
    if (c.high > dayHigh) dayHigh = c.high;
    if (c.low < dayLow) dayLow = c.low;
  }
  if (dayHigh === -Infinity || dayLow === Infinity) return null;

  const lastPrice = candles[candles.length - 1].close;
  let tickSize = 1;
  const cleanSym = symbol.replace("NSE:", "").replace("BSE:", "").replace("_S", "").toUpperCase();
  if (cleanSym === 'NIFTY') tickSize = 2;
  else if (cleanSym === 'BANKNIFTY') tickSize = 5;
  else {
    tickSize = lastPrice > 2000 ? 10 : lastPrice > 1000 ? 5 : lastPrice > 500 ? 2 : 1;
  }

  const prices = {};
  for (const c of candles) {
    const startTick = Math.floor(c.low / tickSize) * tickSize;
    const endTick = Math.floor(c.high / tickSize) * tickSize;
    for (let p = startTick; p <= endTick; p += tickSize) {
      prices[p] = (prices[p] || 0) + 1;
    }
  }

  const sortedPrices = Object.keys(prices).map(Number).sort((a,b)=>a-b);
  if (sortedPrices.length === 0) return null;

  let maxTpos = 0;
  let pocPrice = 0;
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


// Load signals database
function loadSignals() {
  if (fs.existsSync(signalsPath)) {
    try {
      return JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
    } catch (e) {
      console.error('[Signals Manager] Error parsing signals.json, resetting database:', e.message);
    }
  }
  return [];
}

// Save signals database
function saveSignals(signals) {
  try {
    const params = loadParams();
    
    // Read the existing file first to verify which signals are already in the database
    let existingFileSignals = [];
    if (fs.existsSync(signalsPath)) {
      try {
        existingFileSignals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
      } catch (e) {
        existingFileSignals = [];
      }
    }

    // 1. Filter out low-expectancy new signals and index-dragged breakouts before enriching/pruning
    const filtered = signals.filter(sig => {
      // Only filter brand new signals that are ACTIVE and not already in the file database
      if (sig.status === 'ACTIVE') {
        const alreadyExists = existingFileSignals.some(es => es.id === sig.id);
        if (!alreadyExists) {
          const key = `${sig.symbol}|${sig.strategy}`;

          // Safety Check A: Index Drag Block Filter (Rule 10A)
          const isBreakout = sig.strategy.includes('Breakout') || sig.strategy.includes('Trap');
          const isLong = sig.direction === 'LONG' || sig.direction === 'BUY';
          if (isBreakout && isLong && !sig.symbol.includes('NIFTY') && !sig.symbol.includes('BANKNIFTY')) {
            if (indexState.niftyIsBearish || indexState.bankniftyIsBearish || indexState.niftyPcrDrift < -0.03 || indexState.bankniftyPcrDrift < -0.03) {
              console.log(`[Signals Block Filter] BLOCKING new breakout LONG signal due to Index Drag: ${sig.symbol} | ${sig.strategy}`);
              return false;
            }
          }

          // Safety Check B: Cumulative Win Rate Block Filter
          if (params.winningSetups && params.winningSetups[key]) {
            const setup = params.winningSetups[key];
            const total = (setup.winCount || 0) + (setup.lossCount || 0);
            if (total >= 5) {
              const winRate = setup.winCount / total;
              if (winRate < 0.40) {
                console.log(`[Signals Block Filter] BLOCKING low-expectancy setup: ${key} (Win Rate: ${(winRate*100).toFixed(1)}% over ${total} trades)`);
                return false;
              }
            }
          }
        }
      }
      return true;
    });

    const enriched = filtered.map(sig => {
      const key = `${sig.symbol}|${sig.strategy}`;
      if (params.winningSetups && params.winningSetups[key]) {
        const w = params.winningSetups[key];
        sig.winCount = w.winCount || 0;
        sig.totalPnl = w.totalPnl || 0;
      } else {
        sig.winCount = sig.winCount || 0;
        sig.totalPnl = sig.totalPnl || 0;
      }

      // Add live Index Drag warning calculation if not set yet for stock signals
      if (sig.status === 'ACTIVE' && sig.indexDrag === undefined && !sig.symbol.includes('NIFTY') && !sig.symbol.includes('BANKNIFTY')) {
        let indexDrag = 'none';
        const isLongType = sig.direction === 'BUY' || sig.direction === 'LONG';
        if (isLongType) {
          if (indexState.niftyIsBearish || indexState.bankniftyIsBearish || indexState.niftyPcrDrift < -0.03 || indexState.bankniftyPcrDrift < -0.03) {
            indexDrag = 'bearish';
          }
        } else {
          if (!indexState.niftyIsBearish || !indexState.bankniftyIsBearish || indexState.niftyPcrDrift > 0.03 || indexState.bankniftyPcrDrift > 0.03) {
            indexDrag = 'bullish';
          }
        }
        sig.indexDrag = indexDrag;
      }

      return sig;
    });

    // Keep only the latest 1000 entries to prevent files growing too large
    const pruned = enriched.slice(-1000);
    fs.writeFileSync(signalsPath, JSON.stringify(pruned, null, 2), 'utf8');
  } catch (e) {
    console.error('[Signals Manager] Error saving signals.json:', e.message);
  }
}


export function processSignalsForSymbol(symbol, candles, profiles) {
  // Guard: Only allow signal generation once the active trading session starts (strictly >= 9:15 AM IST)
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();
  const minutesSinceMidnight = hour * 60 + minute;

  // Let the tracker run at any time to allow resolution of existing active signals after-hours.

  if (!candles || candles.length < 5 || !profiles || profiles.length < 3) return;


  const params = loadParams();
  const signals = loadSignals();

  // Group candles by date to extract today and yesterday
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
  const todayStr = dates[dates.length - 1];
  const yesterdayStr = dates.length >= 2 ? dates[dates.length - 2] : null;

  const todayCandles = groups[todayStr].sort((a, b) => a.time - b.time);
  const activeProfile = profiles.find(p => p.dateStr === todayStr);
  const yesterdayProfile = yesterdayStr ? profiles.find(p => p.dateStr === yesterdayStr) : null;

  if (!activeProfile || !yesterdayProfile) return;

  const todayOpen = todayCandles[0].open;
  const todayClose = todayCandles[todayCandles.length - 1].close;
  const todayHigh = Math.max(...todayCandles.map(c => c.high));
  const todayLow = Math.min(...todayCandles.map(c => c.low));
  const latestCandle = todayCandles[todayCandles.length - 1];

  // Populate Index Confluence state
  if (symbol === 'NSE:NIFTY') {
    indexState.niftyOpen = todayOpen;
    indexState.niftyClose = todayClose;
    indexState.niftyIsBearish = todayClose < todayOpen;
    if (todayCandles.length >= 2) {
      const ibHigh = Math.max(todayCandles[0].high, todayCandles[1].high);
      const ibLow = Math.min(todayCandles[0].low, todayCandles[1].low);
      indexState.niftyHasBrokenIB = todayHigh > ibHigh || todayLow < ibLow;
    }
  } else if (symbol === 'NSE:BANKNIFTY') {
    indexState.bankniftyOpen = todayOpen;
    indexState.bankniftyClose = todayClose;
    indexState.bankniftyIsBearish = todayClose < todayOpen;
    if (todayCandles.length >= 2) {
      const ibHigh = Math.max(todayCandles[0].high, todayCandles[1].high);
      const ibLow = Math.min(todayCandles[0].low, todayCandles[1].low);
      indexState.bankniftyHasBrokenIB = todayHigh > ibHigh || todayLow < ibLow;
    }
  }

  let updated = false;

  // ─── PART 1: TRACKING EXISTING ACTIVE SIGNALS ───
  signals.forEach(t => {
    if (t.symbol !== symbol || t.status !== 'ACTIVE') return;

    if (t.currentPrice !== todayClose) {
      t.currentPrice = todayClose;
      updated = true;
    }

    if (t.strategy === '3:15 PM BTST Close') {
      // Exit exactly at the next day's opening print
      if (todayStr !== t.createdDate) {
        const exitPrice = todayOpen;
        t.status = (t.direction === 'BUY' ? (exitPrice > t.entry) : (exitPrice < t.entry)) ? 'TARGET_HIT' : 'STOP_LOSS_HIT';
        t.exitPrice = exitPrice;
        t.pnlPoints = t.direction === 'BUY' ? (exitPrice - t.entry) : (t.entry - exitPrice);
        t.resolvedDate = todayStr;
        updated = true;
        console.log(`[Signals Tracker] BTST signal resolved for ${symbol}: ${t.status} (exit: ${exitPrice})`);
      }
    } else {
      // Intraday / Swing checking candle-by-candle
      let hitTarget = false;
      let hitSL = false;
      let exitPrice = 0;

      for (const c of todayCandles) {
        if (t.direction === 'BUY' || t.direction === 'LONG') {
          if (c.high >= t.target) {
            hitTarget = true;
            exitPrice = t.target;
            break;
          }
          if (c.low <= t.sl) {
            hitSL = true;
            exitPrice = t.sl;
            break;
          }
        } else {
          if (c.low <= t.target) {
            hitTarget = true;
            exitPrice = t.target;
            break;
          }
          if (c.high >= t.sl) {
            hitSL = true;
            exitPrice = t.sl;
            break;
          }
        }
      }

      if (hitTarget) {
        t.status = 'TARGET_HIT';
        t.exitPrice = exitPrice;
        t.pnlPoints = t.direction === 'BUY' ? (exitPrice - t.entry) : (t.entry - exitPrice);
        t.resolvedDate = todayStr;
        updated = true;
      } else if (hitSL) {
        t.status = 'STOP_LOSS_HIT';
        t.exitPrice = exitPrice;
        t.pnlPoints = t.direction === 'BUY' ? (exitPrice - t.entry) : (t.entry - exitPrice);
        t.resolvedDate = todayStr;
        updated = true;
      } else if (t.type === 'INTRADAY' && todayCandles.length >= 13) {
        // Auto-squareoff at close for intraday signals
        t.status = 'EXPIRED';
        t.exitPrice = todayClose;
        t.pnlPoints = t.direction === 'BUY' ? (todayClose - t.entry) : (t.entry - todayClose);
        t.resolvedDate = todayStr;
        updated = true;
      }
    }
  });

  // Guard: Only allow new signal generation during market hours (strictly 9:15 AM to 3:25 PM IST)
  const isMarketHours = minutesSinceMidnight >= 555 && minutesSinceMidnight <= 925;
  if (!isMarketHours) {
    if (updated) {
      saveSignals(signals);
    }
    return;
  }

  // ─── PART 2: GENERATING NEW SIGNALS ───
  
  // A. Balance Breakout Traps (Swing Trade)
  const balanceDays = params.trap.balancePeriodDays;
  if (profiles.length >= balanceDays + 1) {
    const priorProfiles = profiles.slice(-(balanceDays + 1), -1);
    const balanceHigh = Math.max(...priorProfiles.map(p => p.dayHigh));
    const balanceLow = Math.min(...priorProfiles.map(p => p.dayLow));
    const balanceMid = (balanceHigh + balanceLow) / 2;

    const brokeHigh = todayHigh > balanceHigh;
    const brokeLow = todayLow < balanceLow;

    let trapDirection = null;
    let trapEntry = todayClose;
    let trapSL = 0;
    let trapTarget = balanceMid;

    if (brokeHigh && todayClose < balanceHigh && todayClose > balanceLow) {
      trapDirection = 'SHORT';
      trapSL = todayHigh;
    } else if (brokeLow && todayClose > balanceLow && todayClose < balanceHigh) {
      trapDirection = 'LONG';
      trapSL = todayLow;
    }

    if (trapDirection) {
      const targetTimestamp = new Date(todayCandles[todayCandles.length - 1].time * 1000).toISOString();
      const activeTrapExists = signals.some(s => s.symbol === symbol && s.strategy === 'Balance Breakout Trap' && s.timestamp === targetTimestamp);
      if (!activeTrapExists) {
        signals.push({
          id: `trap-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'Balance Breakout Trap',
          type: 'SWING',
          direction: trapDirection,
          entry: trapEntry,
          sl: trapSL,
          target: trapTarget,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[todayCandles.length - 1].time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Balance Trap signal generated for ${symbol}: ${trapDirection}`);
      }
    }
  }

  // B. Auction Magnets (Intraday)
  const bins = yesterdayProfile.bins;
  if (bins && bins.length > 3) {
    const topPoor = bins[0].tpos.length >= 2;
    const bottomPoor = bins[bins.length - 1].tpos.length >= 2;

    if (topPoor && todayOpen < yesterdayProfile.dayHigh) {
      const gap = (yesterdayProfile.dayHigh - todayOpen) / todayOpen;
      if (gap <= params.magnet.magnetBufferPercent) {
        const targetTimestamp = new Date(todayCandles[0].time * 1000).toISOString();
        const activeMagnetExists = signals.some(s => s.symbol === symbol && s.strategy === 'Auction Magnet' && s.timestamp === targetTimestamp);
        if (!activeMagnetExists) {
          const entry = todayOpen;
          const target = yesterdayProfile.dayHigh;
          const sl = entry * (1 - params.magnet.stopLossBufferPercent);
          signals.push({
            id: `magnet-high-${symbol}-${todayStr}-${Date.now()}`,
            symbol,
            strategy: 'Auction Magnet',
            type: 'INTRADAY',
            direction: 'BUY',
            entry,
            sl,
            target,
            status: 'ACTIVE',
            createdDate: todayStr,
            timestamp: new Date(todayCandles[0].time * 1000).toISOString()
          });
          updated = true;
          console.log(`[Signals Tracker] New Poor High Magnet signal generated for ${symbol}`);
        }
      }
    }

    if (bottomPoor && todayOpen > yesterdayProfile.dayLow) {
      const gap = (todayOpen - yesterdayProfile.dayLow) / todayOpen;
      if (gap <= params.magnet.magnetBufferPercent) {
        const targetTimestamp = new Date(todayCandles[0].time * 1000).toISOString();
        const activeMagnetExists = signals.some(s => s.symbol === symbol && s.strategy === 'Auction Magnet' && s.timestamp === targetTimestamp);
        if (!activeMagnetExists) {
          const entry = todayOpen;
          const target = yesterdayProfile.dayLow;
          const sl = entry * (1 + params.magnet.stopLossBufferPercent);
          signals.push({
            id: `magnet-low-${symbol}-${todayStr}-${Date.now()}`,
            symbol,
            strategy: 'Auction Magnet',
            type: 'INTRADAY',
            direction: 'SHORT',
            entry,
            sl,
            target,
            status: 'ACTIVE',
            createdDate: todayStr,
            timestamp: new Date(todayCandles[0].time * 1000).toISOString()
          });
          updated = true;
          console.log(`[Signals Tracker] New Poor Low Magnet signal generated for ${symbol}`);
        }
      }
    }
  }

  // C. Opening Drive Conviction (Intraday)
  const periodA = todayCandles[0];
  if (periodA && todayCandles.length >= 1) {
    const isGapUp = todayOpen > yesterdayProfile.dayHigh;
    const isGapDown = todayOpen < yesterdayProfile.dayLow;
    
    // Check if we require pre-market gaps
    const gapFilter = params.drive.requireGap;
    const isBullishOD = (!gapFilter || isGapUp) && periodA.close > yesterdayProfile.vahPrice && periodA.low >= periodA.open;
    const isBearishOD = (!gapFilter || isGapDown) && periodA.close < yesterdayProfile.valPrice && periodA.high <= periodA.open;

    if (isBullishOD) {
      const targetTimestamp = new Date(todayCandles[0].time * 1000).toISOString();
      const activeDriveExists = signals.some(s => s.symbol === symbol && s.strategy === 'Opening Drive' && s.timestamp === targetTimestamp);
      if (!activeDriveExists) {
        const entry = periodA.close;
        const sl = periodA.low;
        const risk = entry - sl;
        const target = entry + params.drive.rrRatio * risk;
        signals.push({
          id: `drive-bull-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'Opening Drive',
          type: 'INTRADAY',
          direction: 'BUY',
          entry,
          sl,
          target,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[0].time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Bullish Opening Drive signal for ${symbol}`);
      }
    } else if (isBearishOD) {
      const targetTimestamp = new Date(todayCandles[0].time * 1000).toISOString();
      const activeDriveExists = signals.some(s => s.symbol === symbol && s.strategy === 'Opening Drive' && s.timestamp === targetTimestamp);
      if (!activeDriveExists) {
        const entry = periodA.close;
        const sl = periodA.high;
        const risk = sl - entry;
        const target = entry - params.drive.rrRatio * risk;
        signals.push({
          id: `drive-bear-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'Opening Drive',
          type: 'INTRADAY',
          direction: 'SHORT',
          entry,
          sl,
          target,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[0].time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Bearish Opening Drive signal for ${symbol}`);
      }
    }
  }

  // D. 3:15 PM BTST Close-Positioning
  // Only trigger at the end of the day (near 3:00 PM / 3:15 PM candle)
  if (todayCandles.length >= 12) {
    const range = todayHigh - todayLow;
    const closeStrength = range > 0 ? (todayClose - todayLow) / range : 0.5;

    const isBuyBtst = todayClose > yesterdayProfile.vahPrice && closeStrength >= params.btst.closeStrengthThreshold;
    const isSellBtst = todayClose < yesterdayProfile.valPrice && closeStrength <= (1 - params.btst.closeStrengthThreshold);

    if (isBuyBtst) {
      const targetTimestamp = new Date(todayCandles[11].time * 1000).toISOString();
      const activeBtstExists = signals.some(s => s.symbol === symbol && s.strategy === '3:15 PM BTST Close' && s.timestamp === targetTimestamp);
      if (!activeBtstExists) {
        const entry = todayClose;
        const sl = entry * 0.992; // -0.8%
        const target = entry * 1.024; // +2.4% (1:3 RR)
        signals.push({
          id: `btst-buy-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: '3:15 PM BTST Close',
          type: 'BTST',
          direction: 'BUY',
          entry,
          sl,
          target,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[11].time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Bullish BTST signal generated for ${symbol}`);
      }
    } else if (isSellBtst) {
      const targetTimestamp = new Date(todayCandles[11].time * 1000).toISOString();
      const activeBtstExists = signals.some(s => s.symbol === symbol && s.strategy === '3:15 PM BTST Close' && s.timestamp === targetTimestamp);
      if (!activeBtstExists) {
        const entry = todayClose;
        const sl = entry * 1.008; // +0.8%
        const target = entry * 0.976; // -2.4% (1:3 RR)
        signals.push({
          id: `btst-sell-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: '3:15 PM BTST Close',
          type: 'BTST',
          direction: 'SHORT',
          entry,
          sl,
          target,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[11].time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Bearish BTST signal generated for ${symbol}`);
      }
    }
  }

  // E. G-Period Breakout (Period G = index 6)
  if (todayCandles.length >= 7) {
    const ibHigh = Math.max(todayCandles[0].high, todayCandles[1].high);
    const ibLow = Math.min(todayCandles[0].low, todayCandles[1].low);
    const gCandle = todayCandles[6];

    let gDirection = null;
    let gEntry = gCandle.close;
    let gSL = 0;
    let gTarget = 0;

    const dateObj = new Date((gCandle.time + 19800) * 1000);
    const isTuesday = dateObj.getUTCDay() === 2;

    if (symbol.includes('NIFTY') && !symbol.includes('BANKNIFTY')) {
      const bullishBreak = gCandle.close > ibHigh;
      const bearishBreak = gCandle.close < ibLow;

      if (bullishBreak) {
        gDirection = 'LONG';
        gTarget = gEntry + 30;
        gSL = gEntry - 15;
      } else if (bearishBreak) {
        gDirection = 'SHORT';
        gTarget = gEntry - 75;
        gSL = gEntry + 35;
      }
    } else if (symbol.includes('BANKNIFTY')) {
      const bullishBreak = gCandle.high > ibHigh;
      const bearishBreak = gCandle.low < ibLow;

      if (bullishBreak) {
        gDirection = 'LONG';
        gTarget = gEntry + 120;
        gSL = gEntry - 60;
      } else if (bearishBreak) {
        gDirection = 'SHORT';
        gTarget = gEntry - 150;
        gSL = gEntry + 75;
      }
    } else {
      // Stock Options (e.g. RELIANCE, HDFCBANK)
      const cleanSym = symbol.replace('NSE:', '');
      const bullishBreak = gCandle.close > ibHigh;
      const bearishBreak = gCandle.close < ibLow;
      const ibWidthPct = (ibHigh - ibLow) / todayOpen;

      if (bullishBreak) {
        // Filter 1: Wide Initial Balance (Neutral Day Trap)
        if (ibWidthPct > params.gperiod.maxIbWidthPct) {
          console.log(`[Signals Tracker] Blocked long G-breakout for ${symbol} because IB width is too wide (${(ibWidthPct*100).toFixed(2)}%).`);
        }
        // Filter 2: Bearish Index Confluence / PCR Drag
        else if (indexState.niftyIsBearish || indexState.bankniftyIsBearish || indexState.niftyPcrDrift < -0.03 || indexState.bankniftyPcrDrift < -0.03) {
          console.log(`[Signals Tracker] Blocked long G-breakout for ${symbol} due to bearish Index Confluence or PCR drag.`);
        }
        // Filter 3: Index IB Breakout Requirement
        else if (!indexState.niftyHasBrokenIB && !indexState.bankniftyHasBrokenIB) {
          console.log(`[Signals Tracker] Blocked long G-breakout for ${symbol} because index (Nifty/BankNifty) has not broken its Initial Balance.`);
        } else {
          gDirection = 'LONG';
          const targetAdd = cleanSym === 'RELIANCE' ? 9.2 : cleanSym === 'HDFCBANK' ? 4.5 : (gEntry * 0.007);
          gTarget = gEntry + targetAdd;
          gSL = gEntry - targetAdd;
        }
      } else if (bearishBreak) {
        // Filter 1: Wide Initial Balance (Neutral Day Trap)
        if (ibWidthPct > params.gperiod.maxIbWidthPct) {
          console.log(`[Signals Tracker] Blocked short G-breakout for ${symbol} because IB width is too wide (${(ibWidthPct*100).toFixed(2)}%).`);
        }
        // Filter 2: Bullish Index Confluence / PCR Drag
        else if (!indexState.niftyIsBearish || !indexState.bankniftyIsBearish || indexState.niftyPcrDrift > 0.03 || indexState.bankniftyPcrDrift > 0.03) {
          console.log(`[Signals Tracker] Blocked short G-breakout for ${symbol} due to bullish Index Confluence or PCR drag.`);
        }
        // Filter 3: Index IB Breakout Requirement
        else if (!indexState.niftyHasBrokenIB && !indexState.bankniftyHasBrokenIB) {
          console.log(`[Signals Tracker] Blocked short G-breakout for ${symbol} because index (Nifty/BankNifty) has not broken its Initial Balance.`);
        } else {
          gDirection = 'SHORT';
          const targetAdd = cleanSym === 'RELIANCE' ? 9.2 : cleanSym === 'HDFCBANK' ? 4.5 : (gEntry * 0.007);
          gTarget = gEntry - targetAdd;
          gSL = gEntry + targetAdd;
        }
      }
    }

    if (gDirection) {
      const targetTimestamp = new Date(todayCandles[6].time * 1000).toISOString();
      const activeGExists = signals.some(s => s.symbol === symbol && s.strategy === 'G-Period Options Breakout' && s.timestamp === targetTimestamp);
      if (!activeGExists) {
        signals.push({
          id: `gperiod-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'G-Period Options Breakout',
          type: 'INTRADAY',
          direction: gDirection,
          entry: gEntry,
          sl: gSL,
          target: gTarget,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(todayCandles[6].time * 1000).toISOString(),
          isExpiryTrade: isTuesday
        });
        updated = true;
        console.log(`[Signals Tracker] New G-Period Breakout signal for ${symbol}: ${gDirection} (isExpiry: ${isTuesday})`);
      }
    }
  }

  // F. Morning Breakout Reversal Traps (Fades)
  if (todayCandles.length >= 3 && todayCandles.length <= 6) {
    const ibHigh = Math.max(todayCandles[0].high, todayCandles[1].high);
    const ibLow = Math.min(todayCandles[0].low, todayCandles[1].low);

    const prevIdx = todayCandles.length - 2;
    const prevCandle = todayCandles[prevIdx];
    const latestCandle = todayCandles[todayCandles.length - 1];

    const brokeHigh = prevCandle.high > ibHigh && prevCandle.open <= ibHigh;
    const brokeLow = prevCandle.low < ibLow && prevCandle.open >= ibLow;

    let fadeDirection = null;
    let fadeEntry = latestCandle.open;
    let fadeSL = 0;
    let fadeTarget = 0;

    if (brokeHigh) {
      if (latestCandle.high <= prevCandle.high) {
        fadeDirection = 'SHORT';
        fadeSL = prevCandle.high;
        fadeTarget = ibLow;
      }
    } else if (brokeLow) {
      if (latestCandle.low >= prevCandle.low) {
        fadeDirection = 'LONG';
        fadeSL = prevCandle.low;
        fadeTarget = ibHigh;
      }
    }

    if (fadeDirection) {
      const targetTimestamp = new Date(latestCandle.time * 1000).toISOString();
      const activeFadeExists = signals.some(s => s.symbol === symbol && s.strategy === 'Morning Reversal Fade' && s.timestamp === targetTimestamp);
      if (!activeFadeExists) {
        signals.push({
          id: `fade-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'Morning Reversal Fade',
          type: 'INTRADAY',
          direction: fadeDirection,
          entry: fadeEntry,
          sl: fadeSL,
          target: fadeTarget,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(latestCandle.time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Morning Reversal Fade generated for ${symbol}: ${fadeDirection}`);
      }
    }
  }

  // G. Liquidity Sweep Reversals (Intraday)
  if (todayCandles.length >= 3) {
    const ibHigh = Math.max(todayCandles[0].high, todayCandles[1].high);
    const ibLow = Math.min(todayCandles[0].low, todayCandles[1].low);

    // We check the latest 30-minute TPO candle (excluding A and B)
    const latestCandle = todayCandles[todayCandles.length - 1];
    
    // Check if yesterday's profile exists
    const priorHigh = yesterdayProfile ? yesterdayProfile.dayHigh : ibHigh;
    const priorLow = yesterdayProfile ? yesterdayProfile.dayLow : ibLow;
    
    let sweepDirection = null;
    let sweepEntry = latestCandle.close;
    let sweepSL = 0;
    let sweepTarget = 0;

    const bodySize = Math.abs(latestCandle.close - latestCandle.open);
    const upperShadow = latestCandle.high - Math.max(latestCandle.open, latestCandle.close);
    const lowerShadow = Math.min(latestCandle.open, latestCandle.close) - latestCandle.low;

    // 1. Buy Side Liquidity Sweep (Sweeps below key low and rejects up -> LONG/CE)
    const sweptPriorLow = latestCandle.low < priorLow && latestCandle.close >= priorLow;
    const sweptIbLow = latestCandle.low < ibLow && latestCandle.close >= ibLow;
    const hasBullishRejection = lowerShadow >= bodySize * params.sweep.rejectionMultiplier || (latestCandle.close > latestCandle.open && bodySize > (latestCandle.high - latestCandle.low) * 0.5);

    if ((sweptPriorLow || sweptIbLow) && hasBullishRejection) {
      sweepDirection = 'LONG';
      sweepSL = latestCandle.low;
      sweepTarget = sweptPriorLow ? priorHigh : ibHigh;
    } 
    // 2. Sell Side Liquidity Sweep (Sweeps above key high and rejects down -> SHORT/PE)
    else {
      const sweptPriorHigh = latestCandle.high > priorHigh && latestCandle.close <= priorHigh;
      const sweptIbHigh = latestCandle.high > ibHigh && latestCandle.close <= ibHigh;
      const hasBearishRejection = upperShadow >= bodySize * params.sweep.rejectionMultiplier || (latestCandle.close < latestCandle.open && bodySize > (latestCandle.high - latestCandle.low) * 0.5);

      if ((sweptPriorHigh || sweptIbHigh) && hasBearishRejection) {
        sweepDirection = 'SHORT';
        sweepSL = latestCandle.high;
        sweepTarget = sweptPriorHigh ? priorLow : ibLow;
      }
    }

    if (sweepDirection) {
      const targetTimestamp = new Date(latestCandle.time * 1000).toISOString();
      const activeSweepExists = signals.some(s => s.symbol === symbol && s.strategy === 'Liquidity Sweep Reversal' && s.timestamp === targetTimestamp);
      if (!activeSweepExists) {
        signals.push({
          id: `sweep-${symbol}-${todayStr}-${Date.now()}`,
          symbol,
          strategy: 'Liquidity Sweep Reversal',
          type: 'INTRADAY',
          direction: sweepDirection,
          entry: sweepEntry,
          sl: sweepSL,
          target: sweepTarget,
          status: 'ACTIVE',
          createdDate: todayStr,
          timestamp: new Date(latestCandle.time * 1000).toISOString()
        });
        updated = true;
        console.log(`[Signals Tracker] New Liquidity Sweep Reversal generated for ${symbol}: ${sweepDirection} (swept low/high rejection)`);
      }
    }
  }

  // ─── PART 2E: WEEKLY & MONTHLY MACRO TPO REVERSIONS ───
  try {
    // Group candles by week
    const weekGroups = {};
    for (const c of candles) {
      const wKey = getWeeklyKey(c);
      if (!weekGroups[wKey]) weekGroups[wKey] = [];
      weekGroups[wKey].push(c);
    }
    const weekKeys = Object.keys(weekGroups).sort();

    if (weekKeys.length >= 2) {
      const currentWeekKey = weekKeys[weekKeys.length - 1];
      const prevWeekKey = weekKeys[weekKeys.length - 2];
      const currentWeekCandles = weekGroups[currentWeekKey];
      
      const prevWeekProfile = calculateTpoProfile(weekGroups[prevWeekKey], symbol);
      if (prevWeekProfile && currentWeekCandles.length > 0) {
        const weekOpen = currentWeekCandles[0].open;
        const weekHigh = Math.max(...currentWeekCandles.map(c => c.high));
        const weekLow = Math.min(...currentWeekCandles.map(c => c.low));
        const latestClose = currentWeekCandles[currentWeekCandles.length - 1].close;

        // 1. Weekly POC Reversion
        const isInsideValue = weekOpen >= prevWeekProfile.val && weekOpen <= prevWeekProfile.vah;
        if (isInsideValue) {
          let direction = null;
          let target = prevWeekProfile.poc;
          let sl = 0;
          let entry = weekOpen;

          if (weekOpen > prevWeekProfile.poc) {
            direction = 'SHORT';
            sl = prevWeekProfile.vah;
          } else if (weekOpen < prevWeekProfile.poc) {
            direction = 'LONG';
            sl = prevWeekProfile.val;
          }

          if (direction) {
            const targetTimestamp = new Date(currentWeekCandles[0].time * 1000).toISOString();
            const activeSigExists = signals.some(s => s.symbol === symbol && s.strategy === 'Weekly POC Reversion' && s.timestamp === targetTimestamp);
            if (!activeSigExists) {
              signals.push({
                id: `wreversion-${symbol}-${currentWeekKey}-${Date.now()}`,
                symbol,
                strategy: 'Weekly POC Reversion',
                type: 'SWING',
                direction,
                entry,
                sl,
                target,
                status: 'ACTIVE',
                createdDate: todayStr,
                timestamp: new Date(currentWeekCandles[0].time * 1000).toISOString()
              });
              updated = true;
              console.log(`[Signals Tracker] New Weekly POC Reversion generated for ${symbol}: ${direction}`);
            }
          }
        }

        // 2. Weekly Gap Fade Trap
        const isOutsideValue = weekOpen > prevWeekProfile.vah || weekOpen < prevWeekProfile.val;
        if (isOutsideValue) {
          let direction = null;
          let target = prevWeekProfile.poc;
          let sl = 0;
          let entry = latestClose;

          // Opened above VAH but pulled back below VAH
          if (weekOpen > prevWeekProfile.vah && latestClose < prevWeekProfile.vah) {
            direction = 'SHORT';
            sl = weekHigh;
          } 
          // Opened below VAL but pulled back above VAL
          else if (weekOpen < prevWeekProfile.val && latestClose > prevWeekProfile.val) {
            direction = 'LONG';
            sl = weekLow;
          }

          if (direction) {
            const targetTimestamp = new Date(currentWeekCandles[0].time * 1000).toISOString();
            const activeSigExists = signals.some(s => s.symbol === symbol && s.strategy === 'Weekly Gap Fade Trap' && s.timestamp === targetTimestamp);
            if (!activeSigExists) {
              signals.push({
                id: `wgap-${symbol}-${currentWeekKey}-${Date.now()}`,
                symbol,
                strategy: 'Weekly Gap Fade Trap',
                type: 'SWING',
                direction,
                entry,
                sl,
                target,
                status: 'ACTIVE',
                createdDate: todayStr,
                timestamp: new Date(latestCandle.time * 1000).toISOString()
              });
              updated = true;
              console.log(`[Signals Tracker] New Weekly Gap Fade Trap generated for ${symbol}: ${direction}`);
            }
          }
        }

        // 5. Weekly Initial Balance (IB) Fibonacci Breakout Strategy
        const isIndex = symbol === 'NSE:NIFTY' || symbol === 'NSE:BANKNIFTY';
        if (isIndex && currentWeekCandles.length >= 3) {
          const ibCandles = currentWeekCandles.filter(c => {
            const d = getIstDate(c.time);
            const day = d.getDay();
            return day === 3 || day === 4; // Wednesday or Thursday
          });

          const postIbCandles = currentWeekCandles.filter(c => {
            const d = getIstDate(c.time);
            const day = d.getDay();
            return day === 5 || day === 1 || day === 2; // Friday, Monday, or Tuesday
          });

          if (ibCandles.length > 0 && postIbCandles.length > 0) {
            const ibHigh = Math.max(...ibCandles.map(c => c.high));
            const ibLow = Math.min(...ibCandles.map(c => c.low));
            const ibWidth = ibHigh - ibLow;

            const latestCandle = postIbCandles[postIbCandles.length - 1];
            const latestClose = latestCandle.close;

            let direction = null;
            let entry = 0;
            let target = 0;
            let sl = 0;

            const brokeUpper = latestCandle.high > ibHigh && latestClose > ibHigh;
            const brokeLower = latestCandle.low < ibLow && latestClose < ibLow;

            if (brokeUpper) {
              direction = 'LONG';
              entry = ibHigh;
              target = ibHigh + ibWidth * 0.618;
              sl = ibHigh - ibWidth * 0.382;
            } else if (brokeLower) {
              direction = 'SHORT';
              entry = ibLow;
              target = ibLow - ibWidth * 0.618;
              sl = ibLow + ibWidth * 0.382;
            }

            if (direction) {
              const targetTimestamp = new Date(latestCandle.time * 1000).toISOString();
              const activeSigExists = signals.some(s => s.symbol === symbol && s.strategy === 'Weekly IB Breakout' && s.timestamp === targetTimestamp);
              if (!activeSigExists) {
                signals.push({
                  id: `wib-breakout-${symbol}-${currentWeekKey}-${Date.now()}`,
                  symbol,
                  strategy: 'Weekly IB Breakout',
                  type: 'SWING',
                  direction,
                  entry,
                  sl,
                  target,
                  status: 'ACTIVE',
                  createdDate: todayStr,
                  timestamp: new Date(latestCandle.time * 1000).toISOString()
                });
                updated = true;
                console.log(`[Signals Tracker] New Weekly IB Breakout generated for ${symbol}: ${direction} (Target 1.618 Fib Extension)`);
              }
            }
          }
        }
      }
    }

    // Group candles by month
    const monthGroups = {};
    for (const c of candles) {
      const mKey = getMonthlyKey(c);
      if (!monthGroups[mKey]) monthGroups[mKey] = [];
      monthGroups[mKey].push(c);
    }
    const monthKeys = Object.keys(monthGroups).sort();

    if (monthKeys.length >= 2) {
      const currentMonthKey = monthKeys[monthKeys.length - 1];
      const prevMonthKey = monthKeys[monthKeys.length - 2];
      const currentMonthCandles = monthGroups[currentMonthKey];
      
      const prevMonthProfile = calculateTpoProfile(monthGroups[prevMonthKey], symbol);
      if (prevMonthProfile && currentMonthCandles.length > 0) {
        const monthOpen = currentMonthCandles[0].open;
        const monthHigh = Math.max(...currentMonthCandles.map(c => c.high));
        const monthLow = Math.min(...currentMonthCandles.map(c => c.low));
        const latestClose = currentMonthCandles[currentMonthCandles.length - 1].close;

        // 3. Monthly POC Reversion
        const isInsideValue = monthOpen >= prevMonthProfile.val && monthOpen <= prevMonthProfile.vah;
        if (isInsideValue) {
          let direction = null;
          let target = prevMonthProfile.poc;
          let sl = 0;
          let entry = monthOpen;

          if (monthOpen > prevMonthProfile.poc) {
            direction = 'SHORT';
            sl = prevMonthProfile.vah;
          } else if (monthOpen < prevMonthProfile.poc) {
            direction = 'LONG';
            sl = prevMonthProfile.val;
          }

          if (direction) {
            const targetTimestamp = new Date(currentMonthCandles[0].time * 1000).toISOString();
            const activeSigExists = signals.some(s => s.symbol === symbol && s.strategy === 'Monthly POC Reversion' && s.timestamp === targetTimestamp);
            if (!activeSigExists) {
              signals.push({
                id: `mreversion-${symbol}-${currentMonthKey}-${Date.now()}`,
                symbol,
                strategy: 'Monthly POC Reversion',
                type: 'SWING',
                direction,
                entry,
                sl,
                target,
                status: 'ACTIVE',
                createdDate: todayStr,
                timestamp: new Date(currentMonthCandles[0].time * 1000).toISOString()
              });
              updated = true;
              console.log(`[Signals Tracker] New Monthly POC Reversion generated for ${symbol}: ${direction}`);
            }
          }
        }

        // 4. Monthly Gap Fade Trap
        const isOutsideValue = monthOpen > prevMonthProfile.vah || monthOpen < prevMonthProfile.val;
        if (isOutsideValue) {
          let direction = null;
          let target = prevMonthProfile.poc;
          let sl = 0;
          let entry = latestClose;

          // Opened above VAH but pulled back below VAH
          if (monthOpen > prevMonthProfile.vah && latestClose < prevMonthProfile.vah) {
            direction = 'SHORT';
            sl = monthHigh;
          } 
          // Opened below VAL but pulled back above VAL
          else if (monthOpen < prevMonthProfile.val && latestClose > prevMonthProfile.val) {
            direction = 'LONG';
            sl = monthLow;
          }

          if (direction) {
            const targetTimestamp = new Date(currentMonthCandles[0].time * 1000).toISOString();
            const activeSigExists = signals.some(s => s.symbol === symbol && s.strategy === 'Monthly Gap Fade Trap' && s.timestamp === targetTimestamp);
            if (!activeSigExists) {
              signals.push({
                id: `mgap-${symbol}-${currentMonthKey}-${Date.now()}`,
                symbol,
                strategy: 'Monthly Gap Fade Trap',
                type: 'SWING',
                direction,
                entry,
                sl,
                target,
                status: 'ACTIVE',
                createdDate: todayStr,
                timestamp: new Date(latestCandle.time * 1000).toISOString()
              });
              updated = true;
              console.log(`[Signals Tracker] New Monthly Gap Fade Trap generated for ${symbol}: ${direction}`);
            }
          }
        }
      }
    }

  } catch (e) {
    console.error(`[Signals Tracker] Error running macro profile reversions:`, e.message || e);
  }

  if (updated) {
    saveSignals(signals);
  }
}


