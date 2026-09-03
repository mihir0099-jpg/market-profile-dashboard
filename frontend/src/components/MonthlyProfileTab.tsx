import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Calendar, TrendingUp, TrendingDown, Target, ShieldAlert, Award, Layers } from 'lucide-react';

interface MonthlyProfileData {
  symbol: string;
  currMonthKey: string;
  prevMonthKey: string;
  daysTraded: number;
  currOpen: number;
  lastPrice: number;
  currHigh: number;
  currLow: number;
  openContext: string;
  isInsideValue: boolean;
  isAboveVah: boolean;
  isBelowVal: boolean;
  prevMonth: {
    high: number;
    low: number;
    poc: number;
    vah: number;
    val: number;
  };
  ib: {
    daysCount: number;
    high: number;
    low: number;
    width: number;
    widthType: 'narrow' | 'medium' | 'wide';
  };
  fibTargets: {
    up: { fib1618: number; fib2618: number; fib3618: number };
    down: { fib1618: number; fib2618: number; fib3618: number };
  };
  otf: {
    isActive: boolean;
    countF: number;
    isGExtended: boolean;
  };
  statsSummary: {
    totalMonthsAnalyzed: number;
    insideValueWinRate: number;
    outsideValueGapTrapRate: number;
    narrowIbStats: { hit1618: number; hit2618: number; hit3618: number };
    mediumIbStats: { hit1618: number; hit2618: number; hit3618: number };
    wideIbStats: { hit1618: number; hit2618: number; hit3618: number };
  };
  lastUpdated: string;
}

interface MonthlyProfileTabProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
}

const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

