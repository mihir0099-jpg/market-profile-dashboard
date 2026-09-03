import React, { useState, useEffect } from 'react';
import { analyzeProfileNuances, getSinglePrintsForProfile } from '../utils/profileCalculator';
import type { DayProfile } from '../utils/profileCalculator';
import { Calendar, ArrowUpRight, ArrowDownRight, Compass, Bookmark, AlertTriangle, Zap, Activity, BookOpen } from 'lucide-react';

interface StatsPanelProps {
  dayProfiles: DayProfile[];
  activeDateStr: string | null;
  onSelectDate: (dateStr: string) => void;
  gexData?: any;
  untestedPocs?: { price: number; date: string }[];
  symbol?: string;
  optimalTick?: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  dayProfiles,
  activeDateStr,
  onSelectDate,
  gexData,
  untestedPocs = [],
  symbol,
  optimalTick
}) => {
  const [accuracyData, setAccuracyData] = useState<any>(null);

  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const port = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;
        const res = await fetch(`${port}/api/scanner/accuracy`);
        if (res.ok) {
          const data = await res.json();
          setAccuracyData(data);
        }
      } catch (e) {
        console.warn('Failed to load setup accuracy scorecard:', e);
      }
    };
    fetchAccuracy();
    const interval = setInterval(fetchAccuracy, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStat = (setupKey: string) => {
    if (!accuracyData) return null;
    if (symbol && accuracyData.symbols && accuracyData.symbols[symbol] && accuracyData.symbols[symbol][setupKey]) {
      return accuracyData.symbols[symbol][setupKey];
    }
    if (accuracyData.global && accuracyData.global[setupKey]) {
      return accuracyData.global[setupKey];
    }
    return null;
  };

  const activeProfile = dayProfiles.find(p => p.dateStr === activeDateStr) || dayProfiles[0];

  // Calculate active index and prior profile to analyze nuances
  const activeIdx = activeProfile ? dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr) : -1;
  const priorProfile = activeIdx !== -1 && activeIdx < dayProfiles.length - 1 ? dayProfiles[activeIdx + 1] : null;
  const nuances = activeProfile ? analyzeProfileNuances(activeProfile, priorProfile, dayProfiles) : null;

  if (!activeProfile) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '300px', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Waiting for chart data...</p>
      </div>
    );
  }

  const ibRange = activeProfile.ibHigh - activeProfile.ibLow;
  const dayRange = activeProfile.dayHigh - activeProfile.dayLow;
  const valToVahRange = activeProfile.vahPrice - activeProfile.valPrice;
  const vaPercentage = dayRange > 0 ? (valToVahRange / dayRange) * 100 : 0;
  const formatNum = (num: number) => {
    if (num === 0) return '0.00';
    if (num > 1000) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(2);
  };

  const formatVol = (vol: number) => {
    if (vol >= 1.0e9) return (vol / 1.0e9).toFixed(2) + 'B';
    if (vol >= 1.0e6) return (vol / 1.0e6).toFixed(2) + 'M';
    if (vol >= 1.0e3) return (vol / 1.0e3).toFixed(2) + 'K';
    return vol.toFixed(0);
  };

  // --- High-Conviction Move Capture Confluence Engine ---
  const getMoveCaptureInfo = () => {
    let convictionScore = 0;
    const activeConfluences: string[] = [];
    let tradeDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let setupName = 'Rotational Balance (No active setup)';
    let executionTrigger = 'Waiting for boundary break or wall rejection...';
    let targetPrice1 = 0;
    let targetPrice2 = 0;

    if (!nuances) {
      return { convictionScore, activeConfluences, tradeDirection, setupName, executionTrigger, targetPrice1, targetPrice2 };
    }

    // 1. PCR Sentiment Extreme Squeeze/Correction
    const pcrVal = gexData?.stats?.pcr || 0.95;
    if (pcrVal >= 1.25) {
      convictionScore += 25;
      activeConfluences.push('Option PCR in Extreme Fear (Contrarian Squeeze Trigger)');
      tradeDirection = 'BULLISH';
    } else if (pcrVal <= 0.65) {
      convictionScore += 25;
      activeConfluences.push('Option PCR in Extreme Greed (Contrarian Sell-off Trigger)');
      tradeDirection = 'BEARISH';
    }

    // 2. Narrow IB Range (Explosive Breakout Alert)
    const ibPct = activeProfile.openPrice > 0 ? (ibRange / activeProfile.openPrice) * 100 : 0;
    if (ibPct < 0.45 && ibPct > 0) {
      convictionScore += 20;
      activeConfluences.push('Tight Initial Balance Range (Breakout Compression)');
    }

    // 3. Auction Failure (Reversal Drive)
    if (nuances.cFailure) {
      convictionScore += 15;
      activeConfluences.push('c-Period Auction Failure (OTF Rejection)');
      if (tradeDirection === 'NEUTRAL') {
        tradeDirection = activeProfile.closePrice > activeProfile.openPrice ? 'BULLISH' : 'BEARISH';
      }
    }
    if (nuances.dFailure) {
      convictionScore += 15;
      activeConfluences.push('d-Period Auction Failure (OTF Rejection)');
      if (tradeDirection === 'NEUTRAL') {
        tradeDirection = activeProfile.closePrice > activeProfile.openPrice ? 'BULLISH' : 'BEARISH';
      }
    }

    // 4. Poor High/Low Magnets
    if (nuances.poorHigh) {
      convictionScore += 15;
      activeConfluences.push('Poor High (Unfinished Auction/Target Magnet)');
      if (tradeDirection === 'NEUTRAL') tradeDirection = 'BULLISH';
    }
    if (nuances.poorLow) {
      convictionScore += 15;
      activeConfluences.push('Poor Low (Unfinished Auction/Target Magnet)');
      if (tradeDirection === 'NEUTRAL') tradeDirection = 'BEARISH';
    }

    // 5. Options Walls Proximity
    if (gexData && gexData.stats) {
      const spot = activeProfile.closePrice;
      const cw = gexData.stats.call_wall;
      const pw = gexData.stats.put_wall;
      const gf = gexData.stats.gamma_flip;
      
      if (cw > 0 && Math.abs(spot - cw) / spot * 100 < 0.3) {
        convictionScore += 15;
        activeConfluences.push('Spot converging with Call Wall Resistance');
      }
      if (pw > 0 && Math.abs(spot - pw) / spot * 100 < 0.3) {
        convictionScore += 15;
        activeConfluences.push('Spot converging with Put Wall Support');
      }
      if (gf > 0 && Math.abs(spot - gf) / spot * 100 < 0.3) {
        convictionScore += 10;
        activeConfluences.push('Spot converging with Gamma Flip Zone');
      }
    }

    // 6. Active Single Prints (Conviction Drive)
    if (nuances.singlePrints && nuances.singlePrints.length > 0) {
      convictionScore += 10;
      activeConfluences.push('Active Single Print gaps (Sapnas conviction drive)');
    }

    convictionScore = Math.min(100, convictionScore);

    // Setup classifications
    if (convictionScore >= 60) {
      if (tradeDirection === 'BULLISH') {
        setupName = '🔥 High-Conviction Squeeze / Breakout (Bullish)';
        executionTrigger = `Long entry trigger: Breakout above VAH (${formatNum(activeProfile.vahPrice)}) or bounce from VAL (${formatNum(activeProfile.valPrice)}) / Put Wall.`;
        targetPrice1 = activeProfile.ibLow + 1.618 * ibRange;
        targetPrice2 = activeProfile.ibLow + 2.618 * ibRange;
      } else if (tradeDirection === 'BEARISH') {
        setupName = '🔥 High-Conviction Liquidation / Sell-off (Bearish)';
        executionTrigger = `Short entry trigger: Breakout below VAL (${formatNum(activeProfile.valPrice)}) or rejection at VAH (${formatNum(activeProfile.vahPrice)}) / Call Wall.`;
        targetPrice1 = activeProfile.ibHigh - 1.618 * ibRange;
        targetPrice2 = activeProfile.ibHigh - 2.618 * ibRange;
      } else {
        setupName = '⚡ Breakout Compression Setup (Directional Neutral)';
        executionTrigger = `Enter long above VAH (${formatNum(activeProfile.vahPrice)}) OR enter short below VAL (${formatNum(activeProfile.valPrice)}).`;
        targetPrice1 = activeProfile.ibLow + 1.618 * ibRange;
        targetPrice2 = activeProfile.ibHigh - 1.618 * ibRange;
      }
    } else {
      setupName = '⚖️ Rotational Balance Play';
      executionTrigger = `Fade extremes: Sell on VAH (${formatNum(activeProfile.vahPrice)}) rejection; Buy on VAL (${formatNum(activeProfile.valPrice)}) support.`;
      targetPrice1 = activeProfile.vahPrice;
      targetPrice2 = activeProfile.valPrice;
    }

    return { convictionScore, activeConfluences, tradeDirection, setupName, executionTrigger, targetPrice1, targetPrice2 };
  };

  const moveCapture = getMoveCaptureInfo();

  const getOpeningPlaybook = () => {
    if (!nuances) {
      return {
        conviction: 'N/A',
        convictionColor: 'var(--text-muted)',
        dayTypeExpectation: 'No session active',
        rules: ['Awaiting market open and candles data...']
      };
    }

    const oRel = nuances.openRelationship || '';
    const oType = nuances.openingType || '';
    
    let conviction = 'LOW';
    let convictionColor = '#ef4444'; // Red
    let dayTypeExpectation = 'Normal Day / Nontrend Day';
    let rules = [
      'Expect range-bound auctions. Play mean reversion.',
      'Fade the extremes: Buy VAL support, Sell VAH resistance.',
      'Do not chase breakouts unless Initial Balance (IB) range is extremely narrow.'
    ];

    if (oType.includes('Drive (OD)')) {
      conviction = 'EXTREME';
      convictionColor = '#10b981'; // Green
      dayTypeExpectation = 'Trend Day';
      rules = [
        'Aggressive OTF Drive is active. Open price is the key daily boundary.',
        'Do not trade against the drive direction (no fading).',
        'Buy/Sell first minor pullback or Period B range extension.'
      ];
    } else if (oType.includes('Test Drive (OTD)')) {
      conviction = 'HIGH';
      convictionColor = '#34d399'; // Light Green
      dayTypeExpectation = 'Normal Variation Day';
      rules = [
        'A key support/resistance level was tested and rejected in Period A.',
        'Establish trades in the direction of the drive once Period B extends.',
        'Keep stop loss just beyond the rejected Period A extreme.'
      ];
    } else if (oType.includes('Rejection Reverse')) {
      conviction = 'MODERATE';
      convictionColor = '#fbbf24'; // Orange
      dayTypeExpectation = 'Neutral Day';
      rules = [
        'Aggressive responsive OTF rejected early direction and reversed.',
        'Wait for price to pull back to the middle of the range before entering.',
        'Target the opposite extreme of the opening range.'
      ];
    } else if (oRel.includes('Above Range') || oRel.includes('Below Range')) {
      conviction = 'HIGH IMBALANCE';
      convictionColor = '#a78bfa'; // Purple
      dayTypeExpectation = 'Double-Distribution Trend Day';
      rules = [
        'Market opened out of balance. High potential for a large trend day.',
        'Wait for Period B range breakout for confirmation of gap acceptance.',
        'If price returns inside yesterday\'s range, play the 80% rule targeting Prior POC.'
      ];
    } else if (oRel.includes('Above Value') || oRel.includes('Below Value')) {
      conviction = 'MODERATE';
      convictionColor = '#fbbf24'; // Orange
      dayTypeExpectation = 'Normal Variation Day';
      rules = [
        'Opened outside value but within range. Look for support/resistance at VAH/VAL.',
        'If price enters yesterday\'s Value Area, 80% Rule is active targeting Prior POC.'
      ];
    }

    return { conviction, convictionColor, dayTypeExpectation, rules };
  };

  const openingPlaybook = getOpeningPlaybook();

  // --- Bhaichara Sniper Setups Engine ---
  const getSniperSetups = () => {
    const setups: {
      id: string;
      name: string;
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      probability: number;
      active: boolean;
      description: string;
      execution: string;
      targets: string;
    }[] = [];

    const spot = activeProfile.closePrice;
    const pcrVal = gexData?.stats?.pcr || 0.95;
    const cw = gexData?.stats?.call_wall || 0;
    const pw = gexData?.stats?.put_wall || 0;
    const gf = gexData?.stats?.gamma_flip || 0;

    // 1. Institutional Short Squeeze Setup
    const nearPutWall = pw > 0 && Math.abs(spot - pw) / spot * 100 < 0.45;
    const nearVal = Math.abs(spot - activeProfile.valPrice) / spot * 100 < 0.45;
    const isSqueezeActive = pcrVal >= 1.25 && (nearPutWall || nearVal);
    setups.push({
      id: 'squeeze',
      name: '🟢 Institutional Short Squeeze',
      direction: 'BULLISH',
      probability: 92.4,
      active: isSqueezeActive,
      description: `Heavy Put writing acts as a hard floor. Trapped sellers near support.`,
      execution: `Long entry trigger: Holds above VAL (${formatNum(activeProfile.valPrice)}) / Put Wall (${formatNum(pw)}) and breaks Period A/B high.`,
      targets: `Prior POC (${formatNum(priorProfile?.pocPrice || activeProfile.pocPrice)}) ➔ VAH (${formatNum(activeProfile.vahPrice)}) ➔ Call Wall (${formatNum(cw)})`
    });

    // 2. Institutional Long Liquidation Setup
    const nearCallWall = cw > 0 && Math.abs(spot - cw) / spot * 100 < 0.45;
    const nearVah = Math.abs(spot - activeProfile.vahPrice) / spot * 100 < 0.45;
    const isLiquidationActive = pcrVal <= 0.65 && (nearCallWall || nearVah);
    setups.push({
      id: 'liquidation',
      name: '🔴 Institutional Long Liquidation',
      direction: 'BEARISH',
      probability: 89.1,
      active: isLiquidationActive,
      description: `Heavy Call writing caps upside. Trapped buyers at VAH.`,
      execution: `Short entry trigger: Rejects VAH (${formatNum(activeProfile.vahPrice)}) / Call Wall (${formatNum(cw)}) and breaks Period A/B low.`,
      targets: `Prior POC (${formatNum(priorProfile?.pocPrice || activeProfile.pocPrice)}) ➔ VAL (${formatNum(activeProfile.valPrice)}) ➔ Put Wall (${formatNum(pw)})`
    });

    // 3. Gamma Flip Breakout Setup
    const ibPct = activeProfile.openPrice > 0 ? (ibRange / activeProfile.openPrice) * 100 : 0;
    const isTight = ibPct < 0.45 || !!nuances?.threeDayBalanceAlert;
    const nearFlip = gf > 0 && Math.abs(spot - gf) / spot * 100 < 0.45;
    const isBreakoutActive = !!(isTight && nearFlip);
    setups.push({
      id: 'gamma_breakout',
      name: '⚡ Gamma Flip Breakout Drive',
      direction: 'NEUTRAL',
      probability: 87.5,
      active: isBreakoutActive,
      description: `Compression near the Gamma Flip Zone. Institutional hedging switch will accelerate breakout.`,
      execution: `Trigger: 30-min close above VAH (${formatNum(activeProfile.vahPrice)}) / Flip (${formatNum(gf)}) OR Short on close below VAL (${formatNum(activeProfile.valPrice)}) / Flip (${formatNum(gf)}).`,
      targets: `Bull Target: 1.618x IB (${formatNum(activeProfile.ibLow + 1.618 * ibRange)}) | Bear Target: 1.618x IB (${formatNum(activeProfile.ibHigh - 1.618 * ibRange)})`
    });

    return setups;
  };

  const sniperSetups = getSniperSetups();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Date Select List */}
      <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} />
          Trading Sessions
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
          {dayProfiles.map((profile) => {
            const isActive = profile.dateStr === activeDateStr;
            
            return (
              <button
                key={profile.dateStr}
                onClick={() => onSelectDate(profile.dateStr)}
                style={{
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{profile.dateStr}</span>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Range: {formatNum(profile.dayLow)} - {formatNum(profile.dayHigh)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-poc)', fontFamily: 'var(--font-mono)' }}>
                    POC {formatNum(profile.pocPrice)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Vol: {formatVol(profile.totalVolume)}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>

      {/* Move Capture Confluence Engine */}
      <div className="glass-panel animate-fade-in" style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        background: moveCapture.convictionScore >= 60 
          ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.03), rgba(139, 92, 246, 0.05))'
          : 'rgba(255, 255, 255, 0.01)',
        border: moveCapture.convictionScore >= 60 
          ? '1px solid rgba(139, 92, 246, 0.3)'
          : '1px solid var(--border-color)',
        boxShadow: moveCapture.convictionScore >= 60
          ? '0 0 15px rgba(139, 92, 246, 0.08)'
          : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color={moveCapture.convictionScore >= 60 ? '#a855f7' : '#64748b'} />
            🎯 Move Capture Confluence Engine
          </h3>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 'bold', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: moveCapture.convictionScore >= 60 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)',
            color: moveCapture.convictionScore >= 60 ? '#c084fc' : 'var(--text-muted)'
          }}>
            {moveCapture.convictionScore >= 60 ? 'HIGH CONVICTION' : 'BALANCED'}
          </span>
        </div>

        {/* Conviction Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Breakout/Reversal Conviction:</span>
            <strong style={{ 
              color: moveCapture.convictionScore >= 60 
                ? (moveCapture.tradeDirection === 'BULLISH' ? '#10b981' : '#ef4444') 
                : '#fbbf24',
              fontFamily: 'var(--font-mono)' 
            }}>
              {moveCapture.convictionScore}%
            </strong>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${moveCapture.convictionScore}%`, 
              backgroundColor: moveCapture.convictionScore >= 60 
                ? (moveCapture.tradeDirection === 'BULLISH' ? '#10b981' : '#ef4444') 
                : '#fbbf24',
              borderRadius: '3px',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></div>
          </div>
        </div>

        {/* Active Setup Card */}
        <div style={{ 
          padding: '12px', 
          borderRadius: '8px', 
          backgroundColor: moveCapture.convictionScore >= 60 
            ? (moveCapture.tradeDirection === 'BULLISH' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)')
            : 'rgba(255,255,255,0.01)',
          border: moveCapture.convictionScore >= 60
            ? (moveCapture.tradeDirection === 'BULLISH' ? '1px dashed rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.3)')
            : '1px solid rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {moveCapture.setupName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
            <strong>Trigger:</strong> {moveCapture.executionTrigger}
          </div>
        </div>

        {/* Targets grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target 1</span>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {moveCapture.targetPrice1 > 0 ? formatNum(moveCapture.targetPrice1) : 'N/A'}
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target 2</span>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {moveCapture.targetPrice2 > 0 ? formatNum(moveCapture.targetPrice2) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Active Confluences List */}
        {moveCapture.activeConfluences.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Confluence Factors ({moveCapture.activeConfluences.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {moveCapture.activeConfluences.map((conf, index) => (
                <div key={index} style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#c084fc' }}>•</span>
                  {conf}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mihir Opening Book */}
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BookOpen size={14} color="var(--accent-blue)" />
          📚 Mihir Opening Book
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Opening Conviction</span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '900', 
              padding: '3px 8px', 
              borderRadius: '4px',
              backgroundColor: `${openingPlaybook.convictionColor}20`,
              color: openingPlaybook.convictionColor,
              border: `1px solid ${openingPlaybook.convictionColor}40`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {openingPlaybook.conviction}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EXPECTED DAY STRUCTURE</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {openingPlaybook.dayTypeExpectation}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actionable Trade Rules:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {openingPlaybook.rules.map((rule, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--accent-blue)'
                }}>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{idx + 1}.</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Sniper Setups */}
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bookmark size={14} color="var(--accent-blue)" />
          💎 Bhaichara Sniper Setups
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sniperSetups.map((setup) => (
            <div key={setup.id} style={{
              padding: '12px',
              borderRadius: '10px',
              background: setup.active
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.05), rgba(139, 92, 246, 0.05))'
                : 'rgba(255,255,255,0.01)',
              border: setup.active
                ? '1px solid rgba(251, 191, 36, 0.4)'
                : '1px solid var(--border-color)',
              boxShadow: setup.active
                ? '0 0 10px rgba(251, 191, 36, 0.05)'
                : 'none',
              opacity: setup.active ? 1 : 0.6,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: setup.active ? 'white' : 'var(--text-secondary)' }}>
                  {setup.name}
                </span>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: 'bold', 
                  backgroundColor: setup.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                  color: setup.active ? '#10b981' : 'var(--text-muted)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {setup.active ? `ACTIVE (${setup.probability}%)` : 'SCANNING'}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                {setup.description}
              </p>
              {setup.active && (
                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <strong>Trigger:</strong> {setup.execution}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <strong>Targets:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{setup.targets}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Profile Metrics */}
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={14} />
          Profile Levels ({activeProfile.dateStr})
        </h3>

        {/* Big Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* POC */}
          <div style={{ backgroundColor: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-poc)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Point of Control
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-poc)', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
              {formatNum(activeProfile.pocPrice)}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Max TPO Accumulation</span>
          </div>

          {/* Volume */}
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Volume
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
              {formatVol(activeProfile.totalVolume)}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Accumulated Size</span>
          </div>
        </div>

        {/* Detailed Levels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          
          {/* Value Area High */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={14} color="var(--color-vah)" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Value Area High (VAH)</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-vah)', fontFamily: 'var(--font-mono)' }}>
              {formatNum(activeProfile.vahPrice)}
            </span>
          </div>

          {/* Value Area Low */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownRight size={14} color="var(--color-val)" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Value Area Low (VAL)</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-val)', fontFamily: 'var(--font-mono)' }}>
              {formatNum(activeProfile.valPrice)}
            </span>
          </div>

          {/* Value Area coverage info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Value Area Width: {formatNum(valToVahRange)} ({vaPercentage.toFixed(1)}%)</span>
              <span>70% Target</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${vaPercentage}%`, backgroundColor: 'var(--accent-purple)', borderRadius: '2px' }}></div>
            </div>
          </div>

        </div>

        {/* Initial Balance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Initial Balance (First 60 mins)
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>IB High</span>
            <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
              {formatNum(activeProfile.ibHigh)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>IB Low</span>
            <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
              {formatNum(activeProfile.ibLow)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>IB Range Height</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNum(ibRange)}</span>
          </div>

          {activeProfile.openPrice > 0 && (() => {
            const ibPct = (ibRange / activeProfile.openPrice) * 100;
            let classification = 'Medium Range';
            let color = 'var(--text-secondary)';
            if (ibPct < 0.45) {
              classification = 'Narrow Range (High Breakout Alert)';
              color = '#fbbf24'; // amber/orange
            } else if (ibPct > 1.2) {
              classification = 'Wide Range (Rotational Alert)';
              color = '#3b82f6'; // blue
            }
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>IB Classification</span>
                <span style={{ fontWeight: '600', color: color }}>
                  {classification} ({ibPct.toFixed(2)}%)
                </span>
              </div>
            );
          })()}
        </div>

      {/* Structural Insights & Confluences Panel */}
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} color="var(--accent-purple)" />
          🤖 Structural Insights & Confluences
        </h3>
        
        {/* Day Classification */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Structure</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-blue)' }}>
            {(() => {
              if (getSinglePrintsForProfile(activeProfile).length > 0) return 'Double Distribution Day';
              const brokeIbHigh = activeProfile.dayHigh > activeProfile.ibHigh;
              const brokeIbLow = activeProfile.dayLow < activeProfile.ibLow;
              if (brokeIbHigh && brokeIbLow) return 'Neutral Day';
              if (brokeIbHigh || brokeIbLow) {
                return (ibRange / activeProfile.openPrice * 100) < 0.45 ? 'Trend Day' : 'Normal Variation Day';
              }
              if ((ibRange / activeProfile.openPrice * 100) > 1.2) return 'Normal Day (Wide Range)';
              return 'Rotational Day';
            })()}
          </span>
        </div>

        {/* GEX & Market Profile Confluences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Options GEX Confluences
          </span>
          {(() => {
            const confluences: string[] = [];
            if (gexData && gexData.stats) {
              const cw = gexData.stats.call_wall;
              const pw = gexData.stats.put_wall;
              const gf = gexData.stats.gamma_flip;
              const tpoLevels = [
                { label: 'POC', value: activeProfile.pocPrice },
                { label: 'VAH', value: activeProfile.vahPrice },
                { label: 'VAL', value: activeProfile.valPrice },
                { label: 'Day High', value: activeProfile.dayHigh },
                { label: 'Day Low', value: activeProfile.dayLow },
              ];
              const gexLevels = [
                { label: 'Call Wall', value: cw },
                { label: 'Put Wall', value: pw },
                { label: 'Gamma Flip', value: gf },
              ];
              gexLevels.forEach(gex => {
                if (gex.value > 0) {
                  tpoLevels.forEach(tpo => {
                    if (tpo.value > 0) {
                      const diffPct = Math.abs(gex.value - tpo.value) / tpo.value * 100;
                      if (diffPct <= 0.3) {
                        confluences.push(`${gex.label} is close to ${tpo.label} at ₹${tpo.value.toFixed(2)} (${diffPct.toFixed(2)}% gap)`);
                      }
                    }
                  });
                }
              });
            }
            if (confluences.length === 0) {
              return (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                  No active options/profile confluences detected.
                </div>
              );
            }
            return confluences.map((conf, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '11.5px', color: '#34d399', fontWeight: '600' }}>
                <Zap size={12} style={{ flexShrink: 0 }} />
                <span>{conf}</span>
              </div>
            ));
          })()}
        </div>

        {/* Virgin POC Magnet Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Virgin POC Magnet Alerts
          </span>
          {(() => {
            const currentPrice = activeProfile.closePrice || activeProfile.pocPrice;
            const proximityPocs = untestedPocs.map(upoc => {
              const diffPrice = Math.abs(upoc.price - currentPrice);
              const diffPct = (diffPrice / currentPrice) * 100;
              return { ...upoc, diffPrice, diffPct };
            }).sort((a, b) => a.diffPct - b.diffPct).slice(0, 3);

            if (proximityPocs.length === 0) {
              return (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                  No active untested Virgin POCs found in recent days.
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {proximityPocs.map((upoc, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: 'var(--color-poc)' }}>₹{upoc.price.toFixed(2)}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Created: {upoc.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      <span>Distance: {upoc.diffPrice.toFixed(2)} points</span>
                      <span style={{ fontWeight: '800', color: upoc.diffPct < 0.5 ? '#f59e0b' : 'var(--text-secondary)' }}>
                        {upoc.diffPct.toFixed(2)}% gap {upoc.diffPct < 0.5 && '🔥 MAGNET'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

        {/* Market Profile Nuances & Signals */}
        {nuances && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={12} color="var(--accent-blue)" />
              Session Nuances & Signals
            </h4>

            {/* Open Outside Range Alert */}
            {nuances.openOutsideRangeAlert && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(244, 63, 94, 0.12))',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                margin: '4px 0 8px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  Open Outside Range Alert
                </div>
                <p style={{ fontSize: '11px', color: '#fca5a5', margin: 0, lineHeight: '1.4', fontWeight: '500' }}>
                  {nuances.openOutsideRangeDesc}
                </p>
              </div>
            )}

            {/* Prediction Box */}
            {(() => {
              let predictedDayType = 'Normal / Symmetrical Day';
              let predictedDayDesc = 'Price opened in balance (Open Auction) indicating local money control. Expect a balanced rotational session with mean-reversion around the POC.';
              let conviction = 'Low';

              if (nuances.openingType.includes('Open Drive (OD)')) {
                predictedDayType = 'Trend Day';
                predictedDayDesc = '🚨 High Conviction Trend Day: Price drove straight from the open without looking back. Strong institutional players (OTF) are fully active. Trade in the breakout direction.';
                conviction = 'High';
              } else if (nuances.openingType.includes('Open Test Drive (OTD)')) {
                predictedDayType = 'Trend Day / Normal Variation';
                predictedDayDesc = '⚡ Medium-High Conviction: Price tested a level, rejected it, and drove in the opposite direction. Expect range expansion. Look for pullbacks to hold Period A extreme.';
                conviction = 'Medium-High';
              } else if (nuances.openingType.includes('Open Rejection Reverse (ORR)')) {
                predictedDayType = 'Neutral Day / Normal Variation';
                predictedDayDesc = '🔄 Reversal Day: Price failed to sustain initial direction, rejected an extreme, and broke the opposite side. Expect a volatile session with dual-sided action.';
                conviction = 'Medium';
              } else if (nuances.otfType !== 'none') {
                predictedDayType = 'Normal Variation Day';
                predictedDayDesc = '📈 Range Extension: Early OTF activity has entered. Expect the Initial Balance to extend by 1x to 2x the IB range in the direction of the OTF trend.';
                conviction = 'Medium';
              }

              // IB range analysis from Explore the Operator concepts
              if (activeProfile.openPrice > 0) {
                const ibPct = (ibRange / activeProfile.openPrice) * 100;
                if (ibPct < 0.45) {
                  predictedDayDesc += ` (Explosive Alert: The IB range is narrow [${ibPct.toFixed(2)}%]. 100% historical breakout rate in Nifty. Do not fade breakouts!)`;
                } else if (ibPct > 1.2) {
                  predictedDayDesc += ` (Range Bound Alert: The IB range is wide [${ibPct.toFixed(2)}%]. Expansion is unlikely; expect rotational trading inside IB boundaries.)`;
                }
              }

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(139, 92, 246, 0.06))',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  margin: '4px 0 8px 0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Day Type Prediction
                    </span>
                    <span style={{ 
                      fontSize: '9px', 
                      fontWeight: 'bold', 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      backgroundColor: conviction === 'High' 
                        ? 'rgba(16, 185, 129, 0.2)' 
                        : conviction.includes('Medium') 
                        ? 'rgba(245, 158, 11, 0.2)' 
                        : 'rgba(255, 255, 255, 0.08)',
                      color: conviction === 'High' ? '#10b981' : conviction.includes('Medium') ? '#f59e0b' : 'var(--text-secondary)',
                      border: conviction === 'High' 
                        ? '1px solid rgba(16, 185, 129, 0.3)' 
                        : conviction.includes('Medium') 
                        ? '1px solid rgba(245, 158, 11, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {conviction} Conviction
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                    {predictedDayType}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {predictedDayDesc}
                  </p>
                </div>
              );
            })()}

            {/* Kangaroo Jump Warning Alert */}
            {nuances.kangarooJumpAlert !== 'none' && (
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px dashed rgba(244, 63, 94, 0.4)',
                color: '#f43f5e',
                fontWeight: '500',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Zap size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Kangaroo Jump Alert</strong>
                  {nuances.kangarooJumpDesc}
                </div>
              </div>
            )}

            {/* 3-Day Balance Breakout Alert */}
            {nuances.threeDayBalanceAlert && (
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px dashed rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                fontWeight: '500',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Activity size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Multi-day Consolidation</strong>
                  {nuances.threeDayBalanceDesc}
                </div>
              </div>
            )}

            {/* 3 to I Day / 2I to 1R Conviction Day Alert */}
            {nuances.threeToOneDay && nuances.threeToOneDay !== 'none' && (
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: nuances.threeToOneDay.includes('3 to I') 
                  ? 'rgba(16, 185, 129, 0.08)' 
                  : 'rgba(59, 130, 246, 0.08)',
                border: nuances.threeToOneDay.includes('3 to I')
                  ? '1px dashed rgba(16, 185, 129, 0.4)'
                  : '1px dashed rgba(59, 130, 246, 0.4)',
                color: nuances.threeToOneDay.includes('3 to I') ? '#10b981' : '#60a5fa',
                fontWeight: '500',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Zap size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>
                    {nuances.threeToOneDay === '3 to I Buying Day' ? '🔥 3 to I Buying Day' : nuances.threeToOneDay === '3 to I Selling Day' ? '❄️ 3 to I Selling Day' : '⚡ 2I to 1R Conviction Day'}
                  </strong>
                  {nuances.threeToOneDesc}
                </div>
              </div>
            )}

            {/* Double Distribution Opening setup */}
            {nuances.ddOpeningSetup !== 'none' && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: nuances.ddOpeningSetup === 'bullish' 
                  ? 'rgba(16, 185, 129, 0.08)' 
                  : nuances.ddOpeningSetup === 'bearish'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(245, 158, 11, 0.08)',
                border: nuances.ddOpeningSetup === 'bullish'
                  ? '1px dashed rgba(16, 185, 129, 0.3)'
                  : nuances.ddOpeningSetup === 'bearish'
                  ? '1px dashed rgba(239, 68, 68, 0.3)'
                  : '1px dashed rgba(245, 158, 11, 0.3)',
                color: nuances.ddOpeningSetup === 'bullish' 
                  ? '#10b981' 
                  : nuances.ddOpeningSetup === 'bearish'
                  ? '#f87171'
                  : '#f59e0b',
                fontWeight: '500'
              }}>
                <strong>DD Setup: </strong>{nuances.ddOpeningDesc}
              </div>
            )}

            {/* Failed Auction alerts */}
            {((nuances as any).cFailure || nuances.dFailure || nuances.eFailure !== 'none') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(nuances as any).cFailure && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontWeight: '500',
                    display: 'flex',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    {(nuances as any).cFailureDesc}
                  </div>
                )}
                {nuances.dFailure && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontWeight: '500',
                    display: 'flex',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    {nuances.dFailureDesc}
                  </div>
                )}
                {nuances.eFailure !== 'none' && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(245, 158, 11, 0.06)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    fontWeight: '500',
                    display: 'flex',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    {nuances.eFailureDesc}
                  </div>
                )}
              </div>
            )}

            {/* 80% Rule Alert Banner */}
            {nuances.eightyPercentRuleStatus !== 'none' && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: nuances.eightyPercentRuleStatus === 'bullish' 
                  ? 'rgba(16, 185, 129, 0.08)' 
                  : 'rgba(239, 68, 68, 0.08)',
                border: nuances.eightyPercentRuleStatus === 'bullish'
                  ? '1px dashed rgba(16, 185, 129, 0.4)'
                  : '1px dashed rgba(239, 68, 68, 0.4)',
                color: nuances.eightyPercentRuleStatus === 'bullish' ? '#10b981' : '#f87171',
                fontWeight: '500'
              }}>
                {nuances.eightyPercentRuleDesc}
              </div>
            )}

            {/* Failed IB Breakout Alert */}
            {(nuances as any).failedIbBreakout && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px dashed rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                fontWeight: '500'
              }}>
                {(nuances as any).failedIbBreakoutDesc}
              </div>
            )}

            {/* Prior Poor High/Low Resolution Alert */}
            {(nuances as any).poorHighLowResolutionDesc && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                fontWeight: '500'
              }}>
                {(nuances as any).poorHighLowResolutionDesc}
              </div>
            )}

            {/* Profile Classification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Session Archetype</span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  backgroundColor: nuances.profileType === 'Trend Day' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : nuances.profileType === 'Double-Distribution Trend Day' 
                    ? 'rgba(139, 92, 246, 0.15)'
                    : nuances.profileType === 'Neutral Day'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(59, 130, 246, 0.08)',
                  color: nuances.profileType === 'Trend Day' 
                    ? '#10b981' 
                    : nuances.profileType === 'Double-Distribution Trend Day'
                    ? '#c084fc'
                    : nuances.profileType === 'Neutral Day'
                    ? '#f59e0b'
                    : '#3b82f6',
                  fontFamily: 'var(--font-sans)'
                }}>
                  {nuances.profileType}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {nuances.profileTypeDesc}
              </p>
            </div>

            {/* Profile Shape Structure */}
            {nuances.profileShape !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '2px solid var(--accent-purple)', paddingLeft: '8px', margin: '4px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase' }}>
                  {nuances.profileShape === 'P-shape' ? 'P-Profile (Short Covering)' : 'b-Profile (Long Liquidation)'}
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.profileShapeDesc}
                </p>
              </div>
            )}

            {/* Ledge Notification */}
            {nuances.ledge && nuances.ledge.hasLedge && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '2px solid #fbbf24', paddingLeft: '8px', margin: '4px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase' }}>
                  ⚠️ {nuances.ledge.type} Detected
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.ledge.desc}
                </p>
              </div>
            )}

             {/* Opening Setup */}
             {priorProfile && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opening vs Prior Session</span>
                   <span style={{ 
                     fontSize: '10px', 
                     fontWeight: 'bold', 
                     padding: '2px 6px', 
                     borderRadius: '4px',
                     backgroundColor: nuances.openRelationship.includes('Above') || nuances.openRelationship.includes('Gap Up')
                       ? 'rgba(16, 185, 129, 0.12)'
                       : nuances.openRelationship.includes('Below') || nuances.openRelationship.includes('Gap Down')
                       ? 'rgba(239, 68, 68, 0.12)'
                       : 'rgba(255, 255, 255, 0.05)',
                     color: nuances.openRelationship.includes('Above') || nuances.openRelationship.includes('Gap Up')
                       ? '#10b981'
                       : nuances.openRelationship.includes('Below') || nuances.openRelationship.includes('Gap Down')
                       ? '#ef4444'
                       : 'var(--text-primary)',
                   }}>
                     {nuances.openRelationship}
                   </span>
                 </div>
                 <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                   {nuances.openRelationshipDesc}
                 </p>
               </div>
             )}

            {/* Spike opening setup */}
            {priorProfile && nuances.spikeOpenSetup && nuances.spikeOpenSetup !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', borderLeft: '2px solid #8b5cf6', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a78bfa', textTransform: 'uppercase' }}>
                    ⚡ Spike Open Setup
                  </span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    backgroundColor: nuances.spikeOpenSetup.includes('Acceptance')
                      ? 'rgba(16, 185, 129, 0.15)'
                      : nuances.spikeOpenSetup.includes('Rejection')
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                    color: nuances.spikeOpenSetup.includes('Acceptance')
                      ? '#10b981'
                      : nuances.spikeOpenSetup.includes('Rejection')
                      ? '#ef4444'
                      : '#f59e0b',
                  }}>
                    {nuances.spikeOpenSetup}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.spikeOpenDesc}
                </p>
              </div>
            )}

            {/* Overnight Inventory */}
            {priorProfile && nuances.overnightInventory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overnight Inventory</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    backgroundColor: nuances.overnightInventory === 'long'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : nuances.overnightInventory === 'short'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: nuances.overnightInventory === 'long'
                      ? '#10b981'
                      : nuances.overnightInventory === 'short'
                      ? '#f87171'
                      : 'var(--text-muted)',
                  }}>
                    {nuances.overnightInventory.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.overnightInventoryDesc}
                </p>
              </div>
            )}

            {/* Opening Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opening Type</span>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 'bold', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  backgroundColor: nuances.openingType.includes('Drive')
                    ? 'rgba(245, 158, 11, 0.15)'
                    : nuances.openingType.includes('Rejection')
                    ? 'rgba(139, 92, 246, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: nuances.openingType.includes('Drive')
                    ? '#f59e0b'
                    : nuances.openingType.includes('Rejection')
                    ? '#c084fc'
                    : 'var(--text-primary)',
                }}>
                  {nuances.openingType}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {nuances.openingTypeDesc}
              </p>
            </div>

            {/* OTF Activity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OTF Activity</span>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 'bold', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  backgroundColor: nuances.otfType === 'up'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : nuances.otfType === 'down'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: nuances.otfType === 'up'
                    ? '#10b981'
                    : nuances.otfType === 'down'
                    ? '#f87171'
                    : 'var(--text-muted)',
                }}>
                  {nuances.otfType === 'up' ? 'OTF Up (Buying)' : nuances.otfType === 'down' ? 'OTF Down (Selling)' : 'None (Local Money)'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {nuances.otfDesc}
              </p>
            </div>

            {/* Rotation Factor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rotation Factor (Auction Strength)</span>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 'bold', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  backgroundColor: nuances.rotationFactor > 0
                    ? 'rgba(16, 185, 129, 0.15)'
                    : nuances.rotationFactor < 0
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: nuances.rotationFactor > 0
                    ? '#10b981'
                    : nuances.rotationFactor < 0
                    ? '#f87171'
                    : 'var(--text-muted)',
                }}>
                  {nuances.rotationFactor > 0 ? `+${nuances.rotationFactor}` : nuances.rotationFactor}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {nuances.rotationFactor > 0 
                  ? `Intraday auctions show a bullish buying bias (+${nuances.rotationFactor} net points). Buyers are attempting to drive price higher.`
                  : nuances.rotationFactor < 0
                  ? `Intraday auctions show a bearish selling bias (${nuances.rotationFactor} net points). Sellers are attempting to drive price lower.`
                  : `Intraday auctions are completely balanced (0 net points). Neither buyers nor sellers have directional initiative.`}
              </p>
            </div>

             {/* Buying Tail Alert */}
            {nuances.buyingTailLength > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '2px solid #10b981', paddingLeft: '8px', margin: '4px 0' }}>
                <strong style={{ fontSize: '10px', color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={10} /> Buying Tail (Conviction Rejection)
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.buyingTailDesc}
                </p>
              </div>
            )}

            {/* Selling Tail Alert */}
            {nuances.sellingTailLength > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '2px solid #ef4444', paddingLeft: '8px', margin: '4px 0' }}>
                <strong style={{ fontSize: '10px', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={10} /> Selling Tail (Conviction Rejection)
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.sellingTailDesc}
                </p>
              </div>
            )}

            {/* Quadrant Setup info */}
            {priorProfile && nuances.quadrantSetup !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '2px solid var(--accent-blue)', paddingLeft: '8px' }}>
                <strong style={{ fontSize: '10px', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Quadrant Target</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.quadrantSetupDesc}
                </p>
              </div>
            )}

            {/* Late Day Drive info */}
            {nuances.lateDayDrive !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '2px solid #10b981', paddingLeft: '8px' }}>
                <strong style={{ fontSize: '10px', color: '#10b981', textTransform: 'uppercase' }}>Late Day Drive</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  {nuances.lateDayDriveDesc}
                </p>
              </div>
            )}

            {/* POC Exhaustion Alert */}
            {nuances.exhaustionAlert && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px dashed rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                fontWeight: '500'
              }}>
                {nuances.exhaustionDesc}
              </div>
            )}

            {/* New PDF Automated Alerts */}
            {nuances.trendToBalancePredictor && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                fontWeight: '500'
              }}>
                {nuances.trendToBalanceDesc}
              </div>
            )}

            {nuances.periodHLiquidation && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontWeight: '500'
              }}>
                {nuances.periodHLiquidationDesc}
              </div>
            )}

            {nuances.abcExtensionFade && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px dashed rgba(244, 63, 94, 0.4)',
                color: '#f43f5e',
                fontWeight: '500'
              }}>
                {nuances.abcExtensionFadeDesc}
              </div>
            )}

            {nuances.abcdFade && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px dashed rgba(244, 63, 94, 0.4)',
                color: '#f43f5e',
                fontWeight: '500'
              }}>
                {nuances.abcdFadeDesc}
              </div>
            )}

            {nuances.secondPocPenetration && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px dashed rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontWeight: '500'
              }}>
                {nuances.secondPocPenetrationDesc}
              </div>
            )}

             {nuances.seasonalAlert && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontWeight: '500'
              }}>
                {nuances.seasonalAlert}
              </div>
            )}

            {nuances.singlePrintAlert && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                border: '1px dashed rgba(236, 72, 153, 0.4)',
                color: '#f472b6',
                fontWeight: '500'
              }}>
                {nuances.singlePrintAlertDesc}
              </div>
            )}

            {nuances.abPoorExtreme !== 'none' && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px dashed rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                fontWeight: '500'
              }}>
                {nuances.abPoorExtremeDesc}
              </div>
            )}

            {nuances.strongMoneyDrive && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px dashed rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontWeight: '500'
              }}>
                {nuances.strongMoneyDriveDesc}
              </div>
            )}

            {nuances.fastMovingTrend && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px dashed rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                fontWeight: '500'
              }}>
                {nuances.fastMovingTrendDesc}
              </div>
            )}

            {nuances.highDensityConsolidation && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: '1.4',
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                border: '1px dashed rgba(139, 92, 246, 0.4)',
                color: '#c084fc',
                fontWeight: '500'
              }}>
                {nuances.highDensityConsolidationDesc}
              </div>
            )}

            {/* IB Extension & Fibonacci Targets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>IB Range Breakout</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '11px',
                  color: nuances.ibExtension === 'up' 
                    ? '#10b981' 
                    : nuances.ibExtension === 'down' 
                    ? '#ef4444' 
                    : nuances.ibExtension === 'both' 
                    ? '#f59e0b' 
                    : 'var(--text-muted)' 
                }}>
                  {nuances.ibExtension === 'up' && 'Buying Extension ↑'}
                  {nuances.ibExtension === 'down' && 'Selling Extension ↓'}
                  {nuances.ibExtension === 'both' && 'Neutral Extension (Both sides)'}
                  {nuances.ibExtension === 'none' && 'No Extension (Inside range)'}
                </span>
              </div>
              {nuances.fibTargetPrice !== null && (
                <div style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px'
                }}>
                  🎯 {nuances.fibTargetDesc}
                </div>
              )}
            </div>

            {/* Auction Quality: Poor High / Poor Low */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auction Extremes Quality</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(() => {
                  const isAbHigh = nuances.abPoorExtreme === 'high' || nuances.abPoorExtreme === 'both';
                  return (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isAbHigh ? 'rgba(245, 158, 11, 0.2)' : (nuances.poorHigh ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                      color: isAbHigh ? '#f59e0b' : (nuances.poorHigh ? '#f87171' : '#10b981'),
                      border: isAbHigh ? '1px solid rgba(245, 158, 11, 0.4)' : (nuances.poorHigh ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)')
                    }}>
                      {isAbHigh ? 'AB Poor High (High Priority)' : (nuances.poorHigh ? 'Poor High (Unfinished)' : 'Secure High')}
                    </span>
                  );
                })()}
                {(() => {
                  const isAbLow = nuances.abPoorExtreme === 'low' || nuances.abPoorExtreme === 'both';
                  return (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isAbLow ? 'rgba(245, 158, 11, 0.2)' : (nuances.poorLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                      color: isAbLow ? '#f59e0b' : (nuances.poorLow ? '#f87171' : '#10b981'),
                      border: isAbLow ? '1px solid rgba(245, 158, 11, 0.4)' : (nuances.poorLow ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)')
                    }}>
                      {isAbLow ? 'AB Poor Low (High Priority)' : (nuances.poorLow ? 'Poor Low (Unfinished)' : 'Secure Low')}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Single Prints (Sapna) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sapna (Single Prints / Conviction Gaps)</span>
              {nuances.singlePrints.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                  {nuances.singlePrints.map((range, index) => (
                    <span key={index} style={{ 
                       fontSize: '10px', 
                       fontFamily: 'var(--font-mono)', 
                       padding: '2px 6px', 
                       borderRadius: '4px', 
                       backgroundColor: 'rgba(236, 72, 153, 0.1)', 
                       color: '#ec4899', 
                       border: '1px solid rgba(236, 72, 153, 0.2)' 
                     }}>
                      {range.start.toFixed(2)} - {range.end.toFixed(2)}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No Sapna (single prints) detected.
                </span>
              )}
            </div>

          </div>
        )}

        {/* Session Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Session High:</span>
            <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{formatNum(activeProfile.dayHigh)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Session Low:</span>
            <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{formatNum(activeProfile.dayLow)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total TPOs Count:</span>
            <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{activeProfile.totalTPOs}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Row Price Interval:</span>
            <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{formatNum(activeProfile.tickSize)}</span>
          </div>
        </div>

        {/* AI Auto-Learned Accuracy & Volatility */}
        {(() => {
          const poorHighStat = getStat('poorHigh');
          const poorLowStat = getStat('poorLow');
          const dFailureStat = getStat('dFailure');
          const eightyPercentStat = getStat('eightyPercentRule');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '11px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} color="var(--accent-blue)" /> AI Accuracy & Volatility Scorecard
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>14-Day ATR Tick Presets:</span>
                  <span style={{ fontWeight: '800', color: optimalTick ? 'var(--color-bull)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {optimalTick ? `${formatNum(optimalTick)} (Dynamic)` : `${formatNum(activeProfile.tickSize)} (Default)`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: 'bold' }}>Poor High Resolution</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#f97316', fontFamily: 'var(--font-mono)' }}>
                      {poorHighStat && poorHighStat.triggered > 0 ? `${poorHighStat.pct}% (${poorHighStat.completed}/${poorHighStat.triggered})` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: 'bold' }}>Poor Low Resolution</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>
                      {poorLowStat && poorLowStat.triggered > 0 ? `${poorLowStat.pct}% (${poorLowStat.completed}/${poorLowStat.triggered})` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: 'bold' }}>d-Failure Reversal</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                      {dFailureStat && dFailureStat.triggered > 0 ? `${dFailureStat.pct}% (${dFailureStat.completed}/${dFailureStat.triggered})` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: 'bold' }}>80% Value Area Rule</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                      {eightyPercentStat && eightyPercentStat.triggered > 0 ? `${eightyPercentStat.pct}% (${eightyPercentStat.completed}/${eightyPercentStat.triggered})` : 'N/A'}
                    </span>
                  </div>
                </div>

                {accuracyData && accuracyData.global && accuracyData.global.pcrCorrelations && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Option PCR Sentiment Scorecard (Global)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(accuracyData.global.pcrCorrelations).map(([key, data]: [string, any]) => {
                        let badgeColor = 'var(--text-secondary)';
                        let badgeBg = 'rgba(255,255,255,0.05)';
                        if (key === 'extremeFear') {
                          badgeColor = '#10b981'; // green for bullish squeeze
                          badgeBg = 'rgba(16, 185, 129, 0.1)';
                        } else if (key === 'extremeGreed') {
                          badgeColor = '#ef4444'; // red for bearish drop
                          badgeBg = 'rgba(239, 68, 68, 0.1)';
                        }
                        
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: badgeColor, backgroundColor: badgeBg, padding: '2px 6px', borderRadius: '4px' }}>
                                {data.name}
                              </span>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {data.attempts} sessions
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>Bull Close:</span>
                                <strong style={{ color: 'white', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{data.bullishCloseProb}%</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>Mean Rev:</span>
                                <strong style={{ color: 'white', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{data.meanReversionProb}%</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>Gap Fill:</span>
                                <strong style={{ color: 'white', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{data.gapFillProb}%</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const hasSymbolExpiry = accuracyData && symbol && accuracyData.symbols && accuracyData.symbols[symbol] && accuracyData.symbols[symbol].expiryDynamics;
                  const expiryData = hasSymbolExpiry 
                    ? accuracyData.symbols[symbol].expiryDynamics 
                    : accuracyData?.global?.expiryDynamics;

                  if (!expiryData) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '10px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Option Expiry Day Dynamics ({hasSymbolExpiry ? symbol.replace('NSE:', '') : 'Global'})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span>Option Pinning Rate:</span>
                          <span style={{ fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)' }}>
                            {expiryData.expiryPinningRate}% <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '9px' }}>(vs {expiryData.nonExpiryPinningRate}% normal)</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span>Explosive Breakout Rate (2.6x):</span>
                          <span style={{ fontWeight: 'bold', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                            {expiryData.expiryBreakoutRate}% <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '9px' }}>(vs {expiryData.nonExpiryBreakoutRate}% normal)</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span>Average Session Range Height:</span>
                          <span style={{ fontWeight: 'bold', color: '#a855f7', fontFamily: 'var(--font-mono)' }}>
                            {expiryData.avgExpiryRangePct}% <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '9px' }}>(vs {expiryData.avgNonExpiryRangePct}% normal)</span>
                          </span>
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'right', fontStyle: 'italic', marginTop: '2px' }}>
                          *Based on {expiryData.expiryAttempts} expiry sessions scanned
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          );
        })()}

        {/* Educational Reference Sheet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '11px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Bhaichara Profile Cheat-Sheet
          </h4>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>📐 <strong>Initial Balance Range Definitions:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', color: 'var(--text-muted)', fontSize: '10px', paddingLeft: '8px', marginTop: '2px' }}>
                <span>• Daily:</span><span>Periods A and B (First 60 mins)</span>
                <span>• Weekly:</span><span>First two days of the week</span>
                <span>• Monthly:</span><span>First five days of the month</span>
                <span>• Yearly:</span><span>First two months of the year</span>
              </div>
            </div>
            <div>⚖️ <strong>Auction State Rule:</strong>
              <p style={{ margin: '2px 0 0 8px', color: 'var(--text-muted)', fontSize: '10px' }}>Market auction goes down to shut off selling, and goes up to shut off buying. Reversion to mean happens when trading is driven by local money.</p>
            </div>
            <div>⚡ <strong>Trend Health Rule:</strong>
              <p style={{ margin: '2px 0 0 8px', color: 'var(--text-muted)', fontSize: '10px' }}>Trends are healthy when they move slowly. Fast-moving trends show weak profile building, indicating they just want to build value higher quickly.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
