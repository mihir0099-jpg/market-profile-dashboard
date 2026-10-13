// options_greeks.js - Live Options Greeks & Gamma Scalping Convexity Engine
// Implements complete Black-Scholes Greeks, Newton-Raphson IV solver,
// Expiry afternoon explosive Gamma Scalp detection, Lunchtime Theta Burn risk gauge,
// and First-Hour PCR Velocity analytics.

const RISK_FREE_RATE = 0.065; // RBI Repo Rate proxy (6.5%)

// Standard normal cumulative distribution function approximation (Abramowitz & Stegun)
function normCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function
function normPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Black-Scholes Option Pricing
 */
export function bsPrice(S, K, T, sigma, type = 'CE', r = RISK_FREE_RATE) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    if (type === 'CE') return Math.max(0, S - K);
    return Math.max(0, K - S);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (type === 'CE') {
    return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  } else {
    return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
  }
}

/**
 * Black-Scholes Delta (0 to 1 for Calls, -1 to 0 for Puts)
 */
export function bsDelta(S, K, T, sigma, type = 'CE', r = RISK_FREE_RATE) {
  if (T <= 0.0001 || sigma <= 0) return type === 'CE' ? (S >= K ? 1.0 : 0.0) : (S <= K ? -1.0 : 0.0);
  try {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const nd1 = normCdf(d1);
    return type === 'CE' ? nd1 : nd1 - 1.0;
  } catch (e) {
    return 0.0;
  }
}

/**
 * Black-Scholes Gamma (Sensitivity of Delta to Spot changes)
 */
export function bsGamma(S, K, T, sigma, r = RISK_FREE_RATE) {
  if (T <= 0.0001 || sigma <= 0 || S <= 0 || K <= 0) return 0.0;
  try {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    return normPdf(d1) / (S * sigma * Math.sqrt(T));
  } catch (e) {
    return 0.0;
  }
}

/**
 * Black-Scholes Theta (Daily time decay in ₹ or index points per day)
 */
export function bsTheta(S, K, T, sigma, type = 'CE', r = RISK_FREE_RATE) {
  if (T <= 0.0001 || sigma <= 0 || S <= 0 || K <= 0) return 0.0;
  try {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    const term1 = -(S * normPdf(d1) * sigma) / (2 * Math.sqrt(T));
    if (type === 'CE') {
      const term2 = -r * K * Math.exp(-r * T) * normCdf(d2);
      return (term1 + term2) / 365.0; // Daily theta
    } else {
      const term2 = r * K * Math.exp(-r * T) * normCdf(-d2);
      return (term1 + term2) / 365.0; // Daily theta
    }
  } catch (e) {
    return 0.0;
  }
}

/**
 * Black-Scholes Vega (Sensitivity per 1% change in Implied Volatility)
 */
export function bsVega(S, K, T, sigma, r = RISK_FREE_RATE) {
  if (T <= 0.0001 || sigma <= 0 || S <= 0 || K <= 0) return 0.0;
  try {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    return (S * normPdf(d1) * Math.sqrt(T)) / 100.0;
  } catch (e) {
    return 0.0;
  }
}

/**
 * Newton-Raphson Implied Volatility Solver
 */
export function solveImpliedVolatility(marketPrice, S, K, T, type = 'CE', r = RISK_FREE_RATE) {
  if (marketPrice <= 0 || T <= 0.0001) return 0.15;
  
  let sigma = 0.20; // 20% initial guess
  const maxIterations = 30;
  const tolerance = 0.001;

  for (let i = 0; i < maxIterations; i++) {
    const price = bsPrice(S, K, T, sigma, type, r);
    const diff = price - marketPrice;
    if (Math.abs(diff) < tolerance) return sigma;

    const vega = bsVega(S, K, T, sigma, r) * 100.0; // Convert to raw vega
    if (Math.abs(vega) < 0.00001) break;

    sigma = sigma - diff / vega;
    if (sigma <= 0.01) sigma = 0.01;
    if (sigma > 3.0) sigma = 3.0;
  }

  return Math.max(0.05, Math.min(2.0, sigma));
}

