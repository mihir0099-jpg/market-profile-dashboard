import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Cpu, Layers, Target, Award, Zap, Activity, Clock } from 'lucide-react';
import { getApiBase } from '../utils/apiConfig';

interface AnalogueDay {
  date: string;
  symbol: string;
  matchPercentage: number;
  ibWidth: number;
  openType: string;
  pcrDrift: number;
  afternoonOutcome: string;
  nextDayGap: string;
}

interface TimesFmProjection {
  targetPrice: number;
  hitProbability: number;
  confidenceInterval: string;
  tradingAction: string;
}

interface TftWeight {
  feature: string;
  weightPct: number;
  impact: string;
}

interface AiAnalyticsData {
  symbol: string;
  cleanSymbol: string;
  engineStatus: string;
  executionLatencyMs: number;
  indexedProfilesCount: number;
  matchedAnalogueDays: AnalogueDay[];
  timesFmProjections: {
    fib1618: TimesFmProjection;
    fib2618: TimesFmProjection;
    fib3618: TimesFmProjection;
  };
  tftFeatureWeights: TftWeight[];
  backtestBenchmarks: {
    insideValuePocReversionWinRate: number;
    outsideValueGapTrapReversalRate: number;
    narrowIbExtensionRate: number;
    periodCBreakoutWinRate: number;
  };
  lastUpdated: string;
}

interface AiAnalyticsTabProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
}

const API_BASE = getApiBase();

export const AiAnalyticsTab: React.FC<AiAnalyticsTabProps> = ({ currentSymbol, onSelectSymbol }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(currentSymbol || 'NSE:NIFTY');
  const [data, setData] = useState<AiAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAiData = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/analytics?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Failed to load AI analytics data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching AI analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData(selectedSymbol);
    const interval = setInterval(() => {
      fetchAiData(selectedSymbol);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    onSelectSymbol(sym);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
      
      {/* Header Controls */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, rgba(13, 16, 23, 0.8), rgba(22, 27, 34, 0.8))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={22} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
              Market Profile AI Analytics Engine
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              TS2Vec Vector Analogue Matcher • TimesFM Probabilistic Forecaster • TFT Dynamic Feature Weights
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="custom-input custom-select"
            value={selectedSymbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            style={{ padding: '8px 32px 8px 14px', fontSize: '13px', fontWeight: '600', minWidth: '160px' }}
          >
            <option value="NSE:NIFTY">NIFTY 50</option>
            <option value="NSE:BANKNIFTY">BANK NIFTY</option>
            <option value="NSE:RELIANCE">RELIANCE</option>
            <option value="NSE:HDFCBANK">HDFC BANK</option>
            <option value="NSE:SBIN">SBI</option>
            <option value="NSE:TCS">TCS</option>
            <option value="NSE:INFY">INFOSYS</option>
          </select>

          <button
            onClick={() => fetchAiData(selectedSymbol)}
            className="custom-button"
            style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh AI
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="glass-panel" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-blue)" />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Running TS2Vec vector embedding search & TimesFM probabilistic forecast...</span>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
          <span>{error}</span>
        </div>
      ) : data ? (
        <>
          {/* Status & Latency Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Engine Status</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> {data.engineStatus}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Query Latency (DuckDB Engine)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="var(--accent-blue)" /> {data.executionLatencyMs} ms (Sub-15ms Columnar Memory Execution)
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid var(--accent-purple)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Indexed Historical Sessions</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="var(--accent-purple)" /> {data.indexedProfilesCount} Sessions (5-Year TPO & Volatility Memory)
              </div>
            </div>
          </div>

          {/* TS2Vec Top 5 Historical Twin Sessions */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={18} color="var(--accent-blue)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  TS2Vec Vector Analogue Matcher (Top 5 Historical Twin Sessions)
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                Cosine Similarity Search
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.matchedAnalogueDays.map((day, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{day.date}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{day.symbol}</span>
                      <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '600' }}>IB Width: {day.ibWidth} pts</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vector Match:</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{day.matchPercentage}% Match</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${day.matchPercentage}%`, background: 'linear-gradient(90deg, var(--accent-blue), #10b981)', borderRadius: '4px' }}></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '4px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Afternoon Outcome: </span>
                      <strong style={{ color: '#38bdf8' }}>{day.afternoonOutcome}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Next Day Open: </span>
                      <strong style={{ color: '#f59e0b' }}>{day.nextDayGap}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TimesFM Probabilistic Forecast Cards */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target size={18} color="#a78bfa" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  TimesFM Foundation Model Target Reach Probabilities
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                Probabilistic Distributions
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              
              {/* 1.618x Card */}
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid #10b98133', background: 'rgba(16, 185, 129, 0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>1.618x Fibonacci Extension</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    {data.timesFmProjections.fib1618.hitProbability}% Probability
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                  {data.timesFmProjections.fib1618.targetPrice.toLocaleString()} pts
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Confidence: {data.timesFmProjections.fib1618.confidenceInterval}
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontWeight: '600' }}>
                  Action: {data.timesFmProjections.fib1618.tradingAction}
                </div>
              </div>

              {/* 2.618x Card */}
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid #f59e0b33', background: 'rgba(245, 158, 11, 0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b' }}>2.618x Fibonacci Extension</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    {data.timesFmProjections.fib2618.hitProbability}% Probability
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                  {data.timesFmProjections.fib2618.targetPrice.toLocaleString()} pts
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Confidence: {data.timesFmProjections.fib2618.confidenceInterval}
                </div>
                <div style={{ fontSize: '11px', color: '#f59e0b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontWeight: '600' }}>
                  Action: {data.timesFmProjections.fib2618.tradingAction}
                </div>
              </div>

              {/* 3.618x Card */}
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid #ef444433', background: 'rgba(239, 68, 68, 0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>3.618x Fibonacci Extension</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    {data.timesFmProjections.fib3618.hitProbability}% Probability
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                  {data.timesFmProjections.fib3618.targetPrice.toLocaleString()} pts
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Confidence: {data.timesFmProjections.fib3618.confidenceInterval}
                </div>
                <div style={{ fontSize: '11px', color: '#ef4444', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontWeight: '600' }}>
                  Action: {data.timesFmProjections.fib3618.tradingAction}
                </div>
              </div>

            </div>
          </div>

          {/* Temporal Fusion Transformer (TFT) Feature Importance Weights */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={18} color="var(--accent-blue)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  Temporal Fusion Transformer (TFT) Feature Attention Weights
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                Interpretable Attention
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.tftFeatureWeights.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'white', fontWeight: '700' }}>{feat.feature}</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: '800' }}>{feat.weightPct}% Weight</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${feat.weightPct}%`, background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-blue))', borderRadius: '4px' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Impact: {feat.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
