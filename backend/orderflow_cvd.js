// orderflow_cvd.js - Order Flow Microstructure & CVD Delta Engine
// Analyzes aggressive vs passive order flow, Cumulative Volume Delta (CVD),
// institutional iceberg absorptions, and CVD divergence at Market Profile references.

/**
 * Calculates bar-by-bar delta and running Cumulative Volume Delta (CVD)
 * Using the standard auction market price-action delta aggression model:
 * Delta = Volume * (2 * (Close - Low) - (High - Low)) / (High - Low)
 * 
 * @param {Array} candles - Array of OHLCV candles
 * @param {Object} references - Market Profile reference levels (IB High, IB Low, VAH, VAL, POC)
 */
export function calculateBarDeltaAndCVD(candles, references = {}) {
  if (!candles || !Array.isArray(candles) || candles.length === 0) {
    return {
      bars: [],
      cumulativeDelta: 0,
      totalBuyVolume: 0,
      totalSellVolume: 0,
      deltaRatio: 0,
      divergences: [],
      absorptions: []
    };
  }

  let runningCvd = 0;
  let totalBuyVolume = 0;
  let totalSellVolume = 0;

  const bars = [];
  const volumes = candles.map(c => c.volume || 0);

  // Calculate 20-period moving average of volume for relative volume (RVOL)
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const high = c.high;
    const low = c.low;
    const open = c.open;
    const close = c.close;
    const volume = c.volume || 1;

    const range = high - low;
    let buyRatio = 0.5;

    if (range > 0.0001) {
      // Intra-bar buy pressure ratio
      const closeLocation = (close - low) / range;
      const bodyDirection = close >= open ? 1 : -1;
      
      // Combine close location in bar + directional conviction
      buyRatio = 0.5 * closeLocation + 0.25 * (bodyDirection > 0 ? 0.75 : 0.25) + 0.25 * (close > open ? 0.6 : 0.4);
      buyRatio = Math.max(0.05, Math.min(0.95, buyRatio));
    }

    const buyVolume = Math.round(volume * buyRatio);
    const sellVolume = Math.round(volume * (1 - buyRatio));
    const delta = buyVolume - sellVolume;

    runningCvd += delta;
    totalBuyVolume += buyVolume;
    totalSellVolume += sellVolume;

    // Moving average volume for relative volume check
    const startIdx = Math.max(0, i - 19);
    const avgVolSlice = volumes.slice(startIdx, i + 1);
    const avgVol = avgVolSlice.reduce((a, b) => a + b, 0) / (avgVolSlice.length || 1);
    const rvol = avgVol > 0 ? volume / avgVol : 1.0;

    bars.push({
      time: c.time,
      open,
      high,
      low,
      close,
      volume,
      buyVolume,
      sellVolume,
      delta,
      cvd: runningCvd,
      deltaPct: volume > 0 ? ((delta / volume) * 100) : 0,
      rvol: parseFloat(rvol.toFixed(2))
    });
  }

  const divergences = detectCvdDivergences(bars, references);
  const absorptions = detectIcebergAbsorptions(bars, references);

  const totalVol = totalBuyVolume + totalSellVolume;
  const deltaRatio = totalVol > 0 ? (runningCvd / totalVol) : 0;

  return {
    bars,
    cumulativeDelta: runningCvd,
    totalBuyVolume,
    totalSellVolume,
    deltaRatio: parseFloat(deltaRatio.toFixed(3)),
    divergences,
    absorptions
  };
}

/**
 * Detects CVD Divergences across rolling swing pivots:
 * 1. Bullish Absorption Divergence: Price Lower Low while CVD Higher Low
 * 2. Bearish Exhaustion Divergence: Price Higher High while CVD Lower High
 */