/**
 * Strike step resolution by underlying
 */
export function getStrikeStep(symbol) {
  const clean = symbol.replace('NSE:', '').replace('BSE:', '').replace('1!', '');
  if (clean === 'BANKNIFTY') return 100;
  if (clean === 'NIFTY') return 50;
  if (clean === 'FINNIFTY') return 50;
  if (clean === 'SENSEX') return 100;
  if (clean === 'RELIANCE') return 20;
  if (clean === 'HDFCBANK') return 10;
  if (clean === 'TCS' || clean === 'INFY') return 20;
  if (clean === 'SBIN') return 5;
  return 50;
}

/**
 * Evaluates Full Options Chain with Greeks for a given underlying
 */
export function computeGreeksMatrix(symbol, spotPrice, optionsData = [], dteDays = 3, vix = 13.5) {
  const step = getStrikeStep(symbol);
  const atmStrike = Math.round(spotPrice / step) * step;
  const T = Math.max(0.001, dteDays / 365.0);
  const baselineIv = Math.max(0.10, vix / 100.0);

  const strikes = [];
  const strikeRange = 8; // 8 strikes above and below ATM

  for (let i = -strikeRange; i <= strikeRange; i++) {
    const strike = atmStrike + i * step;

    // Call Greeks
    const cePriceEst = bsPrice(spotPrice, strike, T, baselineIv, 'CE');
    const ceDelta = bsDelta(spotPrice, strike, T, baselineIv, 'CE');
    const ceGamma = bsGamma(spotPrice, strike, T, baselineIv);
    const ceTheta = bsTheta(spotPrice, strike, T, baselineIv, 'CE');
    const ceVega = bsVega(spotPrice, strike, T, baselineIv);

    // Put Greeks
    const pePriceEst = bsPrice(spotPrice, strike, T, baselineIv, 'PE');
    const peDelta = bsDelta(spotPrice, strike, T, baselineIv, 'PE');
    const peGamma = bsGamma(spotPrice, strike, T, baselineIv);
    const peTheta = bsTheta(spotPrice, strike, T, baselineIv, 'PE');
    const peVega = bsVega(spotPrice, strike, T, baselineIv);

    // Convexity Acceleration Factor = (Gamma * Spot^2) / Premium
    const ceConvexity = cePriceEst > 0.5 ? ((ceGamma * spotPrice * spotPrice) / (cePriceEst * 1000)) : 0;
    const peConvexity = pePriceEst > 0.5 ? ((peGamma * spotPrice * spotPrice) / (pePriceEst * 1000)) : 0;

    strikes.push({
      strike,
      isAtm: strike === atmStrike,
      distanceFromAtm: i,
      ce: {
        price: parseFloat(cePriceEst.toFixed(2)),
        delta: parseFloat(ceDelta.toFixed(3)),
        gamma: parseFloat(ceGamma.toFixed(5)),
        theta: parseFloat(ceTheta.toFixed(2)),
        vega: parseFloat(ceVega.toFixed(2)),
        ivPct: parseFloat((baselineIv * 100).toFixed(1)),
        convexityScore: parseFloat(ceConvexity.toFixed(2))
      },
      pe: {
        price: parseFloat(pePriceEst.toFixed(2)),
        delta: parseFloat(peDelta.toFixed(3)),
        gamma: parseFloat(peGamma.toFixed(5)),
        theta: parseFloat(peTheta.toFixed(2)),
        vega: parseFloat(peVega.toFixed(2)),
        ivPct: parseFloat((baselineIv * 100).toFixed(1)),
        convexityScore: parseFloat(peConvexity.toFixed(2))
      }
    });
  }

  return {
    symbol,
    spotPrice,
    atmStrike,
    dteDays,
    vix,
    strikes
  };
}

