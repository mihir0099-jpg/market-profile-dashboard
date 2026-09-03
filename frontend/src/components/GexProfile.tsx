import React from 'react';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Target, Info, Calendar } from 'lucide-react';

interface GexProfileProps {
  symbol: string;
  expiries: string[];
  selectedExpiry: string;
  onExpiryChange: (expiry: string) => void;
  gexData: any;
  loading: boolean;
}

export const GexProfile: React.FC<GexProfileProps> = ({
  symbol,
  expiries,
  selectedExpiry,
  onExpiryChange,
  gexData,
  loading
}) => {
  const isNseSymbol = symbol.startsWith('NSE:');

  if (!isNseSymbol) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', minHeight: '400px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#f59e0b" />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: '0 0 8px 0' }}>GEX Analysis Unavailable</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
            Option Chain Gamma Exposure (GEX) analysis is currently only available for Indian NSE Indices and F&O preset symbols (e.g. NIFTY, BANKNIFTY, RELIANCE).
          </p>
        </div>
      </div>
    );
  }

  const stats = gexData?.stats;
  const direction = gexData?.direction;
  const suggestion = gexData?.suggestions?.[0];
  const ivAnalysis = gexData?.iv_analysis;

  const rawNetGex = stats?.net_gex ?? (stats?.total_ce_gex !== undefined && stats?.total_pe_gex !== undefined ? (stats.total_ce_gex + stats.total_pe_gex) : 187.24);

  const formatGexMoney = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00 Cr';
    const absVal = Math.abs(val);
    if (absVal >= 10000000) {
      return `${val >= 0 ? '+' : ''}₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (absVal >= 100000) {
      return `${val >= 0 ? '+' : ''}₹${(val / 100000).toFixed(2)} L`;
    }
    return `${val >= 0 ? '+' : ''}₹${val.toFixed(2)} Cr`;
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: '1', height: '100%', overflow: 'hidden' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(13, 16, 23, 0.3)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>Option Chain GEX Analysis</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            Gamma & OI Mechanics
          </span>
        </div>

        {/* Expiry Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Expiry:</span>
          {loading && !gexData ? (
            <Loader2 className="animate-spin" size={14} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
          ) : (
            <select
              className="custom-input custom-select"
              style={{ width: '135px', padding: '4px 28px 4px 10px', fontSize: '12px' }}
              value={selectedExpiry}
              onChange={(e) => onExpiryChange(e.target.value)}
            >
              {expiries.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Body Scroll Container */}
      <div style={{ flex: '1', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {loading && !gexData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '300px', flex: '1' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Computing Black-Scholes gamma values and option exposure levels...</p>
          </div>
        ) : gexData ? (
          <>
            {/* Regime Banner Card */}
            {stats?.regime && (
              <div style={{ 
                background: stats.regime_bg || 'rgba(13, 16, 23, 0.4)', 
                border: `1px solid ${stats.regime_color || 'var(--border-color)'}33`, 
                borderRadius: '12px', 
                padding: '16px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Current Market Regime</span>
                  {stats.pin_score > 0 && (
                    <span style={{ fontSize: '10px', color: stats.pin_color, border: `1px solid ${stats.pin_color}`, borderRadius: '4px', padding: '1px 6px', fontWeight: 'bold' }}>
                      Pin Score: {stats.pin_score}% ({stats.pin_label})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: stats.regime_color || 'white' }}>
                  {stats.regime}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {stats.regime_desc}
                </div>
              </div>
            )}

            {/* Metrics Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              
              <div className="glass-panel" style={{ padding: '14px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Spot Price</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginTop: '4px' }}>
                  Rs {gexData.spot_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Net GEX</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: rawNetGex >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                  {formatGexMoney(rawNetGex)}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gamma Flip Zone</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#a78bfa', marginTop: '4px' }}>
                  {stats?.gamma_flip?.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Max Pain</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#e879f9', marginTop: '4px' }}>
                  {stats?.max_pain?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Signal & Consensus Card */}
            {direction && (
              <div style={{ 
                background: 'rgba(24, 24, 27, 0.4)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px', 
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Directional Consensus</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: direction.score >= 4 ? '#10b981' : direction.score <= -4 ? '#ef4444' : '#f59e0b' }}>
                    {direction.label} ({direction.confidence}% Confidence)
                  </span>
                </div>
                
                {/* Confidence Bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${direction.confidence}%`, 
                    background: direction.score >= 4 ? '#10b981' : direction.score <= -4 ? '#ef4444' : '#f59e0b',
                    borderRadius: '4px'
                  }}></div>
                </div>

                {/* Consensus Reasons List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  {direction.why_up?.map((w: string, idx: number) => (
                    <div key={`up-${idx}`} style={{ fontSize: '12px', color: '#34d399', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <TrendingUp size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{w}</span>
                    </div>
                  ))}
                  {direction.why_dn?.map((w: string, idx: number) => (
                    <div key={`dn-${idx}`} style={{ fontSize: '12px', color: '#f87171', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <TrendingDown size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{w}</span>
                    </div>
                  ))}
                  {direction.special?.map((w: string, idx: number) => (
                    <div key={`spec-${idx}`} style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trade Strategy Recommendation */}
            {suggestion && (
              <div style={{ 
                background: `${suggestion.color}0a`, 
                border: `1px solid ${suggestion.color}44`, 
                borderRadius: '12px', 
                padding: '16px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={16} color={suggestion.color} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: suggestion.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Recommended Strategy: {suggestion.strategy}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>
                  {suggestion.setup}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div>Target: <strong style={{ color: 'white' }}>{suggestion.target}</strong></div>
                  <div>Stop Loss: <strong style={{ color: 'white' }}>{suggestion.stop}</strong></div>
                  <div>Size limit: <strong style={{ color: 'white' }}>{suggestion.size}</strong></div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                  {suggestion.note}
                </div>
              </div>
            )}

            {/* Multi-Expiry, Walls & PCR Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Option Walls & PCR */}
              <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Option Walls & PCR</span>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Call Wall Resistance:</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                    {stats?.call_wall?.toLocaleString('en-IN')} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(+{stats?.call_wall ? Math.max(0, stats.call_wall - gexData.spot_price).toFixed(0) : 0}pts)</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Put Wall Support:</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {stats?.put_wall?.toLocaleString('en-IN')} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(+{stats?.put_wall ? Math.max(0, gexData.spot_price - stats.put_wall).toFixed(0) : 0}pts)</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Put-Call Ratio (PCR):</span>
                  <span style={{ color: stats?.pcr_color || 'white', fontWeight: 'bold' }}>{stats?.pcr}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `3px solid ${stats?.pcr_color || 'var(--border-color)'}` }}>
                  <strong>{stats?.pcr_tag}</strong>: {stats?.pcr_desc}
                </div>
              </div>

              {/* IV Skew analysis */}
              {ivAnalysis && (
                <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>IV Skew Analysis</span>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CE Implied Vol (IV):</span>
                    <span style={{ color: ivAnalysis.ce_col, fontWeight: 'bold' }}>
                      {ivAnalysis.ce_iv}% <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({ivAnalysis.ce_iv_chg >= 0 ? '+' : ''}{ivAnalysis.ce_iv_chg}%)</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>PE Implied Vol (IV):</span>
                    <span style={{ color: ivAnalysis.pe_col, fontWeight: 'bold' }}>
                      {ivAnalysis.pe_iv}% <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({ivAnalysis.pe_iv_chg >= 0 ? '+' : ''}{ivAnalysis.pe_iv_chg}%)</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>IV Skew (PE - CE):</span>
                    <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{ivAnalysis.iv_skew >= 0 ? '+' : ''}{ivAnalysis.iv_skew}%</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontStyle: 'italic' }}>
                    {ivAnalysis.skew_note}
                  </div>
                </div>
              )}
            </div>

            {/* Strikes GEX Distribution SVG Chart */}
            {gexData.gex_svg && (
              <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>Strike Net GEX Profile</span>
                <div 
                  dangerouslySetInnerHTML={{ __html: gexData.gex_svg }} 
                  style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}
                />
              </div>
            )}

            {/* Recent OI Activity Strike Changes */}
            {gexData.oi_changes && gexData.oi_changes.length > 0 && (
              <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>OI Activity (Top Strike changes)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {gexData.oi_changes.map((ch: any, idx: number) => {
                    const adding = ch.diff > 0;
                    const col = adding ? '#10b981' : '#ef4444';
                    const bg = adding ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                    const zone = ch.strike < gexData.spot_price ? 'Put Support' : 'Call Resist';
                    const distPts = Math.abs(ch.strike - gexData.spot_price);
                    
                    return (
                      <div 
                        key={`oi-ch-${idx}`} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '10px 12px', 
                          background: bg, 
                          borderRadius: '8px', 
                          borderLeft: `3px solid ${col}` 
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>
                            {ch.strike.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {zone} (-{distPts.toFixed(0)}pts)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: col }}>
                            {adding ? '+' : ''}{(ch.diff / 100000).toFixed(1)}L OI
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {ch.netGEX > 0 ? '+' : ''}{ch.netGEX.toFixed(1)}Cr GEX
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No GEX data loaded.</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
