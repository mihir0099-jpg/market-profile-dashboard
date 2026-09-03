import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight, Anchor, Target } from 'lucide-react';

interface CompressionCandidate {
  symbol: string;
  avgPoc: string;
  bracketHigh: string;
  bracketLow: string;
  description: string;
}

interface UnfinishedCandidate {
  symbol: string;
  closePrice: number;
  poorHighPrice?: number;
  poorLowPrice?: number;
  description: string;
}

interface PcrCandidate {
  symbol: string;
  pcr: string;
  type: string;
  expectedDirection: string;
  description: string;
}

interface NineAmReportData {
  generatedAt: string;
  compressionCandidates: CompressionCandidate[];
  poorHighCandidates: UnfinishedCandidate[];
  poorLowCandidates: UnfinishedCandidate[];
  pcrExtremeCandidates: PcrCandidate[];
}

interface NineAmReportProps {
  onSelectSymbol: (symbol: string) => void;
}

const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

export const NineAmReport: React.FC<NineAmReportProps> = ({ onSelectSymbol }) => {
  const [data, setData] = useState<NineAmReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/scanner/nineam-report`);
      if (!response.ok) {
        throw new Error('9 AM pre-market report is still compiling or not available yet.');
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load pre-market report.');
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Compiling 9:00 AM Pre-market compression brackets and unfinished auctions...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle color="#ef4444" size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#ef4444', fontWeight: '700' }}>Pre-Market Scanner Offline</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{error || 'No pre-market candidates recorded. Runs daily at 9:00 AM IST.'}</p>
          </div>
        </div>
        <button 
          onClick={fetchReport}
          className="glow-btn"
          style={{ width: 'fit-content', padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} />
          Generate Scan Now
        </button>
      </div>
    );
  }

  const cleanSymbol = (sym: string) => sym.split(':').pop() || sym;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap color="var(--accent-blue)" size={18} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '-0.2px' }}>
            ⚡ 9:00 AM Pre-Market Predictive Scanner
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Generated: <strong style={{ color: 'white' }}>{data.generatedAt}</strong></span>
          <button 
            onClick={fetchReport} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Refresh Scan"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* 3-Day Compression Spring Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(168, 85, 247, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(168, 85, 247, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Anchor size={12} />
              🗜️ 3-Day Compressions
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
              {data.compressionCandidates.length}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            Tight consolidations. Place stop orders at 9:15 AM to catch breakout: **Buy Stop** above bracket high, **Sell Stop** below bracket low.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '400px', marginTop: '6px' }}>
            {data.compressionCandidates.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px' }}>No 3D compressions found today.</span>
            ) : (
              data.compressionCandidates.map((c) => (
                <div 
                  key={c.symbol} 
                  onClick={() => onSelectSymbol(c.symbol)}
                  className="scanner-row"
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{cleanSymbol(c.symbol)}</span>
                    <span style={{ fontSize: '10px', color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.08)', padding: '1px 5px', borderRadius: '3px' }}>
                      POC {c.avgPoc}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <div style={{ borderLeft: '2px solid #10b981', paddingLeft: '4px' }}>
                      Buy Stop: <strong style={{ color: 'white' }}>{c.bracketHigh}</strong>
                    </div>
                    <div style={{ borderLeft: '2px solid #ef4444', paddingLeft: '4px' }}>
                      Sell Stop: <strong style={{ color: 'white' }}>{c.bracketLow}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unfinished Auctions (Poor Extremes) Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(249, 115, 22, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(249, 115, 22, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Target size={12} />
              🎯 Magnet Targets
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
              {data.poorHighCandidates.length + data.poorLowCandidates.length}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            Yesterday left flat auction extremes (no tails). Market has high odds of clearing these targets today. Enter on morning bias.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '400px', marginTop: '6px' }}>
            {data.poorHighCandidates.map((c) => (
              <div 
                key={c.symbol + '-high'} 
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{cleanSymbol(c.symbol)}</span>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <ArrowUpRight size={10} /> CLEAR HIGH
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Target Magnet Price: <strong style={{ color: 'white' }}>{c.poorHighPrice?.toFixed(2)}</strong>
                </div>
              </div>
            ))}

            {data.poorLowCandidates.map((c) => (
              <div 
                key={c.symbol + '-low'} 
                onClick={() => onSelectSymbol(c.symbol)}
                className="scanner-row"
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{cleanSymbol(c.symbol)}</span>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <ArrowDownRight size={10} /> CLEAR LOW
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Target Magnet Price: <strong style={{ color: 'white' }}>{c.poorLowPrice?.toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contrarian Option Sentiment Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(59, 130, 246, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Target size={12} />
              🎭 Option Sentiments
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
              {data.pcrExtremeCandidates.length}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            Extreme options imbalances. Play contrarian reversals: BUY fear (PCR &ge; 1.25) for green close, SHORT greed (PCR &le; 0.65) for red close.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '400px', marginTop: '6px' }}>
            {data.pcrExtremeCandidates.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px' }}>No PCR extreme sentiment alerts today.</span>
            ) : (
              data.pcrExtremeCandidates.map((c) => (
                <div 
                  key={c.symbol} 
                  onClick={() => onSelectSymbol(c.symbol)}
                  className="scanner-row"
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{cleanSymbol(c.symbol)}</span>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: '800', 
                      color: c.type.includes('Fear') ? '#ef4444' : '#10b981'
                    }}>
                      PCR {c.pcr}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Bias:</span>
                    <span style={{ color: c.type.includes('Fear') ? '#10b981' : '#ef4444' }}>
                      {c.expectedDirection}
                    </span>
                  </div>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                    {c.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