/**
 * Expiry Day Gamma Scalping Convexity Engine
 * Identifies high-convexity, explosive gamma scalping candidate strikes.
 * Especially active between 2:15 PM and 3:30 PM (Periods K-L-M) or on Expiry Days.
 */
export function detectGammaScalpOpportunities(symbol, spotPrice, greeksMatrix, isExpiryDay = false, currentIstTime = null) {
  const candidates = [];
  const now = currentIstTime || new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const hrs = ist.getHours();
  const mins = ist.getMinutes();
  const minsSinceMidnight = hrs * 60 + mins;

  // Afternoon Gamma Surge Window: 2:15 PM to 3:30 PM (855 to 930 mins)
  const isAfternoonWindow = minsSinceMidnight >= 855 && minsSinceMidnight <= 930;
  const isPeriodG = minsSinceMidnight >= 735 && minsSinceMidnight <= 765; // 12:15 - 12:45

  for (const s of greeksMatrix.strikes) {
    // Check Call candidate: Sweet spot premium ₹5 to ₹35, strike near ATM (distance 0 to +2)
    if (s.distanceFromAtm >= 0 && s.distanceFromAtm <= 2) {
      if (s.ce.price >= 4.0 && s.ce.price <= 45.0) {
        candidates.push({
          type: 'CE',
          strike: s.strike,
          premium: s.ce.price,
          delta: s.ce.delta,
          gamma: s.ce.gamma,
          theta: s.ce.theta,
          convexityScore: s.ce.convexityScore,
          isAtm: s.isAtm,
          conviction: s.isAtm ? 'VERY_HIGH' : 'HIGH',
          setupTitle: `Long CE Gamma Scalp (${s.strike} CE @ ₹${s.ce.price})`,
          rationale: `Gamma (${s.ce.gamma}) provides explosive delta acceleration. A 35-pt index breakout doubles premium rapidly with asymmetric risk/reward.`,
          recommendedStopLoss: parseFloat((s.ce.price * 0.5).toFixed(1)),
          target1: parseFloat((s.ce.price * 1.8).toFixed(1)),
          target2: parseFloat((s.ce.price * 3.0).toFixed(1))
        });
      }
    }

    // Check Put candidate: Sweet spot premium ₹5 to ₹35, strike near ATM (distance -2 to 0)
    if (s.distanceFromAtm <= 0 && s.distanceFromAtm >= -2) {
      if (s.pe.price >= 4.0 && s.pe.price <= 45.0) {
        candidates.push({
          type: 'PE',
          strike: s.strike,
          premium: s.pe.price,
          delta: s.pe.delta,
          gamma: s.pe.gamma,
          theta: s.pe.theta,
          convexityScore: s.pe.convexityScore,
          isAtm: s.isAtm,
          conviction: s.isAtm ? 'VERY_HIGH' : 'HIGH',
          setupTitle: `Long PE Gamma Scalp (${s.strike} PE @ ₹${s.pe.price})`,
          rationale: `Gamma (${s.pe.gamma}) delivers rapid delta expansion upon breakdown. Downside acceleration is historically faster with high gamma spikes.`,
          recommendedStopLoss: parseFloat((s.pe.price * 0.5).toFixed(1)),
          target1: parseFloat((s.pe.price * 1.8).toFixed(1)),
          target2: parseFloat((s.pe.price * 3.0).toFixed(1))
        });
      }
    }
  }

  // Sort by convexity score descending
  candidates.sort((a, b) => b.convexityScore - a.convexityScore);

  return {
    isAfternoonWindow,
    isExpiryDay,
    isPeriodG,
    windowStatus: isAfternoonWindow 
      ? '🔥 PRIME GAMMA SQUEEZE WINDOW (2:15 PM – 3:30 PM): Explosive non-linear price acceleration active.' 
      : (isPeriodG 
        ? '⏳ PERIOD G LUNCHTIME CONSOLIDATION: High theta burn risk. Avoid fresh option buying.' 
        : '⚡ INTRADAY CONVEXITY MONITOR: Monitoring strike gamma acceleration on IB extensions.'),
    topCandidates: candidates.slice(0, 6)
  };
}

