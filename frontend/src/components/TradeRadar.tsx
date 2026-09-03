import { useState, useEffect } from 'react';
import { Target, TrendingUp, BookOpen, Cpu, CheckCircle, XCircle } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  strategy: string;
  type: string;
  direction: 'BUY' | 'SHORT';
  entry: number;
  sl: number;
  target: number;
  currentPrice?: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'EXPIRED';
  pnlPoints?: number;
  exitPrice?: number;
  createdDate: string;
  timestamp: string;
}

interface LearningParams {
  btst: { closeStrengthThreshold: number; exitRule: string };
  trap: { targetType: string; balancePeriodDays: number };
  magnet: { magnetBufferPercent: number; stopLossBufferPercent: number };
  drive: { requireGap: boolean; rrRatio: number };
}

interface JournalEntry {
  timestamp: string;
  modifications: string[];
}

interface TradeRadarProps {
  onSelectSymbol: (symbol: string) => void;
}

const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

export function TradeRadar({ onSelectSymbol }: TradeRadarProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [params, setParams] = useState<LearningParams | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll API for fresh trades and pricing
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesRes, paramsRes, journalRes] = await Promise.all([
          fetch(`${API_BASE}/api/signals`),
          fetch(`${API_BASE}/api/learning/params`),
          fetch(`${API_BASE}/api/learning/journal`)
        ]);

        if (tradesRes.ok) setTrades(await tradesRes.json());
        if (paramsRes.ok) setParams(await paramsRes.json());
        if (journalRes.ok) setJournal(await journalRes.json());
      } catch (err) {
        console.error('Error fetching Trade Radar stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const resolvedTrades = trades.filter(t => t.status !== 'ACTIVE');

  // Stats calculation
  const totalClosed = resolvedTrades.length;
  const wins = resolvedTrades.filter(t => t.status === 'TARGET_HIT' || (t.status === 'EXPIRED' && t.pnlPoints && t.pnlPoints > 0)).length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const netPnl = resolvedTrades.reduce((acc, t) => acc + (t.pnlPoints || 0), 0);

  // Progress helper
  const calculateProgress = (trade: Trade) => {
    // If we don't have current live price, fallback
    const current = trade.currentPrice || trade.entry;
    const { sl, target, direction } = trade;
    
    if (direction === 'BUY') {
      if (current <= sl) return 0;
      if (current >= target) return 100;
      return ((current - sl) / (target - sl)) * 100;
    } else {
      if (current >= sl) return 0;
      if (current <= target) return 100;
      return ((sl - current) / (sl - target)) * 100;
    }
  };

  if (loading && trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Cpu className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Initializing Trade Radar Console...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* 🚀 Top Stats Panel */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(0, 122, 255, 0.15)', padding: '10px', borderRadius: '8px', color: 'var(--accent-blue)' }}>
            <Cpu size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '500' }}>ACTIVE TRADES</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>{activeTrades.length}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(52, 199, 89, 0.15)', padding: '10px', borderRadius: '8px', color: 'var(--accent-green)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '500' }}>WIN RATE</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-green)' }}>
              {winRate.toFixed(1)}%
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: '6px' }}>
                ({wins}/{totalClosed})
              </span>
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: netPnl >= 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)', padding: '10px', borderRadius: '8px', color: netPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            <Target size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '500' }}>NET POINTS</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: netPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(1)} pts
            </span>
          </div>
        </div>
      </div>

      {/* ⚡ Active Trades Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0', marginBottom: '16px' }}>
          <Cpu size={16} style={{ color: 'var(--accent-blue)' }} />
          Active Signals Tracker
        </h3>

        {activeTrades.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
            <Cpu size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-muted)' }}>No active trades detected. Engine is scanning live feeds.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {activeTrades.map(t => {
              const progress = calculateProgress(t);
              return (
                <div key={t.id} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span 
                      onClick={() => onSelectSymbol(t.symbol)}
                      style={{ fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {t.symbol}
                    </span>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: '700', 
                      background: t.direction === 'BUY' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                      color: t.direction === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {t.direction}
                    </span>
                  </div>

                  {/* Strategy Description */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Strategy:</span>
                    <span style={{ color: 'white', fontWeight: '600' }}>{t.strategy}</span>
                  </div>

                  {/* Levels Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>SL</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-red)' }}>{t.sl.toFixed(1)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>ENTRY</span>
                      <span style={{ fontWeight: '700', color: 'white' }}>{t.entry.toFixed(1)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>TARGET</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{t.target.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Reversion Target Progress:</span>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', transition: 'width 0.3s ease-out' }} />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📚 Journal & Auto-Learning Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Closed Trades Journal */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-purple)' }} />
            Closed Trade Journal
          </h3>

          <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px 4px' }}>Symbol</th>
                  <th style={{ padding: '6px 4px' }}>Strategy</th>
                  <th style={{ padding: '6px 4px' }}>Dir</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>PnL</th>
                </tr>
              </thead>
              <tbody>
                {resolvedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No completed trades in today's journal.</td>
                  </tr>
                ) : (
                  resolvedTrades.slice().reverse().map(t => {
                    const win = t.status === 'TARGET_HIT' || (t.status === 'EXPIRED' && t.pnlPoints && t.pnlPoints > 0);
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 4px', fontWeight: '700', color: 'white' }}>{t.symbol.split(':').pop()}</td>
                        <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{t.strategy.replace('3:15 PM ', '')}</td>
                        <td style={{ padding: '8px 4px', color: t.direction === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{t.direction}</td>
                        <td style={{ padding: '8px 4px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600',
                            color: t.status === 'TARGET_HIT' ? 'var(--accent-green)' : t.status === 'STOP_LOSS_HIT' ? 'var(--accent-red)' : 'var(--text-muted)'
                          }}>
                            {t.status === 'TARGET_HIT' ? <CheckCircle size={10} /> : t.status === 'STOP_LOSS_HIT' ? <XCircle size={10} /> : null}
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '700', color: win ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {win ? '+' : ''}{t.pnlPoints?.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Parameter Learner Console */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
            <Cpu size={16} style={{ color: 'var(--accent-blue)' }} />
            AI Self-Learning Console
          </h3>

          {params && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BTST Close Strength</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                  {(params.btst.closeStrengthThreshold * 100).toFixed(0)}%
                </span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Balance Trap Period</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                  {params.trap.balancePeriodDays} Days
                </span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auction Magnet Buffer</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                  {(params.magnet.magnetBufferPercent * 100).toFixed(2)}%
                </span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Opening Drive R:R</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                  1:{params.drive.rrRatio.toFixed(1)}
                </span>
              </div>

            </div>
          )}

          {/* Learning Journal Feed */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', display: 'block', marginBottom: '8px' }}>
              Tuning Journal logs
            </span>
            <div style={{ maxHeight: '110px', overflowY: 'auto', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {journal.length === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>No parameters adjustments logged yet. Systems are stable.</span>
              ) : (
                journal.slice().reverse().map((entry, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--accent-blue)', display: 'block', fontWeight: '600', marginBottom: '2px' }}>
                      {new Date(entry.timestamp).toLocaleString('en-IN')}
                    </span>
                    {entry.modifications.map((mod, mIdx) => (
                      <span key={mIdx} style={{ color: 'var(--text-muted)', display: 'block', paddingLeft: '4px' }}>
                        - {mod}
                      </span>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
