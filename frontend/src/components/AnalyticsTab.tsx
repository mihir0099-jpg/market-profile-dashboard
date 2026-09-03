import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, Percent, RefreshCw, BarChart2, ShieldAlert, Layers } from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  strategy: string;
  type: string;
  direction: string;
  entry: number;
  sl: number;
  target: number;
  status: string;
  pnlPoints?: number;
  createdDate: string;
  resolvedDate?: string;
}

interface AnalyticsTabProps {
  apiBase: string;
}

export function AnalyticsTab({ apiBase }: AnalyticsTabProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('All');
  const [accountBalance, setAccountBalance] = useState<number>(500000); // Default 5 Lakhs INR

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/signals`);
      if (response.ok) {
        const data = await response.json();
        setSignals(data);
        setError(null);
      } else {
        setError('Failed to fetch signal database');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [apiBase]);

  // Extract unique strategies
  const strategies = useMemo(() => {
    const unique = new Set<string>();
    signals.forEach(s => {
      if (s.strategy) unique.add(s.strategy);
    });
    return ['All', ...Array.from(unique)];
  }, [signals]);

  // Filtered signals for analysis
  const filteredSignals = useMemo(() => {
    if (selectedStrategy === 'All') return signals;
    return signals.filter(s => s.strategy === selectedStrategy);
  }, [signals, selectedStrategy]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const resolved = filteredSignals.filter(s => s.status !== 'ACTIVE' && typeof s.pnlPoints === 'number');
    
    let wins = 0;
    let losses = 0;
    let totalPnl = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    
    resolved.forEach(s => {
      const pnl = s.pnlPoints || 0;
      totalPnl += pnl;
      if (pnl > 0) {
        wins++;
        totalWinPnl += pnl;
      } else if (pnl < 0) {
        losses++;
        totalLossPnl += Math.abs(pnl);
      }
    });

    const totalResolved = resolved.length;
    const winRate = totalResolved > 0 ? (wins / totalResolved) * 100 : 0;
    const avgWin = wins > 0 ? totalWinPnl / wins : 0;
    const avgLoss = losses > 0 ? totalLossPnl / losses : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99.9 : 0;

    const wDecimal = winRate / 100;
    let kelly = 0;
    if (wDecimal > 0 && winLossRatio > 0) {
      kelly = wDecimal - (1 - wDecimal) / winLossRatio;
    }

    return {
      totalTrades: totalResolved,
      wins,
      losses,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      winLossRatio,
      profitFactor,
      kelly: kelly > 0 ? kelly : 0
    };
  }, [filteredSignals]);

  // Generate Equity Curve points
  const equityPoints = useMemo(() => {
    const resolved = filteredSignals
      .filter(s => s.status !== 'ACTIVE' && typeof s.pnlPoints === 'number')
      .sort((a, b) => {
        const dateA = a.resolvedDate || a.createdDate || '';
        const dateB = b.resolvedDate || b.createdDate || '';
        return dateA.localeCompare(dateB);
      });

    let runningPnl = 0;
    return resolved.map((s, index) => {
      runningPnl += s.pnlPoints || 0;
      return {
        tradeIndex: index + 1,
        symbol: s.symbol,
        pnl: s.pnlPoints || 0,
        runningPnl,
        date: s.resolvedDate || s.createdDate
      };
    });
  }, [filteredSignals]);

  // SVG dimensions for Equity Curve
  const svgWidth = 800;
  const svgHeight = 250;
  const padding = 40;

  const svgPath = useMemo(() => {
    if (equityPoints.length < 2) return '';
    
    const pnls = equityPoints.map(p => p.runningPnl);
    const maxPnl = Math.max(...pnls, 10);
    const minPnl = Math.min(...pnls, -10);
    const pnlRange = maxPnl - minPnl;

    const getX = (index: number) => {
      return padding + (index / (equityPoints.length - 1)) * (svgWidth - 2 * padding);
    };

    const getY = (val: number) => {
      return svgHeight - padding - ((val - minPnl) / pnlRange) * (svgHeight - 2 * padding);
    };

    let path = `M ${getX(0)} ${getY(equityPoints[0].runningPnl)}`;
    for (let i = 1; i < equityPoints.length; i++) {
      path += ` L ${getX(i)} ${getY(equityPoints[i].runningPnl)}`;
    }
    return path;
  }, [equityPoints]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
      
      {/* Configuration Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart2 size={22} color="var(--accent-color)" />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
            System Strategy Analytics & Sizing Guide
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Strategy Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none'
              }}
            >
              {strategies.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Account Balance Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trading Capital (₹):</span>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 10px',
                borderRadius: '6px',
                width: '100px',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={fetchSignals}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent-color)',
              color: '#000',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Loading analytics database...</span>
        </div>
      ) : error ? (
        <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <TrendingUp size={14} color="#10b981" /> Total Profit/Loss
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 0 0', color: metrics.totalPnl >= 0 ? '#10b981' : '#ef4444' }}>
                {metrics.totalPnl >= 0 ? `+${metrics.totalPnl.toFixed(1)}` : metrics.totalPnl.toFixed(1)} pts
              </h3>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <Percent size={14} color="#f59e0b" /> Win Rate
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#f59e0b' }}>
                {metrics.winRate.toFixed(1)}%
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: 'normal' }}>
                  ({metrics.wins} / {metrics.totalTrades})
                </span>
              </h3>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <Award size={14} color="#3b82f6" /> Profit Factor
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#3b82f6' }}>
                {metrics.profitFactor.toFixed(2)}
              </h3>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <Layers size={14} color="#a78bfa" /> Risk Reward Ratio
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#a78bfa' }}>
                1 : {metrics.winLossRatio.toFixed(2)}
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 'normal' }}>
                  Avg W: {metrics.avgWin.toFixed(1)} | L: {metrics.avgLoss.toFixed(1)}
                </span>
              </h3>
            </div>
          </div>

          {/* Sizing & Equity Curve Panels */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '16px'
          }}>
            {/* Equity Curve Panel */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                Performance Equity Curve (Cumulative P&L Points)
              </h3>
              
              {equityPoints.length < 2 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Need at least 2 closed trades to render the equity curve.</span>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%', overflowX: 'auto', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '10px' }}>
                  <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
                    <line 
                      x1={padding} 
                      y1={svgHeight / 2} 
                      x2={svgWidth - padding} 
                      y2={svgHeight / 2} 
                      stroke="rgba(255,255,255,0.08)" 
                      strokeDasharray="4"
                    />
                    
                    <path
                      d={svgPath}
                      fill="none"
                      stroke="var(--accent-color)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {equityPoints.map((pt, i) => {
                      const pnls = equityPoints.map(p => p.runningPnl);
                      const maxPnl = Math.max(...pnls, 10);
                      const minPnl = Math.min(...pnls, -10);
                      const pnlRange = maxPnl - minPnl;
                      
                      const x = padding + (i / (equityPoints.length - 1)) * (svgWidth - 2 * padding);
                      const y = svgHeight - padding - ((pt.runningPnl - minPnl) / pnlRange) * (svgHeight - 2 * padding);

                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill={pt.pnl >= 0 ? '#10b981' : '#ef4444'}
                          />
                          <title>
                            {`Trade #${pt.tradeIndex} (${pt.symbol})\nDate: ${pt.date}\nTrade PnL: ${pt.pnl.toFixed(1)} pts\nCumulative: ${pt.runningPnl.toFixed(1)} pts`}
                          </title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Position Sizer Panel */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="var(--accent-color)" />
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                  Kelly Sizing & Risk Guide
                </h3>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Raw Kelly Percentage:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    {(metrics.kelly * 100).toFixed(2)}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Conservative Sizing (Half-Kelly):</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {((metrics.kelly / 2) * 100).toFixed(2)}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Recommended Risk per Trade:</span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    ₹{(accountBalance * (metrics.kelly / 2)).toFixed(0)}
                  </span>
                </div>
              </div>

              {metrics.kelly > 0 ? (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  color: '#10b981'
                }}>
                  <strong>✅ OPTIMAL EXPECTANCY ACTIVE:</strong> The selected strategy shows a positive statistical edge. You can deploy capital using the sizing guide above.
                </div>
              ) : (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  color: '#ef4444'
                }}>
                  <strong>🚨 NEGATIVE EXPECTANCY WARNING:</strong> This setup is currently underperforming in backtest stats. **Reduce trade size to minimum** or stay cash until win rate recovers.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>
                  Risk Rules Checklist:
                </span>
                <span>• **Max Position Size:** Never risk more than 2% of capital on any option swing trade.</span>
                <span>• **Index Confluence:** Ensure Nifty/Bank Nifty trend matches your trade direction.</span>
                <span>• **Time Filter:** Do not chase G-Period breakouts before candle confirmation.</span>
              </div>
            </div>
          </div>

          {/* Trade Log Table */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
              Closed Signals & Trade Log ({filteredSignals.filter(s => s.status !== 'ACTIVE').length})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Symbol</th>
                    <th style={{ padding: '8px' }}>Strategy</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px' }}>Direction</th>
                    <th style={{ padding: '8px' }}>Entry</th>
                    <th style={{ padding: '8px' }}>SL / Target</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>PnL (Pts)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals
                    .filter(s => s.status !== 'ACTIVE')
                    .slice(0, 30)
                    .map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{s.resolvedDate || s.createdDate}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{s.symbol}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{s.strategy}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{s.type}</td>
                        <td style={{ 
                          padding: '8px', 
                          fontWeight: 'bold',
                          color: s.direction === 'LONG' || s.direction === 'BUY' ? '#10b981' : '#ef4444' 
                        }}>
                          {s.direction}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{s.entry.toFixed(2)}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                          {s.sl.toFixed(1)} / {s.target.toFixed(1)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '9px',
                            backgroundColor: s.status === 'TARGET_HIT' 
                              ? 'rgba(16, 185, 129, 0.12)' 
                              : 'rgba(239, 68, 68, 0.12)',
                            color: s.status === 'TARGET_HIT' ? '#10b981' : '#ef4444'
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          textAlign: 'right', 
                          fontWeight: 'bold',
                          color: (s.pnlPoints || 0) >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {(s.pnlPoints || 0) >= 0 ? `+${(s.pnlPoints || 0).toFixed(1)}` : (s.pnlPoints || 0).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