/**
 * Period G Lunchtime Theta Burn Risk Gauge (12:15 PM – 12:45 PM IST)
 */
export function calculateLunchtimeThetaRisk(vix = 13.5, currentIstTime = null) {
  const now = currentIstTime || new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const hrs = ist.getHours();
  const mins = ist.getMinutes();
  const minsSinceMidnight = hrs * 60 + mins;

  const isPeriodG = minsSinceMidnight >= 735 && minsSinceMidnight <= 765;
  const isPostCrashIvCrush = vix > 22;

  let riskLevel = 'MODERATE';
  let riskColor = '#f59e0b';
  let advice = 'Normal intraday theta burn.';

  if (vix < 15.0) {
    riskLevel = 'EXTREME_DECAY_WARNING';
    riskColor = 'var(--color-bear)';
    advice = 'Low-VIX grinding environment. ATM straddles lose 1.5% to 4% value during Period G (12:15 - 12:45 PM). Rule: Exit long options before 12:15 PM or stay cash until 12:45 PM.';
  } else if (vix >= 18.0) {
    riskLevel = 'IV_EXPANSION_OPPORTUNITY';
    riskColor = 'var(--color-bull)';
    advice = 'High-VIX environment. Market makers bloat option IV ahead of the European open, expanding straddle premiums even if spot is flat. Rule: Hold long options through G-period.';
  } else {
    advice = 'Standard lunchtime theta decay. Tighten stop losses on long options or hedge with spreads.';
  }

  return {
    isPeriodG,
    vix,
    riskLevel,
    riskColor,
    advice,
    expectedStraddleBurnPct: vix < 15 ? '2.5% – 4.0%' : '1.0% – 2.0%',
    postCrashWarning: isPostCrashIvCrush ? 'Post-crash IV crush alert: Do not buy morning call options for bounces. Trade futures or sell puts instead.' : null
  };
}

/**
 * Evaluates First-Hour Put-Call Ratio (PCR) Velocity & Drift (9:15 AM - 10:15 AM IST)
 */
export function evaluatePcrVelocity(openPcr = 1.0, currentPcr = 1.0) {
  const drift = currentPcr - openPcr;
  const driftPct = openPcr > 0 ? ((drift / openPcr) * 100) : 0;

  let signal = 'NEUTRAL_AUCTION';
  let bias = 'NEUTRAL';
  let color = '#60a5fa';
  let explanation = 'PCR drift is within ±0.03 (±3%). Lack of directional option writing conviction. Expect an Open Auction range day.';

  if (drift > 0.03 || driftPct > 3.0) {
    signal = 'BULLISH_PCR_DRIFT';
    bias = 'BULLISH';
    color = 'var(--color-bull)';
    explanation = `PCR drifted +${drift.toFixed(3)} (+${driftPct.toFixed(1)}%). Aggressive institutional Put writing (support building). Expect a bullish trend day or gap acceptance.`;
  } else if (drift < -0.03 || driftPct < -3.0) {
    signal = 'BEARISH_PCR_DRIFT';
    bias = 'BEARISH';
    color = 'var(--color-bear)';
    explanation = `PCR drifted ${drift.toFixed(3)} (${driftPct.toFixed(1)}%). Aggressive institutional Call writing (resistance building). Expect a bearish trend day or breakdown.`;
  }

  return {
    openPcr: parseFloat(openPcr.toFixed(3)),
    currentPcr: parseFloat(currentPcr.toFixed(3)),
    drift: parseFloat(drift.toFixed(3)),
    driftPct: parseFloat(driftPct.toFixed(2)),
    signal,
    bias,
    color,
    explanation
  };
}