export function detectCvdDivergences(bars, references = {}) {
  const divergences = [];
  if (bars.length < 10) return divergences;

  const lookback = Math.min(bars.length, 30);
  const recentBars = bars.slice(-lookback);

  // Find local price extremes in recent bars
  let priceLows = [];
  let priceHighs = [];

  for (let i = 2; i < recentBars.length - 1; i++) {
    const prev = recentBars[i - 1];
    const curr = recentBars[i];
    const next = recentBars[i + 1];

    if (curr.low < prev.low && curr.low <= next.low) {
      priceLows.push({ idx: i, bar: curr });
    }
    if (curr.high > prev.high && curr.high >= next.high) {
      priceHighs.push({ idx: i, bar: curr });
    }
  }

  // Bullish Absorption Divergence (Price Lower Low, CVD Higher Low)
  if (priceLows.length >= 2) {
    const low1 = priceLows[priceLows.length - 2];
    const low2 = priceLows[priceLows.length - 1];

    if (low2.bar.low < low1.bar.low && low2.bar.cvd > low1.bar.cvd) {
      const nearRef = findNearestReference(low2.bar.low, references);
      divergences.push({
        type: 'BULLISH_ABSORPTION_DIVERGENCE',
        direction: 'BULLISH',
        title: 'Institutional Passive Absorption (Bullish CVD Divergence)',
        detail: `Price printed lower low (${low2.bar.low.toFixed(2)} vs ${low1.bar.low.toFixed(2)}), but CVD made a higher low (${low2.bar.cvd} vs ${low1.bar.cvd}). Aggressive market sellers are getting absorbed by institutional limit buyers.`,
        barTime: low2.bar.time,
        priceLevel: low2.bar.low,
        nearReference: nearRef,
        action: nearRef ? `Strong Long setup at ${nearRef.name} (${nearRef.price.toFixed(2)}). Buy calls or fade breakdown.` : 'Prepare for mean-reversion upwards; avoid shorting new lows.'
      });
    }
  }

  // Bearish Exhaustion Divergence (Price Higher High, CVD Lower High)
  if (priceHighs.length >= 2) {
    const high1 = priceHighs[priceHighs.length - 2];
    const high2 = priceHighs[priceHighs.length - 1];

    if (high2.bar.high > high1.bar.high && high2.bar.cvd < high1.bar.cvd) {
      const nearRef = findNearestReference(high2.bar.high, references);
      divergences.push({
        type: 'BEARISH_EXHAUSTION_DIVERGENCE',
        direction: 'BEARISH',
        title: 'Institutional Exhaustion / Distribution (Bearish CVD Divergence)',
        detail: `Price pushed to higher high (${high2.bar.high.toFixed(2)} vs ${high1.bar.high.toFixed(2)}), but CVD made a lower high (${high2.bar.cvd} vs ${high1.bar.cvd}). Aggressive buyers are exhausted; institutional limit sellers are absorbing.`,
        barTime: high2.bar.time,
        priceLevel: high2.bar.high,
        nearReference: nearRef,
        action: nearRef ? `Strong Short setup at ${nearRef.name} (${nearRef.price.toFixed(2)}). Buy puts or fade breakout.` : 'Prepare for downside pullback; avoid chasing breakouts.'
      });
    }
  }

  return divergences;
}

/**
 * Detects Institutional Iceberg / Absorption orders:
 * Heavy volume (> 1.6x RVOL) with compressed price movement (< 35% bar range)
 * or large delta absorbed without price displacement.
 */
export function detectIcebergAbsorptions(bars, references = {}) {
  const absorptions = [];
  if (bars.length < 5) return absorptions;

  for (let i = Math.max(0, bars.length - 20); i < bars.length; i++) {
    const bar = bars[i];
    const range = bar.high - bar.low;
    if (range <= 0.0001) continue;

    const body = Math.abs(bar.close - bar.open);
    const bodyProgress = body / range;

    // High volume with low price progress = Absorption
    if (bar.rvol >= 1.5 && bodyProgress < 0.35) {
      const nearRef = findNearestReference(bar.close, references);
      
      // Determine if absorption was at highs (seller absorbing) or lows (buyer absorbing)
      const closeAtHigh = (bar.close - bar.low) / range > 0.6;
      const closeAtLow = (bar.close - bar.low) / range < 0.4;

      if (bar.delta > 0 && !closeAtHigh) {
        // Aggressive buying failed to close high -> Bearish absorption
        absorptions.push({
          type: 'SELLER_ICEBERG_ABSORPTION',
          bias: 'BEARISH',
          title: 'Institutional Seller Iceberg Absorption',
          detail: `Bar RVOL ${bar.rvol}x on positive delta (+${bar.delta}) but price was trapped and failed to close near high. Massive institutional limit sell orders absorbed market buyers.`,
          price: bar.high,
          time: bar.time,
          rvol: bar.rvol,
          delta: bar.delta,
          nearReference: nearRef
        });
      } else if (bar.delta < 0 && !closeAtLow) {
        // Aggressive selling failed to close low -> Bullish absorption
        absorptions.push({
          type: 'BUYER_ICEBERG_ABSORPTION',
          bias: 'BULLISH',
          title: 'Institutional Buyer Iceberg Absorption',
          detail: `Bar RVOL ${bar.rvol}x on negative delta (${bar.delta}) but price was defended and failed to close near low. Institutional limit buy orders absorbed aggressive panic sellers.`,
          price: bar.low,
          time: bar.time,
          rvol: bar.rvol,
          delta: bar.delta,
          nearReference: nearRef
        });
      }
    }
  }

  return absorptions;
}

