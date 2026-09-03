import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ArrowUpRight, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

interface ScanResult {
  symbol: string;
  otf: 'up' | 'down' | 'none';
  failure: 'c-failure' | 'd-failure' | 'e-failure-high' | 'e-failure-low' | 'none';
  poorExtreme?: 'poor-high' | 'poor-low' | 'poor-both' | 'ab-poor-high' | 'ab-poor-low' | 'ab-poor-both' | 'none';
  narrowIb?: boolean;
  ibRangeClass?: 'small' | 'medium' | 'large';
  dayType?: string;
  pocExhaustion?: boolean;
  threeDayBalance?: boolean;
  kangarooJump?: boolean;
  lateDayDrive?: boolean;
  doubleDistribution?: boolean;
  profileShape?: 'none' | 'P-shape' | 'b-shape';
  eightyPercentRule?: boolean;
  price: number;
  timestamp: string;
  openingType?: string;
  openingTypeDesc?: string;
  breakoutFailure?: 'bull-trap' | 'bear-trap' | 'none';
  breakoutFailureTarget?: number;
  magnetTarget?: 'poor-high' | 'poor-low' | 'none';
  magnetPrice?: number;
  unfinishedAuctions?: {
    poorHighs: { price: number; date: string }[];
    poorLows: { price: number; date: string }[];
  };
}

interface ScannerState {
  status: 'scanning' | 'idle';
  progress: string;
  lastScanTime: string | null;
  results: ScanResult[];
}

interface PatternStat {
  name: string;
  description: string;
  attempts: number;
  successes: number;
  probability: number;
}

interface OpenStatDetails {
  gapUp: number;
  gapDown: number;
  flat: number;
  total: number;
}

interface PatternLearnings {
  lastUpdated: string;
  global?: {
    stats: Record<string, PatternStat>;
    tpoBehaviors?: {
      totalSessions: number;
      highEstablishedByPeriod: Record<string, number>;
      lowEstablishedByPeriod: Record<string, number>;
      ibBreakoutByPeriod: Record<string, number>;
      closingDistribution: {
        aboveVah: number;
        belowVal: number;
        insideValue: number;
        totalSessions: number;
      };
    };
    openStats?: {
      afterAboveVah: OpenStatDetails;
      afterBelowVal: OpenStatDetails;
      afterInsideValue: OpenStatDetails;
    };
    pcrCorrelations?: any;
  };
  symbols?: Record<string, {
    stats: Record<string, PatternStat>;
    tpoBehaviors?: {
      totalSessions: number;
      highEstablishedByPeriod: Record<string, number>;
      lowEstablishedByPeriod: Record<string, number>;
      ibBreakoutByPeriod: Record<string, number>;
      closingDistribution: {
        aboveVah: number;
        belowVal: number;
        insideValue: number;
        totalSessions: number;
      };
    };
    openStats?: {
      afterAboveVah: OpenStatDetails;
      afterBelowVal: OpenStatDetails;
      afterInsideValue: OpenStatDetails;
    };
    pcrCorrelations?: any;
  }>;
  // Legacy support fallback
  stats: Record<string, PatternStat>;
  tpoBehaviors?: {
    totalSessions: number;
    highEstablishedByPeriod: Record<string, number>;
    lowEstablishedByPeriod: Record<string, number>;
    ibBreakoutByPeriod: Record<string, number>;
    closingDistribution: {
      aboveVah: number;
      belowVal: number;
      insideValue: number;
      totalSessions: number;
    };
  };
  openStats?: {
    afterAboveVah: OpenStatDetails;
    afterBelowVal: OpenStatDetails;
    afterInsideValue: OpenStatDetails;
  };
  pcrCorrelations?: any;
}

interface LiveScannerProps {
  onSelectSymbol: (symbol: string) => void;
  currentSymbol: string;
}

// Dynamically resolve backend API base based on origin
const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

