import React, { useState } from 'react';
import { Loader2, AlertTriangle, HelpCircle, BarChart2 } from 'lucide-react';

interface StrikeData {
  strike: number;
  ce_oi: number;
  pe_oi: number;
  ce_vol: number;
  pe_vol: number;
  ce_change: number;
  pe_change: number;
  pcr_oi: number;
  pcr_vol: number;
}

interface PcrHistoryItem {
  time: string;
  oi_pcr: number;
  vol_pcr: number;
  oi_change_pcr: number;
}

interface PcrProfileProps {
  symbol: string;
  expiries: string[];
  selectedExpiry: string;
  onExpiryChange: (expiry: string) => void;
  pcrData: {
    spot: number;
    symbol: string;
    expiry: string;
    oi_pcr: number;
    vol_pcr: number;
    oi_change_pcr: number;
    totals: {
      ce_oi: number;
      pe_oi: number;
      ce_vol: number;
      pe_vol: number;
      ce_change: number;
      pe_change: number;
    };
    history: PcrHistoryItem[];
    strikes: StrikeData[];
  } | null;
  loading: boolean;
}

export const PcrProfile: React.FC<PcrProfileProps> = ({
  symbol,
  expiries,
  selectedExpiry,
  onExpiryChange,
  pcrData,
  loading
}) => {

  const [activeChartTab, setActiveChartTab] = useState<'pcr-trend' | 'atm-volume'>('pcr-trend');

  const chartTabStyle = (tab: typeof activeChartTab) => ({
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700' as const,
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: activeChartTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    border: 'none',
    color: activeChartTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)',
    transition: 'all 0.15s ease'
  });

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} Lk`;
    return num.toLocaleString();
  };

  // Generate dynamic contrarian text based on Open Interest PCR
  const getPcrExplanation = (pcr: number) => {
    if (pcr <= 0.55) {
      return {
        title: "Extreme Greed / Overbought Reversal Alert",
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.05)",
        border: "rgba(239, 68, 68, 0.2)",
        text: "The PCR is at an extremely low level, indicating option buyers are heavily loaded with Calls. Historically, this represents excessive greed and retail over-optimism. Option sellers are likely building heavy resistance at upper strikes. Watch for exhaustion at highs and a potential corrective down-move (Short-Covering failure)."
      };
    } else if (pcr <= 0.75) {
      return {
        title: "Bullish Sentiment (Retail Greed)",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.05)",
        border: "rgba(245, 158, 11, 0.2)",
        text: "Options activity favors calls. The market has an upward bias, supported by put writing at lower strikes. Monitor the 80% Value Area Rule for upside migration, but check if the PCR is starting to cluster in the overbought zone."
      };
    } else if (pcr <= 1.05) {
      return {
        title: "Balanced / Neutral Market Range",
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.05)",
        border: "rgba(59, 130, 246, 0.2)",
        text: "The Put-Call Ratio is near equilibrium (~1.0). Bullish and bearish option exposures are evenly balanced. This typically aligns with bracketed trading sessions or consolidated balance profiles. Watch for breakouts out of the Initial Balance (IB) range to trigger directional conviction."
      };
    } else if (pcr <= 1.35) {
      return {
        title: "Bearish Sentiment (Retail Fear)",
        color: "#a855f7",
        bg: "rgba(168, 85, 247, 0.05)",
        border: "rgba(168, 85, 247, 0.2)",
        text: "Puts outnumber calls. Retail traders are buying protective put options. The overall index trend remains under downward pressure, but call writers are active at highs. Watch if the market accepts value below yesterday's VAL."
      };
    } else {
      return {
        title: "Extreme Fear / Oversold Bottom Reversal Alert",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.05)",
        border: "rgba(16, 185, 129, 0.2)",
        text: "The PCR is exceptionally high, indicating extreme retail panic and massive put options accumulation. Option writers (institutions) have sold significant puts at these lows to absorb the sell-off. Watch for any minor upward trigger to spark a violent short-covering squeeze rally."
      };
    }
  };

  const explanation = pcrData ? getPcrExplanation(pcrData.oi_pcr) : null;

  // Custom SVG line chart renderer for intraday PCR trend
  const renderSvgChart = (history: PcrHistoryItem[]) => {
    if (history.length < 2) return null;

    const width = 600;
    const height = 180;
    const padding = 30;

    // Find min and max PCR values in history
    const allValues = history.flatMap(h => [h.oi_pcr, h.vol_pcr, h.oi_change_pcr]);
    const maxVal = Math.max(...allValues, 1.5);
    const minVal = Math.min(...allValues, 0.5);
    const valRange = maxVal - minVal;

    const getX = (index: number) => padding + (index / (history.length - 1)) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    // Generate path strings
    const getPathData = (key: 'oi_pcr' | 'vol_pcr' | 'oi_change_pcr') => {
      return history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(h[key])}`).join(' ');
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0.6, 0.8, 1.0, 1.2, 1.4].map((gridVal, i) => {
          if (gridVal >= minVal && gridVal <= maxVal) {
            const y = getY(gridVal);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="3,3" />
                <text x={padding - 8} y={y + 4} fill="var(--text-secondary)" fontSize={9} textAnchor="end">{gridVal.toFixed(1)}</text>
              </g>
            );
          }
          return null;
        })}

        {/* X axis times */}
        {history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 5)) === 0).map((h, i) => {
          const idx = history.indexOf(h);
          const x = getX(idx);
          return (
            <text key={i} x={x} y={height - 8} fill="var(--text-secondary)" fontSize={9} textAnchor="middle">{h.time}</text>
          );
        })}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border-color)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" />

        {/* Line paths */}
        <path d={getPathData('oi_pcr')} fill="none" stroke="var(--accent-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPathData('vol_pcr')} fill="none" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPathData('oi_change_pcr')} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderAtmVolumeChart = (history: PcrHistoryItem[]) => {
    if (history.length < 2) return null;

    const width = 600;
    const height = 180;
    const padding = 35;

    // Filter out history entries that don't have ATM data
    const validHistory = history.filter(h => (h as any).atm_ce_vol !== undefined);
    if (validHistory.length < 2) {
      return (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
          Collecting ATM volume data feed... (updates on next refresh)
        </div>
      );
    }

    // Find max ATM volume in history to scale the Y axis
    const maxVal = Math.max(...validHistory.flatMap(h => [(h as any).atm_ce_vol || 0, (h as any).atm_pe_vol || 0]), 1000);
    const minVal = 0;
    const valRange = maxVal - minVal;

    const getX = (index: number) => padding + (index / (validHistory.length - 1)) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    // Generate path strings
    const getPathData = (key: 'atm_ce_vol' | 'atm_pe_vol') => {
      return validHistory.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY((h as any)[key] || 0)}`).join(' ');
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
          const gridVal = maxVal * ratio;
          const y = getY(gridVal);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="3,3" />
              <text x={padding - 8} y={y + 4} fill="var(--text-secondary)" fontSize={8} textAnchor="end">{formatNumber(gridVal)}</text>
            </g>
          );
        })}

        {/* X axis times */}
        {validHistory.filter((_, i) => i % Math.max(1, Math.floor(validHistory.length / 5)) === 0).map((h, i) => {
          const idx = validHistory.indexOf(h);
          const x = getX(idx);
          return (
            <text key={i} x={x} y={height - 8} fill="var(--text-secondary)" fontSize={9} textAnchor="middle">{h.time}</text>
          );
        })}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border-color)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" />

        {/* Line paths */}
        <path d={getPathData('atm_ce_vol')} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPathData('atm_pe_vol')} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)' }}>
      
      {/* Expiry Selector Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={20} color="var(--accent-blue)" />
            Put-Call Ratio (PCR) Analysis
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Intraday Options Writer Positioning & Sentiment tracking for {symbol}
          </p>
        </div>
        
        {expiries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Expiry Date:</span>
            <select
              value={selectedExpiry}
              onChange={(e) => onExpiryChange(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {expiries.map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader2 className="animate-spin" size={28} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Scraping NSE options chain & calculating ratios...</span>
        </div>
      ) : !pcrData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px', color: 'var(--text-secondary)' }}>
          <AlertTriangle size={32} />
          <span style={{ fontSize: '13px' }}>Options Chain data not available for this symbol. Ensure it is a valid NSE derivatives index or stock.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Sentiment Gauges Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Open Interest PCR */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Outstanding Open Interest Put-Call Ratio">
                Total OI PCR (Daily Bias)
                <HelpCircle size={12} />
              </span>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-blue)', textShadow: '0 0 10px rgba(59, 130, 246, 0.2)' }}>
                {pcrData.oi_pcr}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Puts {formatNumber(pcrData.totals.pe_oi)} vs Calls {formatNumber(pcrData.totals.ce_oi)}
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${Math.min(100, (pcrData.oi_pcr / 2) * 100)}%`, height: '100%', background: 'var(--accent-blue)' }} />
              </div>
            </div>

            {/* Traded Volume PCR */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Total traded volume Put-Call Ratio">
                Traded Volume PCR (Intraday activity)
                <HelpCircle size={12} />
              </span>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.2)' }}>
                {pcrData.vol_pcr}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Puts {formatNumber(pcrData.totals.pe_vol)} vs Calls {formatNumber(pcrData.totals.ce_vol)}
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${Math.min(100, (pcrData.vol_pcr / 2) * 100)}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>

            {/* Change in OI PCR */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Put-Call Ratio of intraday open interest changes">
                OI Change PCR (Intraday Writers)
                <HelpCircle size={12} />
              </span>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.2)' }}>
                {pcrData.oi_change_pcr}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Puts {formatNumber(pcrData.totals.pe_change)} vs Calls {formatNumber(pcrData.totals.ce_change)}
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${Math.min(100, (pcrData.oi_change_pcr / 2) * 100)}%`, height: '100%', background: '#f59e0b' }} />
              </div>
            </div>

          </div>

          {/* Contrarian Explanation Panel */}
          {explanation && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: explanation.bg,
              border: `1px solid ${explanation.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: explanation.color, fontSize: '14px' }}>
                <AlertTriangle size={16} />
                {explanation.title}
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                {explanation.text}
              </p>
            </div>
          )}

          {/* Intraday Line Chart & Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Custom SVG Line Chart */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Intraday Trends</span>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setActiveChartTab('pcr-trend')}
                    style={chartTabStyle('pcr-trend')}
                  >
                    PCR Trend
                  </button>
                  <button 
                    onClick={() => setActiveChartTab('atm-volume')}
                    style={chartTabStyle('atm-volume')}
                  >
                    ATM CE vs PE Vol
                  </button>
                </div>
              </div>
              <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pcrData.history.length >= 2 ? (
                  activeChartTab === 'pcr-trend' ? renderSvgChart(pcrData.history) : renderAtmVolumeChart(pcrData.history)
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '40px 0' }}>Accumulating intraday data feed... (updates every 3m)</span>
                )}
              </div>
              {/* Legend */}
              {activeChartTab === 'pcr-trend' ? (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} /> Total OI
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Volume
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Intraday Change
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} /> ATM CE Vol (Calls)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> ATM PE Vol (Puts)
                  </span>
                  {pcrData.history.length > 0 && (pcrData.history[pcrData.history.length - 1] as any).atm_strike && (
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                      (ATM Strike: {(pcrData.history[pcrData.history.length - 1] as any).atm_strike})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Strike Concentration Table */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Strike-wise PCR Concentration (Near Spot: {pcrData.spot.toFixed(1)})</div>
              <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '6px' }}>Strike</th>
                      <th style={{ padding: '6px' }}>Call OI</th>
                      <th style={{ padding: '6px' }}>Put OI</th>
                      <th style={{ padding: '6px' }}>Strike PCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pcrData.strikes.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-secondary)' }}>
                        <td style={{ padding: '6px', fontWeight: '700', color: 'var(--text-primary)' }}>{s.strike}</td>
                        <td style={{ padding: '6px' }}>{formatNumber(s.ce_oi)}</td>
                        <td style={{ padding: '6px' }}>{formatNumber(s.pe_oi)}</td>
                        <td style={{ padding: '6px', fontWeight: '600', color: s.pcr_oi > 1.2 ? '#10b981' : s.pcr_oi < 0.7 ? '#ef4444' : 'var(--text-primary)' }}>{s.pcr_oi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