/**
 * Finds the closest Market Profile reference within tolerance
 */
function findNearestReference(price, references) {
  if (!references) return null;
  const tolerance = price * 0.003; // 0.3% price proximity

  const candidates = [
    { name: 'IB High', price: references.ibHigh },
    { name: 'IB Low', price: references.ibLow },
    { name: 'Prior VAH', price: references.priorVah || references.vahPrice },
    { name: 'Prior VAL', price: references.priorVal || references.valPrice },
    { name: 'Prior POC', price: references.priorPoc || references.pocPrice },
    { name: 'Yesterday High', price: references.priorHigh },
    { name: 'Yesterday Low', price: references.priorLow }
  ].filter(c => c.price !== undefined && c.price !== null && !isNaN(c.price));

  let closest = null;
  let minDiff = Infinity;

  for (const c of candidates) {
    const diff = Math.abs(c.price - price);
    if (diff <= tolerance && diff < minDiff) {
      minDiff = diff;
      closest = c;
    }
  }

  return closest;
}

/**
 * High-level Order Flow Microstructure analysis for Mihir View
 */
export function getOrderFlowSummary(symbol, candles, references = {}) {
  const result = calculateBarDeltaAndCVD(candles, references);

  const lastBar = result.bars[result.bars.length - 1] || null;
  const recentBars = result.bars.slice(-5);
  const recentDelta = recentBars.reduce((sum, b) => sum + b.delta, 0);

  let flowRegime = 'BALANCED_AUCTION';
  let regimeColor = '#60a5fa';
  let regimeDesc = 'Order flow is in equilibrium with balanced two-sided market participation.';

  if (result.cumulativeDelta > 0 && recentDelta > 0) {
    if (result.deltaRatio > 0.15) {
      flowRegime = 'AGGRESSIVE_BUYING_INITIATIVE';
      regimeColor = 'var(--color-bull)';
      regimeDesc = 'Strong initiative buying pressure. Market orders aggressively hitting the Ask.';
    } else {
      flowRegime = 'MILD_BUY_ACCUMULATION';
      regimeColor = '#34d399';
      regimeDesc = 'Gradual buyer accumulation with positive net cumulative volume delta.';
    }
  } else if (result.cumulativeDelta < 0 && recentDelta < 0) {
    if (result.deltaRatio < -0.15) {
      flowRegime = 'AGGRESSIVE_SELLING_LIQUIDATION';
      regimeColor = 'var(--color-bear)';
      regimeDesc = 'Aggressive initiative selling pressure. Market orders aggressively hitting the Bid.';
    } else {
      flowRegime = 'MILD_SELL_DISTRIBUTION';
      regimeColor = '#f87171';
      regimeDesc = 'Gradual seller distribution with negative net cumulative volume delta.';
    }
  }

  return {
    symbol,
    flowRegime,
    regimeColor,
    regimeDesc,
    cumulativeDelta: result.cumulativeDelta,
    recentDelta,
    deltaRatio: result.deltaRatio,
    totalBuyVolume: result.totalBuyVolume,
    totalSellVolume: result.totalSellVolume,
    divergences: result.divergences,
    absorptions: result.absorptions,
    lastBarDelta: lastBar ? lastBar.delta : 0,
    lastBarRvol: lastBar ? lastBar.rvol : 1.0,
    barsCount: result.bars.length,
    bars: result.bars.slice(-60) // Return last 60 bars for fast UI rendering
  };
}