export const LiveScanner: React.FC<LiveScannerProps> = ({ onSelectSymbol, currentSymbol }) => {
  const [scannerState, setScannerState] = useState<ScannerState>({
    status: 'idle',
    progress: '0/0',
    lastScanTime: null,
    results: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [learnings, setLearnings] = useState<PatternLearnings | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'otf-up' | 'otf-down' | 'poor-high' | 'poor-low' | 'narrow-ib' | 'exhaustion' | 'balance' | 'kangaroo' | 'late-drive' | 'high-prob' | 'double-dist' | 'p-shape' | 'b-shape' | 'eighty-percent' | 'ib-small' | 'ib-medium' | 'ib-large' | 'traps' | 'magnets'>('all');
  const [statsTab, setStatsTab] = useState<'probabilities' | 'tpo-behavior' | 'open-stats' | 'pcr-sentiment'>('probabilities');
  const [accuracyData, setAccuracyData] = useState<any>(null);

  const getSetupAccuracy = (symbol: string, setupKey: string): number | null => {
    if (!accuracyData) return null;
    if (accuracyData.symbols && accuracyData.symbols[symbol] && accuracyData.symbols[symbol][setupKey]) {
      return accuracyData.symbols[symbol][setupKey].pct;
    }
    if (accuracyData.global && accuracyData.global[setupKey]) {
      return accuracyData.global[setupKey].pct;
    }
    return null;
  };

  const activeLearnings = useMemo(() => {
    if (!learnings) return null;
    const cleanSym = currentSymbol;
    if (learnings.symbols && learnings.symbols[cleanSym]) {
      return learnings.symbols[cleanSym];
    }
    if (learnings.global) {
      return learnings.global;
    }
    return learnings; // fallback
  }, [learnings, currentSymbol]);

  const filteredResults = scannerState.results.filter(res => {
    if (activeTab === 'all') return true;
    if (activeTab === 'otf-up') return res.otf === 'up';
    if (activeTab === 'otf-down') return res.otf === 'down';
    if (activeTab === 'poor-high') {
      return res.poorExtreme && (
        res.poorExtreme === 'poor-high' || 
        res.poorExtreme === 'ab-poor-high' || 
        res.poorExtreme === 'poor-both' || 
        res.poorExtreme === 'ab-poor-both'
      );
    }
    if (activeTab === 'poor-low') {
      return res.poorExtreme && (
        res.poorExtreme === 'poor-low' || 
        res.poorExtreme === 'ab-poor-low' || 
        res.poorExtreme === 'poor-both' || 
        res.poorExtreme === 'ab-poor-both'
      );
    }
    if (activeTab === 'narrow-ib') {
      return res.narrowIb === true;
    }
    if (activeTab === 'ib-small') {
      return res.ibRangeClass === 'small';
    }
    if (activeTab === 'ib-medium') {
      return res.ibRangeClass === 'medium';
    }
    if (activeTab === 'ib-large') {
      return res.ibRangeClass === 'large';
    }
    if (activeTab === 'exhaustion') {
      return res.pocExhaustion === true;
    }
    if (activeTab === 'balance') {
      return res.threeDayBalance === true;
    }
    if (activeTab === 'kangaroo') {
      return res.kangarooJump === true;
    }
    if (activeTab === 'late-drive') {
      return res.lateDayDrive === true;
    }
    if (activeTab === 'double-dist') {
      return res.doubleDistribution === true;
    }
    if (activeTab === 'p-shape') {
      return res.profileShape === 'P-shape';
    }
    if (activeTab === 'b-shape') {
      return res.profileShape === 'b-shape';
    }
    if (activeTab === 'eighty-percent') {
      return res.eightyPercentRule === true;
    }
    if (activeTab === 'traps') {
      return res.breakoutFailure && res.breakoutFailure !== 'none';
    }
    if (activeTab === 'magnets') {
      return res.magnetTarget && res.magnetTarget !== 'none';
    }
    if (activeTab === 'high-prob') {
      return (res.poorExtreme && res.poorExtreme !== 'none') || 
             res.kangarooJump === true || 
             res.failure === 'c-failure' || 
             res.failure === 'd-failure' || 
             res.narrowIb === true ||
             res.doubleDistribution === true ||
             res.eightyPercentRule === true ||
             (res.breakoutFailure && res.breakoutFailure !== 'none') ||
             (res.magnetTarget && res.magnetTarget !== 'none');
    }
    return true;
  });

  const tabStyle = (tab: typeof activeTab) => ({
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '700',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: activeTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
    border: activeTab === tab 
      ? `1px solid ${
          tab === 'otf-up' ? 'var(--color-bull)' 
          : tab === 'otf-down' ? 'var(--color-bear)' 
          : tab === 'poor-high' ? '#f97316'
          : tab === 'poor-low' ? '#3b82f6'
          : tab === 'narrow-ib' ? '#eab308'
          : tab === 'ib-small' ? '#10b981'
          : tab === 'ib-medium' ? '#6366f1'
          : tab === 'ib-large' ? '#fbbf24'
          : tab === 'exhaustion' ? '#f43f5e'
          : tab === 'balance' ? '#ec4899'
          : tab === 'kangaroo' ? '#a855f7'
          : tab === 'late-drive' ? '#06b6d4'
          : tab === 'high-prob' ? '#fbbf24'
          : tab === 'double-dist' ? '#6366f1'
          : tab === 'p-shape' ? '#10b981'
          : tab === 'b-shape' ? '#ef4444'
          : tab === 'eighty-percent' ? '#f59e0b'
          : tab === 'traps' ? '#f43f5e'
          : tab === 'magnets' ? '#c084fc'
          : 'var(--accent-purple)'
        }` 
      : '1px solid rgba(255, 255, 255, 0.05)',
    color: activeTab === tab
      ? (
          tab === 'otf-up' ? 'var(--color-bull)' 
          : tab === 'otf-down' ? 'var(--color-bear)' 
          : tab === 'poor-high' ? '#f97316'
          : tab === 'poor-low' ? '#3b82f6'
          : tab === 'narrow-ib' ? '#eab308'
          : tab === 'ib-small' ? '#10b981'
          : tab === 'ib-medium' ? '#6366f1'
          : tab === 'ib-large' ? '#fbbf24'
          : tab === 'exhaustion' ? '#f43f5e'
          : tab === 'balance' ? '#ec4899'
          : tab === 'kangaroo' ? '#a855f7'
          : tab === 'late-drive' ? '#06b6d4'
          : tab === 'high-prob' ? '#fbbf24'
          : tab === 'double-dist' ? '#6366f1'
          : tab === 'p-shape' ? '#10b981'
          : tab === 'b-shape' ? '#ef4444'
          : tab === 'eighty-percent' ? '#f59e0b'
          : tab === 'traps' ? '#f43f5e'
          : tab === 'magnets' ? '#c084fc'
          : 'white'
        )
      : 'var(--text-secondary)',
    transition: 'all 0.15s ease',
    outline: 'none',
  });

  const fetchScannerState = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scanner`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scanner status: ${response.statusText}`);
      }
      const data = await response.json();
      setScannerState(data);
      setError(null);
    } catch (err: any) {
      console.error('[Scanner UI] Error fetching scanner state:', err);
      setError(err.message || 'Error connecting to scanner API');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatternStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scanner/stats`);
      if (response.ok) {
        const data = await response.json();
        setLearnings(data);
      }
    } catch (err) {
      console.error('[Scanner UI] Error fetching pattern stats:', err);
    }
  };

  const fetchAccuracyScorecard = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scanner/accuracy`);
      if (response.ok) {
        const data = await response.json();
        setAccuracyData(data);
      }
    } catch (err) {
      console.error('[Scanner UI] Error fetching accuracy scorecard:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchScannerState();
    fetchPatternStats();
    fetchAccuracyScorecard();

    // Poll scanner every 5 seconds, stats and accuracy scorecard every 30 seconds
    const interval = setInterval(fetchScannerState, 5000);
    const statsInterval = setInterval(fetchPatternStats, 30000);
    const accuracyInterval = setInterval(fetchAccuracyScorecard, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
      clearInterval(accuracyInterval);
    };
  }, []);

  const getCleanSymbolName = (sym: string) => {
    return sym.includes(':') ? sym.split(':')[1] : sym;
  };

  const badgeStyle = (bgColor: string, textColor: string, borderColor: string) => ({
    fontSize: '11px',
    fontWeight: '800' as const,
    padding: '3px 8px',
    borderRadius: '5px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    backgroundColor: bgColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    whiteSpace: 'nowrap' as const
  });

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent-purple)" />
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, letterSpacing: '-0.3px' }}>
            Bhaichara Live Scanner
          </h2>
        </div>
        
        {scannerState.status === 'scanning' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '600' }}>
            <Loader2 className="animate-spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
            <span>Scanning {scannerState.progress}</span>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Next scan starts soon
          </div>
        )}
      </div>

      {/* Progress Bar (Pulsing when active) */}
      {scannerState.status === 'scanning' && (
        <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '-8px' }}>
          <div 
            style={{ 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
              borderRadius: '2px',
              width: (() => {
                const parts = scannerState.progress.split('/');
                if (parts.length === 2) {
                  const num = parseInt(parts[0], 10);
                  const den = parseInt(parts[1], 10);
                  if (den > 0) return `${Math.round((num / den) * 100)}%`;
                }
                return '0%';
              })(),
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} />
          <span>Scanner backend offline</span>
        </div>
      )}

      {/* Tabs / Filters */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '12px', marginTop: '2px' }}>
        <button onClick={() => setActiveTab('all')} style={tabStyle('all')}>All</button>
        <button onClick={() => setActiveTab('high-prob')} style={tabStyle('high-prob')}>🔥 High Prob</button>
        <button onClick={() => setActiveTab('ib-small')} style={tabStyle('ib-small')}>Small IB</button>
        <button onClick={() => setActiveTab('ib-medium')} style={tabStyle('ib-medium')}>Medium IB</button>
        <button onClick={() => setActiveTab('ib-large')} style={tabStyle('ib-large')}>Large IB</button>
        <button onClick={() => setActiveTab('otf-up')} style={tabStyle('otf-up')}>OTF (Bullish)</button>
        <button onClick={() => setActiveTab('otf-down')} style={tabStyle('otf-down')}>OTF (Bearish)</button>
        <button onClick={() => setActiveTab('poor-high')} style={tabStyle('poor-high')}>Poor High</button>
        <button onClick={() => setActiveTab('poor-low')} style={tabStyle('poor-low')}>Poor Low</button>
        <button onClick={() => setActiveTab('narrow-ib')} style={tabStyle('narrow-ib')}>Narrow IB</button>
        <button onClick={() => setActiveTab('exhaustion')} style={tabStyle('exhaustion')}>Exhaustion</button>
        <button onClick={() => setActiveTab('balance')} style={tabStyle('balance')}>3D Balance</button>
        <button onClick={() => setActiveTab('kangaroo')} style={tabStyle('kangaroo')}>Kangaroo</button>
        <button onClick={() => setActiveTab('late-drive')} style={tabStyle('late-drive')}>Late Drive</button>
        <button onClick={() => setActiveTab('double-dist')} style={tabStyle('double-dist')}>Double Dist</button>
        <button onClick={() => setActiveTab('p-shape')} style={tabStyle('p-shape')}>P-Shape</button>
        <button onClick={() => setActiveTab('b-shape')} style={tabStyle('b-shape')}>b-Shape</button>
        <button onClick={() => setActiveTab('eighty-percent')} style={tabStyle('eighty-percent')}>80% VA</button>
        <button onClick={() => setActiveTab('traps')} style={tabStyle('traps')}>🛑 Traps</button>
        <button onClick={() => setActiveTab('magnets')} style={tabStyle('magnets')}>🧲 Magnets</button>
      </div>

      {/* Matches List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
        {loading && scannerState.results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Loading scanner state...
          </div>
        ) : scannerState.results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
            <HelpCircle size={24} style={{ opacity: 0.4 }} />
            <div>No active OTF Failed Auctions found.</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Scanner is running sequentially in the background.</div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
            <HelpCircle size={24} style={{ opacity: 0.4 }} />
            <div>No stocks match this filter.</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Try selecting a different filter option above.</div>
          </div>
        ) : (
          filteredResults.map((res) => (
            <div 
              key={res.symbol}
              onClick={() => onSelectSymbol(res.symbol)}
              className="scanner-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Left Column: Symbol & Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getCleanSymbolName(res.symbol)}
                  <ArrowUpRight size={12} color="var(--text-muted)" style={{ opacity: 0.7 }} />
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{res.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Right Column: Badges */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '200px' }}>
                {/* Opening Drive Badge */}
                {res.openingType && res.openingType !== 'Open Auction (OA)' && (
                  <span 
                    style={badgeStyle(
                      res.openingType.includes('Bullish') ? 'rgba(16, 185, 129, 0.1)' 
                        : res.openingType.includes('Bearish') ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(99, 102, 241, 0.1)',
                      res.openingType.includes('Bullish') ? 'var(--color-bull)' 
                        : res.openingType.includes('Bearish') ? 'var(--color-bear)' 
                        : '#6366f1',
                      res.openingType.includes('Bullish') ? 'rgba(16, 185, 129, 0.2)' 
                        : res.openingType.includes('Bearish') ? 'rgba(239, 68, 68, 0.2)' 
                        : 'rgba(99, 102, 241, 0.2)'
                    )}
                    title={res.openingTypeDesc}
                  >
                    {res.openingType.includes('Open Drive') ? 'OD' : 'OTD'}
                  </span>
                )}

                {/* Breakout Failure / Trap Badge */}
                {res.breakoutFailure && res.breakoutFailure !== 'none' && (
                  <span 
                    style={badgeStyle(
                      res.breakoutFailure === 'bull-trap' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      res.breakoutFailure === 'bull-trap' ? '#ef4444' : '#10b981',
                      res.breakoutFailure === 'bull-trap' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'
                    )}
                    title={`Breakout Failure target ₹${res.breakoutFailureTarget}`}
                  >
                    {res.breakoutFailure === 'bull-trap' ? 'Bull Trap 🔴' : 'Bear Trap 🟢'}
                  </span>
                )}

                {/* Magnet Badge */}
                {res.magnetTarget && res.magnetTarget !== 'none' && (
                  <span 
                    style={badgeStyle(
                      'rgba(168, 85, 247, 0.12)',
                      '#c084fc',
                      'rgba(168, 85, 247, 0.25)'
                    )}
                    title={`Unfinished Poor Extreme Target ₹${res.magnetPrice}`}
                  >
                    🧲 Magnet
                  </span>
                )}

                {/* OTF Badge */}
                {res.otf !== 'none' && (
                  <span 
                    style={badgeStyle(
                      res.otf === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      res.otf === 'up' ? 'var(--color-bull)' : 'var(--color-bear)',
                      res.otf === 'up' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                    )}
                  >
                    OTF {res.otf}
                  </span>
                )}

                {/* Failure Badge */}
                {res.failure && res.failure !== 'none' && (
                  <span 
                    style={badgeStyle(
                      res.failure === 'c-failure' ? 'rgba(239, 68, 68, 0.1)' 
                        : res.failure === 'd-failure' ? 'rgba(139, 92, 246, 0.1)' 
                        : 'rgba(245, 158, 11, 0.1)',
                      res.failure === 'c-failure' ? '#f87171' 
                        : res.failure === 'd-failure' ? 'var(--accent-purple)' 
                        : '#f59e0b',
                      res.failure === 'c-failure' ? 'rgba(239, 68, 68, 0.2)' 
                        : res.failure === 'd-failure' ? 'rgba(139, 92, 246, 0.2)' 
                        : 'rgba(245, 158, 11, 0.2)'
                    )}
                  >
                    {(() => {
                      const label = res.failure === 'c-failure' ? 'c-Fail' 
                        : res.failure === 'd-failure' ? 'd-Fail' 
                        : 'e-Fail';
                      const key = res.failure === 'c-failure' ? 'cFailure'
                        : res.failure === 'd-failure' ? 'dFailure'
                        : 'eFailure';
                      const acc = getSetupAccuracy(res.symbol, key);
                      return acc !== null ? `${label} (${acc}%)` : label;
                    })()}
                  </span>
                )}

                {/* Poor Extreme Badge */}
                {res.poorExtreme && res.poorExtreme !== 'none' && (
                  <span 
                    style={badgeStyle(
                      res.poorExtreme.startsWith('ab-poor') ? 'rgba(249, 115, 22, 0.1)' : 'rgba(156, 163, 175, 0.08)',
                      res.poorExtreme.startsWith('ab-poor') ? '#f97316' : 'var(--text-secondary)',
                      res.poorExtreme.startsWith('ab-poor') ? 'rgba(249, 115, 22, 0.25)' : 'rgba(156, 163, 175, 0.15)'
                    )}
                  >
                    {(() => {
                      let label = 'Poor';
                      let key = 'poorHigh';
                      switch (res.poorExtreme) {
                        case 'ab-poor-high': label = 'AB Poor High'; key = 'poorHigh'; break;
                        case 'ab-poor-low': label = 'AB Poor Low'; key = 'poorLow'; break;
                        case 'ab-poor-both': label = 'AB Poor H/L'; key = 'poorHigh'; break;
                        case 'poor-high': label = 'Poor High'; key = 'poorHigh'; break;
                        case 'poor-low': label = 'Poor Low'; key = 'poorLow'; break;
                        case 'poor-both': label = 'Poor H/L'; key = 'poorHigh'; break;
                      }
                      const acc = getSetupAccuracy(res.symbol, key);
                      return acc !== null ? `${label} (${acc}%)` : label;
                    })()}
                  </span>
                )}

                {/* Narrow IB Badge */}
                {res.narrowIb && (
                  <span 
                    style={badgeStyle(
                      'rgba(234, 179, 8, 0.1)',
                      '#eab308',
                      'rgba(234, 179, 8, 0.2)'
                    )}
                  >
                    {(() => {
                      const acc = getSetupAccuracy(res.symbol, 'narrowIb');
                      return acc !== null ? `Narrow IB (${acc}%)` : 'Narrow IB';
                    })()}
                  </span>
                )}

                {/* POC Exhaustion Badge */}
                {res.pocExhaustion && (
                  <span 
                    style={badgeStyle(
                      'rgba(244, 63, 94, 0.1)',
                      '#f43f5e',
                      'rgba(244, 63, 94, 0.2)'
                    )}
                  >
                    Exhaustion
                  </span>
                )}

                {/* 3-Day Balance Badge */}
                {res.threeDayBalance && (
                  <span 
                    style={badgeStyle(
                      'rgba(236, 72, 153, 0.1)',
                      '#ec4899',
                      'rgba(236, 72, 153, 0.2)'
                    )}
                  >
                    3D Balance
                  </span>
                )}

                {/* Kangaroo Jump Badge */}
                {res.kangarooJump && (
                  <span 
                    style={badgeStyle(
                      'rgba(168, 85, 247, 0.1)',
                      '#a855f7',
                      'rgba(168, 85, 247, 0.2)'
                    )}
                  >
                    {(() => {
                      const acc = getSetupAccuracy(res.symbol, 'kangarooJump');
                      return acc !== null ? `Kangaroo (${acc}%)` : 'Kangaroo';
                    })()}
                  </span>
                )}

                {/* Late Day Drive Badge */}
                {res.lateDayDrive && (
                  <span 
                    style={badgeStyle(
                      'rgba(6, 182, 212, 0.1)',
                      '#06b6d4',
                      'rgba(6, 182, 212, 0.2)'
                    )}
                  >
                    Late Drive
                  </span>
                )}

                {/* Double Distribution Badge */}
                {res.doubleDistribution && (
                  <span 
                    style={badgeStyle(
                      'rgba(99, 102, 241, 0.1)',
                      '#6366f1',
                      'rgba(99, 102, 241, 0.2)'
                    )}
                  >
                    Double Dist
                  </span>
                )}

                {/* Profile Shape Badge */}
                {res.profileShape && res.profileShape !== 'none' && (
                  <span 
                    style={badgeStyle(
                      res.profileShape === 'P-shape' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      res.profileShape === 'P-shape' ? '#10b981' : '#ef4444',
                      res.profileShape === 'P-shape' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                    )}
                  >
                    {res.profileShape === 'P-shape' ? 'Short Cover (P)' : 'Long Liq (b)'}
                  </span>
                )}

                {/* 80% Rule Badge */}
                {res.eightyPercentRule && (
                  <span 
                    style={badgeStyle(
                      'rgba(245, 158, 11, 0.1)',
                      '#f59e0b',
                      'rgba(245, 158, 11, 0.2)'
                    )}
                  >
                    {(() => {
                      const acc = getSetupAccuracy(res.symbol, 'eightyPercentRule');
                      return acc !== null ? `80% VA (${acc}%)` : '80% VA Entry';
                    })()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Symbol Live Scanner Details */}
      {(() => {
        const res = scannerState.results.find(r => r.symbol === currentSymbol);
        if (!res) return null;
        return (
          <div style={{
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#10b981' }}>
                ⚡ Live Metrics: {getCleanSymbolName(res.symbol)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                ₹{res.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Opening Conviction */}
            {res.openingType && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Opening Drive:</span>
                  <span style={{ fontWeight: '700', color: res.openingType.includes('Bullish') ? 'var(--color-bull)' : res.openingType.includes('Bearish') ? 'var(--color-bear)' : '#9ca3af' }}>
                    {res.openingType}
                  </span>
                </div>
                {res.openingTypeDesc && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{res.openingTypeDesc}</span>
                )}
              </div>
            )}

            {/* Breakout Failure / Traps */}
            {res.breakoutFailure && res.breakoutFailure !== 'none' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', backgroundColor: res.breakoutFailure === 'bull-trap' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${res.breakoutFailure === 'bull-trap' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`, fontSize: '12px' }}>
                <span style={{ fontWeight: '700', color: res.breakoutFailure === 'bull-trap' ? '#ef4444' : '#10b981' }}>
                  {res.breakoutFailure === 'bull-trap' ? '🛑 Bull Trap Active' : '🚀 Bear Trap Active'}
                </span>
                <span style={{ color: 'white', fontWeight: '600' }}>
                  Target: ₹{res.breakoutFailureTarget ? res.breakoutFailureTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            )}

            {/* Magnet Radar */}
            {res.magnetTarget && res.magnetTarget !== 'none' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)', fontSize: '12px' }}>
                <span style={{ fontWeight: '700', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🧲 Poor {res.magnetTarget === 'poor-high' ? 'High' : 'Low'} Magnet
                </span>
                <span style={{ color: 'white', fontWeight: '600' }}>
                  Target: ₹{res.magnetPrice ? res.magnetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            )}

            {/* Unresolved Poor Extremes List */}
            {res.unfinishedAuctions && (res.unfinishedAuctions.poorHighs.length > 0 || res.unfinishedAuctions.poorLows.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Unrepaired Poor Extremes (Magnets):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '80px', overflowY: 'auto' }}>
                  {res.unfinishedAuctions.poorHighs.map((h, i) => (
                    <div key={`ph-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#f97316' }}>
                      <span>🔴 Poor High ({h.date})</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>₹{h.price.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {res.unfinishedAuctions.poorLows.map((l, i) => (
                    <div key={`pl-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3b82f6' }}>
                      <span>🔵 Poor Low ({l.date})</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>₹{l.price.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* AI Auto-Learned Probabilities & TPO Behavior Section */}
      {learnings && (
        <div style={{
          marginTop: '8px',
          padding: '12px 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {/* Section Header with Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px' }} title={currentSymbol}>
              🤖 AI Learning: {learnings.symbols?.[currentSymbol] ? currentSymbol.split(':').pop() : 'Global'}
            </span>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '6px' }}>
              <button 
                onClick={() => setStatsTab('probabilities')}
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: statsTab === 'probabilities' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: statsTab === 'probabilities' ? 'white' : 'var(--text-muted)',
                }}
              >
                Setups
              </button>
              <button 
                onClick={() => setStatsTab('tpo-behavior')}
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: statsTab === 'tpo-behavior' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: statsTab === 'tpo-behavior' ? 'white' : 'var(--text-muted)',
                }}
              >
                TPO Analysis
              </button>
              <button 
                onClick={() => setStatsTab('open-stats')}
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: statsTab === 'open-stats' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: statsTab === 'open-stats' ? 'white' : 'var(--text-muted)',
                }}
              >
                Open Stats
              </button>
              <button 
                onClick={() => setStatsTab('pcr-sentiment')}
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: statsTab === 'pcr-sentiment' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: statsTab === 'pcr-sentiment' ? 'white' : 'var(--text-muted)',
                }}
              >
                PCR Sentiment
              </button>
            </div>
          </div>

          {statsTab === 'probabilities' && activeLearnings && activeLearnings.stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(activeLearnings.stats).map((stat: any) => (
                <div key={stat.name} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }} title={stat.description}>
                      {stat.name}
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '800', 
                      color: stat.probability > 70 ? 'var(--color-bull)' : stat.probability > 45 ? '#f59e0b' : '#ef4444' 
                    }}>
                      {stat.probability}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${stat.probability}%`,
                      height: '100%',
                      backgroundColor: stat.probability > 70 ? 'var(--color-bull)' : stat.probability > 45 ? '#f59e0b' : '#ef4444',
                      borderRadius: '2px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {statsTab === 'tpo-behavior' && activeLearnings && activeLearnings.tpoBehaviors && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              
              {/* Closing Placement Distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                  <span>Closing Distribution (VAH / VAL)</span>
                  <span style={{ color: 'white' }}>N={activeLearnings.tpoBehaviors.closingDistribution.totalSessions} sessions</span>
                </div>
                <div style={{ width: '100%', height: '14px', display: 'flex', borderRadius: '4px', overflow: 'hidden', fontSize: '10px', fontWeight: '800', color: 'white', textAlign: 'center', lineHeight: '14px' }}>
                  <div style={{ width: `${activeLearnings.tpoBehaviors.closingDistribution.aboveVah}%`, backgroundColor: 'rgba(16, 185, 129, 0.3)', borderRight: '1px solid rgba(255,255,255,0.1)' }} title="Close Above VAH">
                    {activeLearnings.tpoBehaviors.closingDistribution.aboveVah > 10 ? `Above VAH ${activeLearnings.tpoBehaviors.closingDistribution.aboveVah}%` : ''}
                  </div>
                  <div style={{ width: `${activeLearnings.tpoBehaviors.closingDistribution.insideValue}%`, backgroundColor: 'rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.1)' }} title="Close Inside Value">
                    {activeLearnings.tpoBehaviors.closingDistribution.insideValue > 10 ? `Inside Value ${activeLearnings.tpoBehaviors.closingDistribution.insideValue}%` : ''}
                  </div>
                  <div style={{ width: `${activeLearnings.tpoBehaviors.closingDistribution.belowVal}%`, backgroundColor: 'rgba(239, 68, 68, 0.3)' }} title="Close Below VAL">
                    {activeLearnings.tpoBehaviors.closingDistribution.belowVal > 10 ? `Below VAL ${activeLearnings.tpoBehaviors.closingDistribution.belowVal}%` : ''}
                  </div>
                </div>
              </div>

              {/* Day extremes by Period Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Day High/Low Established By Period
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px' }}>
                  {['A', 'B', 'C', 'L', 'M'].map(p => {
                    const hi = activeLearnings.tpoBehaviors?.highEstablishedByPeriod[p] || 0;
                    const lo = activeLearnings.tpoBehaviors?.lowEstablishedByPeriod[p] || 0;
                    return (
                      <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '4px' }}>
                        <span style={{ fontWeight: '800', color: 'var(--accent-purple)' }}>{p}</span>
                        <span style={{ fontSize: '10px', color: '#10b981' }}>H:{hi}%</span>
                        <span style={{ fontSize: '10px', color: '#ef4444' }}>L:{lo}%</span>
                      </div>
                    );
                  })}
                  
                  {/* Rest periods grouped */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '4px' }}>
                    <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>Others</span>
                    <span style={{ fontSize: '10px', color: '#10b981' }}>H:{Math.round((100 - (['A','B','C','L','M'].reduce((acc, p) => acc + (activeLearnings.tpoBehaviors?.highEstablishedByPeriod[p] || 0), 0))) * 10) / 10}%</span>
                    <span style={{ fontSize: '10px', color: '#ef4444' }}>L:{Math.round((100 - (['A','B','C','L','M'].reduce((acc, p) => acc + (activeLearnings.tpoBehaviors?.lowEstablishedByPeriod[p] || 0), 0))) * 10) / 10}%</span>
                  </div>
                </div>
              </div>

              {/* Initial Balance Breakouts Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                  <span>IB Breakout Timeline Probability</span>
                  <span style={{ color: 'var(--color-bull)' }}>Max: {activeLearnings.tpoBehaviors.ibBreakoutByPeriod.L}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Period C: {activeLearnings.tpoBehaviors.ibBreakoutByPeriod.C}%</span>
                  <span>Period G: {activeLearnings.tpoBehaviors.ibBreakoutByPeriod.G}%</span>
                  <span>Period K: {activeLearnings.tpoBehaviors.ibBreakoutByPeriod.K}%</span>
                </div>
              </div>

            </div>
          )}

          {statsTab === 'open-stats' && activeLearnings && activeLearnings.openStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
              
              {/* Closing Above VAH probabilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>
                  <span>Prev Day Closed Above VAH</span>
                  <span style={{ color: 'var(--text-muted)' }}>N={activeLearnings.openStats.afterAboveVah.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>🚀 Gap Up: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterAboveVah.gapUp}%</strong></span>
                  <span>📉 Gap Down: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterAboveVah.gapDown}%</strong></span>
                  <span>↔️ Flat/Range: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterAboveVah.flat}%</strong></span>
                </div>
              </div>

              {/* Closing Below VAL probabilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>
                  <span>Prev Day Closed Below VAL</span>
                  <span style={{ color: 'var(--text-muted)' }}>N={activeLearnings.openStats.afterBelowVal.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>📉 Gap Down: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterBelowVal.gapDown}%</strong></span>
                  <span>🚀 Gap Up: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterBelowVal.gapUp}%</strong></span>
                  <span>↔️ Flat/Range: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterBelowVal.flat}%</strong></span>
                </div>
              </div>

              {/* Closing Inside Value Area probabilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>
                  <span>Prev Day Closed Inside Value</span>
                  <span style={{ color: 'var(--text-muted)' }}>N={activeLearnings.openStats.afterInsideValue.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>↔️ Flat/Range: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterInsideValue.flat}%</strong></span>
                  <span>🚀 Gap Up: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterInsideValue.gapUp}%</strong></span>
                  <span>📉 Gap Down: <strong style={{ color: 'white' }}>{activeLearnings.openStats.afterInsideValue.gapDown}%</strong></span>
                </div>
              </div>

            </div>
          )}

          {statsTab === 'pcr-sentiment' && learnings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PCR Sentiment Correlations (Global)
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  N={
                    (learnings.global?.pcrCorrelations?.extremeFear?.attempts || 0) + 
                    (learnings.global?.pcrCorrelations?.extremeGreed?.attempts || 0) + 
                    (learnings.global?.pcrCorrelations?.neutral?.attempts || 0)
                  } sessions
                </span>
              </div>

              {/* Extreme Fear */}
              {learnings.global?.pcrCorrelations?.extremeFear && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>😨 Extreme Fear (PCR &ge; 1.25)</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{learnings.global.pcrCorrelations.extremeFear.attempts} days</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GREEN CLOSE</span>
                      <strong style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeFear.bullishCloseProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>TOUCH POC</span>
                      <strong style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeFear.meanReversionProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GAP FILL</span>
                      <strong style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeFear.gapFillProb}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Extreme Greed */}
              {learnings.global?.pcrCorrelations?.extremeGreed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>🤑 Extreme Greed (PCR &le; 0.65)</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{learnings.global.pcrCorrelations.extremeGreed.attempts} days</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GREEN CLOSE</span>
                      <strong style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeGreed.bullishCloseProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>TOUCH POC</span>
                      <strong style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeGreed.meanReversionProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GAP FILL</span>
                      <strong style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>{learnings.global.pcrCorrelations.extremeGreed.gapFillProb}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Neutral Balance */}
              {learnings.global?.pcrCorrelations?.neutral && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>⚖️ Neutral Balance (0.65 &lt; PCR &lt; 1.25)</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{learnings.global.pcrCorrelations.neutral.attempts} days</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GREEN CLOSE</span>
                      <strong style={{ fontSize: '11px', color: 'white', marginTop: '2px' }}>{learnings.global.pcrCorrelations.neutral.bullishCloseProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>TOUCH POC</span>
                      <strong style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>{learnings.global.pcrCorrelations.neutral.meanReversionProb}%</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>GAP FILL</span>
                      <strong style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>{learnings.global.pcrCorrelations.neutral.gapFillProb}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
            Last Run: {learnings.lastUpdated}
          </div>
        </div>
      )}

      {/* Footer Meta */}
      {scannerState.lastScanTime && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <span>Active matches: {scannerState.results.length}</span>
          <span>Last scan: {scannerState.lastScanTime}</span>
        </div>
      )}

      {/* Custom hover CSS */}
      <style>{`
        .scanner-row:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: var(--border-hover) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};