export const MonthlyProfileTab: React.FC<MonthlyProfileTabProps> = ({ currentSymbol, onSelectSymbol }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(currentSymbol || 'NSE:NIFTY');
  const [data, setData] = useState<MonthlyProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyData = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/monthly-profile?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Failed to load monthly profile data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching monthly profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData(selectedSymbol);
    const interval = setInterval(() => {
      fetchMonthlyData(selectedSymbol);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    onSelectSymbol(sym);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
      
      {/* Top Header & Symbol Selector */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', border: '1px solid var(--accent-blue)' }}>
            <Calendar size={22} color="var(--accent-blue)" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Monthly Profile & 5-Day IB Analytics
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                5-Year Backtested Web Engine
              </span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Automated 5-Day Initial Balance Fibonacci Extensions, Open Location Context & OTF Reversals
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Symbol Select Buttons */}
          {['NSE:NIFTY', 'NSE:BANKNIFTY', 'NSE:RELIANCE', 'NSE:HDFCBANK'].map((sym) => (
            <button
              key={sym}
              onClick={() => handleSymbolChange(sym)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '6px',
                cursor: 'pointer',
                border: selectedSymbol === sym ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                background: selectedSymbol === sym ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'rgba(255,255,255,0.03)',
                color: 'white',
                transition: 'all 0.2s'
              }}
            >
              {sym.replace('NSE:', '')}
            </button>
          ))}

          <button
            onClick={() => fetchMonthlyData(selectedSymbol)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', borderRadius: '12px', textAlign: 'center' }}>
          <Loader2 size={36} className="spin" color="var(--accent-blue)" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Fetching live TradingView monthly candles & calculating 5-day IB profile...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '30px', borderRadius: '12px', borderColor: '#ef4444', color: '#ef4444', textAlign: 'center' }}>
          <ShieldAlert size={32} style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: '700', margin: 0 }}>{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Main Grid: Live Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

            {/* CARD 1: Monthly Open Location & 83.3% POC Target */}
            <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={14} color="#3b82f6" /> Monthly Open & POC Magnet
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: data.isInsideValue ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: data.isInsideValue ? '#10b981' : '#ef4444', border: `1px solid ${data.isInsideValue ? '#10b981' : '#ef4444'}` }}>
                  {data.openContext}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '4px 0' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Month Open Price</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginTop: '2px' }}>{data.currOpen.toFixed(2)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700' }}>Prior Month POC Target</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>{data.prevMonth.poc.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                {data.isInsideValue ? (
                  <span>🎯 <strong>83.3% Win Rate Setup:</strong> Month opened inside August Value Area. Statistically, there is an 83.3% probability Nifty will revert to test <strong>{data.prevMonth.poc.toFixed(2)}</strong>!</span>
                ) : (
                  <span>🚨 <strong>72.2% Gap Trap Alert:</strong> Month opened outside Value Area. Gaps fail in 7/10 months—fade once price trades back inside <strong>{data.prevMonth.val.toFixed(2)} - {data.prevMonth.vah.toFixed(2)}</strong>.</span>
                )}
              </div>
            </div>

            {/* CARD 2: 5-Day Monthly Initial Balance (IB) Width */}
            <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #a855f7', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="#a855f7" /> 5-Day Initial Balance (IB)
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: data.ib.widthType === 'narrow' ? 'rgba(16, 185, 129, 0.15)' : (data.ib.widthType === 'wide' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                  color: data.ib.widthType === 'narrow' ? '#10b981' : (data.ib.widthType === 'wide' ? '#ef4444' : '#f59e0b')
                }}>
                  {data.ib.widthType.toUpperCase()} IB ({data.ib.width.toFixed(1)} pts)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>IB LOW</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>{data.ib.low.toFixed(1)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>IB HIGH</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{data.ib.high.toFixed(1)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DAYS TRADED</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>{data.daysTraded} / 22</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                {data.ib.widthType === 'narrow' ? (
                  <span>🚀 <strong>Narrow IB Squeeze (&lt;450 pts):</strong> 90% hit rate for 1.618x extension, 50% run to 2.618x! Buy breakout momentum.</span>
                ) : data.ib.widthType === 'medium' ? (
                  <span>🎯 <strong>Medium IB (450-750 pts):</strong> 73.3% hit rate for 1.618x extension. Book 100% of profits at 1.618x (0% reach 3.618x).</span>
                ) : (
                  <span>🔴 <strong>Wide IB (&gt;750 pts):</strong> 66.7% failure rate for breakouts. Avoid chasing; trade mean reversion fades.</span>
                )}
              </div>
            </div>

            {/* CARD 3: OTF Down & Period G Reversal Tracker */}
            <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} color="#f59e0b" /> OTF Down & Period G Tracker
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: data.otf.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: data.otf.isActive ? '#ef4444' : '#10b981' }}>
                  {data.otf.isActive ? `OTF DOWN (Day 1-${data.otf.countF})` : 'BALANCED / OTF NONE'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PERIOD F (DAY 6) LOW</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{data.currLow.toFixed(1)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PERIOD G (DAY 7) STATUS</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: data.otf.isGExtended ? '#ef4444' : '#10b981' }}>
                    {data.otf.isGExtended ? 'EXTENDED DOWN' : 'NOT EXTENDED'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                {data.otf.isGExtended ? (
                  <span>🔴 <strong>Selling Mode Active:</strong> Period G extended lower. Expect run to test <strong>2.618x Fib ({data.fibTargets.down.fib2618.toFixed(1)})</strong> before reversal bottom.</span>
                ) : (
                  <span>🟢 <strong>f-Failure Reversal Target:</strong> If Day 7 holds and breaks Day 6 High, 80% V-shape rally targets <strong>{data.prevMonth.poc.toFixed(1)}</strong> (+400 pts)!</span>
                )}
              </div>
            </div>

          </div>

          {/* Fibonacci Extension Targets Grid */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="var(--accent-blue)" /> 5-Day Initial Balance Fibonacci Extension Targets
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              
              {/* Downside Targets */}
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={16} /> Downside Fibonacci Extension Targets
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>1.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#ef4444' }}>{data.fibTargets.down.fib1618.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>2.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#ef4444' }}>{data.fibTargets.down.fib2618.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#ef4444' }}>{data.fibTargets.down.fib3618.toFixed(2)}</strong>
                </div>
              </div>

              {/* Upside Targets */}
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> Upside Fibonacci Extension Targets
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>1.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#10b981' }}>{data.fibTargets.up.fib1618.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>2.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#10b981' }}>{data.fibTargets.up.fib2618.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3.618x Extension Target</span>
                  <strong style={{ fontSize: '14px', color: '#10b981' }}>{data.fibTargets.up.fib3618.toFixed(2)}</strong>
                </div>
              </div>

            </div>
          </div>

          {/* 5-Year Empirical Stats Dashboard */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'white' }}>
                5-Year Backtest Historical Benchmarks (72 Monthly Sessions)
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated live: {data.lastUpdated}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INSIDE VALUE POC REVERSION</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>83.3%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>30 out of 36 months hit Prior POC</div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OUTSIDE GAP FADABLE TRAP</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>72.2%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>26 out of 36 gaps failed & re-entered</div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NARROW IB (&lt;450) 1.618x HIT</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>90.0%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>27 out of 30 narrow months hit 1.618x</div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MEDIUM IB (450-750) 1.618x HIT</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#a855f7', marginTop: '4px' }}>73.3%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Book 100% at 1.618x (0% hit 3.618x)</div>
              </div>
            </div>
          </div>

        </>
      ) : null}

    </div>
  );
};
