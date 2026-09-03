import React, { useState, useEffect } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';

interface BTSTCandidate {
  symbol: string;
  closePrice: number;
  vahPrice?: number;
  valPrice?: number;
  distance?: string;
}

interface BTSTReportData {
  generatedAt: string;
  gapUpCandidates: BTSTCandidate[];
  gapDownCandidates: BTSTCandidate[];
  buyingTailCandidates: BTSTCandidate[];
  sellingTailCandidates: BTSTCandidate[];
  poorHighCandidates: BTSTCandidate[];
  poorLowCandidates: BTSTCandidate[];
}

interface BtstReportProps {
  onSelectSymbol: (symbol: string) => void;
}

// Dynamically resolve backend API base based on origin
const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

export const BtstReport: React.FC<BtstReportProps> = ({ onSelectSymbol }) => {
  const [data, setData] = useState<BTSTReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/scanner/btst-report`);
      if (!response.ok) {
        throw new Error('BTST report is still generating or not available yet. Runs at 3:15 PM.');
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '300px' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Compiling 3:15 PM closing market profiles & gap candidates...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle color="#ef4444" size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#ef4444', fontWeight: '700' }}>Report Offline</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{error || 'No candidates recorded yet. Daily scan runs at 3:15 PM IST.'}</p>
          </div>
        </div>
        <button 
          onClick={fetchReport}
          className="glow-btn"
          style={{ width: 'fit-content', padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} />
          Retry Scan
        </button>
      </div>
    );
  }

  const cleanSymbolName = (sym: string) => sym.split(':').pop() || sym;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles color="var(--accent-purple)" size={18} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '-0.2px' }}>
            🔥 3:15 PM BTST & Closing Market Scanner
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Generated: <strong style={{ color: 'white' }}>{data.generatedAt}</strong></span>
          <button 
            onClick={fetchReport} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Gap Up Candidates (Green Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(16, 185, 129, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-bull)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🚀 Gap Up Candidates
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-bull)' }}>
              {data.gapUpCandidates.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {data.gapUpCandidates.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0', textAlign: 'center' }}>No stocks closing above yesterday's VAH</p>
            ) : (
              data.gapUpCandidates.map(c => (
                <div 
                  key={c.symbol}
                  onClick={() => onSelectSymbol(c.symbol)}
                  className="scanner-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>₹{c.closePrice.toFixed(2)}</span>
                    <span style={{ color: 'var(--color-bull)', fontWeight: '800', display: 'flex', alignItems: 'center' }}>
                      +{c.distance}% <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gap Down Candidates (Red Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(239, 68, 68, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-bear)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📉 Gap Down Candidates
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-bear)' }}>
              {data.gapDownCandidates.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {data.gapDownCandidates.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0', textAlign: 'center' }}>No stocks closing below yesterday's VAL</p>
            ) : (
              data.gapDownCandidates.map(c => (
                <div 
                  key={c.symbol}
                  onClick={() => onSelectSymbol(c.symbol)}
                  className="scanner-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>₹{c.closePrice.toFixed(2)}</span>
                    <span style={{ color: 'var(--color-bear)', fontWeight: '800', display: 'flex', alignItems: 'center' }}>
                      -{c.distance}% <ArrowDownRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tail Rejections & Poor Extremes (Purple/Orange Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(168, 85, 247, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(168, 85, 247, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Rejections & Extremes
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
              {data.buyingTailCandidates.length + data.sellingTailCandidates.length + data.poorHighCandidates.length + data.poorLowCandidates.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* Buying Tail Lists */}
            {data.buyingTailCandidates.map(c => (
              <div 
                key={`${c.symbol}-bt`}
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  Buying Tail
                </span>
              </div>
            ))}

            {/* Selling Tail Lists */}
            {data.sellingTailCandidates.map(c => (
              <div 
                key={`${c.symbol}-st`}
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  Selling Tail
                </span>
              </div>
            ))}

            {/* Poor High Lists */}
            {data.poorHighCandidates.map(c => (
              <div 
                key={`${c.symbol}-ph`}
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  Poor High
                </span>
              </div>
            ))}

            {/* Poor Low Lists */}
            {data.poorLowCandidates.map(c => (
              <div 
                key={`${c.symbol}-pl`}
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{cleanSymbolName(c.symbol)}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  Poor Low
                </span>
              </div>
            ))}

            {data.buyingTailCandidates.length + data.sellingTailCandidates.length + data.poorHighCandidates.length + data.poorLowCandidates.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0', textAlign: 'center' }}>No active tails or unresolved poor extremes</p>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
