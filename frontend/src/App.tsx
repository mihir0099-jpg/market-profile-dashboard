import { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { StatsPanel } from './components/StatsPanel';
import { LiveScanner } from './components/LiveScanner';
import { ChartContainer } from './components/ChartContainer';
import { MarketProfile } from './components/MarketProfile';
import { tvStreamer } from './utils/tvStreamer';
import { calculateDayProfile, groupCandlesByDay, groupCandlesByWeek, groupCandlesByMonth, analyzeProfileNuances, getSinglePrintsForProfile, getFailedAuctionForProfile } from './utils/profileCalculator';
import type { Candle } from './utils/profileCalculator';
import { AlertCircle, Loader2 } from 'lucide-react';
import { GexProfile } from './components/GexProfile';
import { PcrProfile } from './components/PcrProfile';
import { BtstReport } from './components/BtstReport';
import { NineAmReport } from './components/NineAmReport';
import { OptionsTab } from './components/OptionsTab';
import { DailyReports } from './components/DailyReports';
import { MonthlyProfileTab } from './components/MonthlyProfileTab';


// Dynamically resolve backend API base based on origin
const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

function App() {
  const [symbol, setSymbol] = useState('NSE:NIFTY');
  const [timeframe, setTimeframe] = useState('30'); // Default to 30-minute interval
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [profileType, setProfileType] = useState<'tpo-collapsed' | 'tpo-split' | 'volume'>('tpo-collapsed');
  const [binCount, setBinCount] = useState<number>(40);
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [viewerCount, setViewerCount] = useState<number>(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePriceRange, setVisiblePriceRange] = useState<{ min: number; max: number; paneHeight: number } | null>(null);
  const [sessionPeriod, setSessionPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // GEX & PCR State variables
  const [viewMode, setViewMode] = useState<'profile' | 'gex' | 'btst' | 'pcr' | 'nineam' | 'options' | 'reports' | 'monthly'>('profile');

  const [gexExpiries, setGexExpiries] = useState<string[]>([]);
  const [selectedGexExpiry, setSelectedGexExpiry] = useState<string>('');
  const [gexData, setGexData] = useState<any>(null);
  const [gexLoading, setGexLoading] = useState(false);
  const [pcrData, setPcrData] = useState<any>(null);
  const [pcrLoading, setPcrLoading] = useState(false);
  const [optimalTicks, setOptimalTicks] = useState<Record<string, number>>({});

  // Fetch optimal dynamic ticks once on startup
  useEffect(() => {
    const fetchTicks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scanner/ticks`);
        if (res.ok) {
          const ticksMap = await res.json();
          setOptimalTicks(ticksMap);
        }
      } catch (e) {
        console.warn('Failed to load dynamic optimal ticks:', e);
      }
    };
    fetchTicks();
  }, []);

  // Subscribe to real-time viewer count updates
  useEffect(() => {
    tvStreamer.setViewerCountListener((count) => {
      setViewerCount(count);
    });
  }, []);

  // Subscribe to symbol data via TradingView WebSocket
  useEffect(() => {
    setLoading(true);
    setError(null);
    setCandles([]);

    // Update connection status callback
    tvStreamer.setStatusListener((status) => {
      setConnectionStatus(status);
    });

    const activeTimeframe = timeframe;

    // Start streaming
    tvStreamer.subscribe(
      symbol,
      activeTimeframe,
      (data) => {
        setLoading(false);
        setError(null);
        if (data.candles && data.candles.length > 0) {
          setCandles((prevCandles) => {
            if (data.isSnapshot) {
              return data.candles;
            } else {
              const tick = data.candles[0];
              const index = prevCandles.findIndex((c) => c.time === tick.time);
              if (index !== -1) {
                const updated = [...prevCandles];
                updated[index] = tick;
                return updated;
              } else {
                return [...prevCandles, tick];
              }
            }
          });
        }
      },
      (err) => {
        setLoading(false);
        setError(err);
      }
    );

    return () => {
      tvStreamer.unsubscribe();
    };
  }, [symbol, timeframe, viewMode, refreshKey]);

  // Fetch GEX expiries on symbol change
  useEffect(() => {
    const isNseSymbol = symbol.startsWith('NSE:');
    if (!isNseSymbol) {
      setGexExpiries([]);
      setSelectedGexExpiry('');
      setGexData(null);
      return;
    }

    const fetchGexExpiries = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/gex/expiries?symbol=${symbol}`);
        const data = await res.json();
        if (data.expiries && data.expiries.length > 0) {
          setGexExpiries(data.expiries);
          setSelectedGexExpiry(data.expiries[0]);
        } else {
          setGexExpiries([]);
          setSelectedGexExpiry('');
          setGexData(null);
        }
      } catch (err) {
        console.error('Failed to fetch GEX expiries:', err);
        setGexExpiries([]);
        setSelectedGexExpiry('');
        setGexData(null);
      }
    };

    fetchGexExpiries();
  }, [symbol]);

  // Fetch GEX data on symbol or expiry change
  useEffect(() => {
    const isNseSymbol = symbol.startsWith('NSE:');
    if (!selectedGexExpiry || !isNseSymbol) {
      setGexData(null);
      return;
    }

    const fetchGexData = async () => {
      setGexLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/gex/data?symbol=${symbol}&expiry=${selectedGexExpiry}`);
        const data = await res.json();
        if (!data.error) {
          setGexData(data);
        } else {
          setGexData(null);
        }
      } catch (err) {
        console.error('Failed to fetch GEX data:', err);
        setGexData(null);
      } finally {
        setGexLoading(false);
      }
    };

    fetchGexData();
    const interval = setInterval(fetchGexData, 120 * 1000);
    return () => clearInterval(interval);
  }, [symbol, selectedGexExpiry]);

  // Fetch PCR data on symbol or expiry change
  useEffect(() => {
    const isNseSymbol = symbol.startsWith('NSE:');
    if (!isNseSymbol) {
      setPcrData(null);
      return;
    }

    const fetchPcrData = async () => {
      setPcrLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/pcr/data?symbol=${symbol}&expiry=${selectedGexExpiry}`);
        const data = await res.json();
        if (!data.error) {
          setPcrData(data);
        } else {
          setPcrData(null);
        }
      } catch (err) {
        console.error('Failed to fetch PCR data:', err);
        setPcrData(null);
      } finally {
        setPcrLoading(false);
      }
    };

    fetchPcrData();
    const interval = setInterval(fetchPcrData, 120 * 1000);
    return () => clearInterval(interval);
  }, [symbol, selectedGexExpiry]);

  // Compute session profiles (daily, weekly, monthly) from candles
  const dayProfiles = useMemo(() => {
    if (candles.length === 0) return [];
    
    try {
      let groups: Record<string, Candle[]> = {};
      if (sessionPeriod === 'weekly') {
        groups = groupCandlesByWeek(candles);
      } else if (sessionPeriod === 'monthly') {
        groups = groupCandlesByMonth(candles);
      } else {
        groups = groupCandlesByDay(candles);
      }
      
      const profiles = Object.entries(groups).map(([dateStr, dayCandles]) => {
        const optimalTick = optimalTicks[symbol] || undefined;
        return calculateDayProfile(dateStr, dayCandles, binCount, sessionPeriod, undefined, optimalTick, symbol);
      });
      
      // Filter out null profiles if any calculation error occurred
      const validProfiles = profiles.filter((p): p is NonNullable<typeof p> => p !== null && p.bins && p.bins.length > 0);

      // Sort profiles newest to oldest by starting timestamp
      return validProfiles.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    } catch (err: any) {
      console.error('Error calculating session profiles:', err);
      setError(`Calculation error: ${err.message || err}`);
      return [];
    }
  }, [candles, binCount, sessionPeriod, optimalTicks]);

  // Automatically select the latest date as active when data loads
  useEffect(() => {
    if (dayProfiles.length > 0) {
      if (!activeDateStr || !dayProfiles.some(p => p.dateStr === activeDateStr)) {
        setActiveDateStr(dayProfiles[0].dateStr);
      }
    }
  }, [dayProfiles, activeDateStr]);

  // Get current active profile
  const activeProfile = useMemo(() => {
    if (dayProfiles.length === 0) return null;
    return dayProfiles.find(p => p.dateStr === activeDateStr) || dayProfiles[0];
  }, [dayProfiles, activeDateStr]);

  // Compute prior profile and nuances for activeProfile
  const { priorProfile, nuances } = useMemo(() => {
    if (!activeProfile || dayProfiles.length === 0) return { priorProfile: null, nuances: null };
    const activeIdx = dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr);
    const prior = activeIdx !== -1 && activeIdx < dayProfiles.length - 1 ? dayProfiles[activeIdx + 1] : null;
    const nuances = analyzeProfileNuances(activeProfile, prior, dayProfiles);
    return { priorProfile: prior, nuances };
  }, [activeProfile, dayProfiles]);

  // Compute legacy untested POCs (Naked POCs)
  const untestedPocs = useMemo(() => {
    if (!activeProfile || dayProfiles.length === 0) return [];
    const activeIdx = dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr);
    if (activeIdx === -1) return [];
    
    const list: { price: number; date: string }[] = [];
    for (let i = activeIdx + 1; i < dayProfiles.length; i++) {
      const p = dayProfiles[i];
      let tested = false;
      for (let j = i - 1; j >= activeIdx; j--) {
        const testDay = dayProfiles[j];
        if (p.pocPrice >= testDay.dayLow && p.pocPrice <= testDay.dayHigh) {
          tested = true;
          break;
        }
      }
      if (!tested) {
        list.push({ price: p.pocPrice, date: p.dateStr });
      }
    }
    return list;
  }, [dayProfiles, activeProfile]);

  // Compute legacy unfilled Failed Auctions
  const unfilledFailedAuctions = useMemo(() => {
    if (!activeProfile || dayProfiles.length === 0) return [];
    const activeIdx = dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr);
    if (activeIdx === -1) return [];

    interface LegacyFA {
      price: number;
      type: 'high' | 'low';
      date: string;
    }
    let list: LegacyFA[] = [];

    // Loop chronologically forward: from oldest index down to activeIdx
    for (let i = dayProfiles.length - 1; i >= activeIdx; i--) {
      const profile = dayProfiles[i];
      const activeLow = profile.dayLow;
      const activeHigh = profile.dayHigh;

      // 1. Remove/Filter out Failed Auctions that have been crossed by today's price range
      list = list.filter(fa => {
        if (activeLow <= fa.price && activeHigh >= fa.price) {
          return false; // filled, remove
        }
        return true;
      });

      // 2. Add new Failed Auction created on this day (if it's not today/active index)
      if (i > activeIdx) {
        const priorIdx = i + 1;
        const prior = priorIdx < dayProfiles.length ? dayProfiles[priorIdx] : null;
        const nuances = analyzeProfileNuances(profile, prior, dayProfiles);
        
        const fa = getFailedAuctionForProfile(profile, nuances);
        if (fa) {
          list.push({
            price: fa.price,
            type: fa.type,
            date: profile.dateStr
          });
        }
      }
    }

    return list;
  }, [dayProfiles, activeProfile]);

  // Compute legacy unfilled single prints (Sapnas)
  const unfilledSapnas = useMemo(() => {
    if (!activeProfile || dayProfiles.length === 0) return [];
    const activeIdx = dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr);
    if (activeIdx === -1) return [];

    interface LegacySapna {
      start: number;
      end: number;
      date: string;
    }
    let list: LegacySapna[] = [];

    // Loop chronologically forward: from oldest index (dayProfiles.length - 1) down to activeIdx
    for (let i = dayProfiles.length - 1; i >= activeIdx; i--) {
      const profile = dayProfiles[i];
      const activeLow = profile.dayLow;
      const activeHigh = profile.dayHigh;

      // 1. Trim/Remove overlapping Sapnas from the list
      list = list.map(sapna => {
        if (activeLow <= sapna.start && activeHigh >= sapna.end) {
          return null; // completely filled
        }
        
        let newStart = sapna.start;
        let newEnd = sapna.end;
        
        // If overlaps from bottom
        if (activeHigh >= newStart && activeHigh < newEnd) {
          newStart = activeHigh;
        }
        // If overlaps from top
        if (activeLow <= newEnd && activeLow > newStart) {
          newEnd = activeLow;
        }
        
        // If remaining gap is at least 2 ticks wide (using activeProfile.tickSize as a guide)
        const tickSpan = Math.round((newEnd - newStart) / activeProfile.tickSize);
        if (newEnd > newStart && tickSpan >= 2) {
          return { ...sapna, start: newStart, end: newEnd };
        }
        return null;
      }).filter((s): s is LegacySapna => s !== null);

      // 2. Add new single prints created on this day (if it's not today, since today's single prints are still in formation)
      if (i > activeIdx) {
        const daySapnas = getSinglePrintsForProfile(profile);
        daySapnas.forEach(sap => {
          list.push({
            start: sap.start,
            end: sap.end,
            date: profile.dateStr
          });
        });
      }
    }

    return list;
  }, [dayProfiles, activeProfile]);

  // Compute Double Distribution Gap lines
  const { ddGapTop, ddGapBottom } = useMemo(() => {
    if (!priorProfile) return { ddGapTop: undefined, ddGapBottom: undefined };
    const priorSinglePrints = getSinglePrintsForProfile(priorProfile);
    if (priorSinglePrints.length > 0) {
      return {
        ddGapTop: priorSinglePrints[0].end,
        ddGapBottom: priorSinglePrints[0].start
      };
    }
    return { ddGapTop: undefined, ddGapBottom: undefined };
  }, [priorProfile]);

  // Compute 3-Day Balance boundaries
  const { threeDayBalanceHigh, threeDayBalanceLow } = useMemo(() => {
    if (!nuances?.threeDayBalanceAlert || !activeProfile || dayProfiles.length === 0) {
      return { threeDayBalanceHigh: undefined, threeDayBalanceLow: undefined };
    }
    const activeIdx = dayProfiles.findIndex(p => p.dateStr === activeProfile.dateStr);
    if (activeIdx !== -1 && activeIdx + 3 < dayProfiles.length) {
      const p1 = dayProfiles[activeIdx + 1];
      const p2 = dayProfiles[activeIdx + 2];
      const p3 = dayProfiles[activeIdx + 3];
      return {
        threeDayBalanceHigh: Math.max(p1.dayHigh, p2.dayHigh, p3.dayHigh),
        threeDayBalanceLow: Math.min(p1.dayLow, p2.dayLow, p3.dayLow)
      };
    }
    return { threeDayBalanceHigh: undefined, threeDayBalanceLow: undefined };
  }, [nuances, activeProfile, dayProfiles]);

  // Retrieve candles for the active session (day, week, or month) to display on chart
  const activeCandles = useMemo(() => {
    if (!activeDateStr || candles.length === 0) return [];
    
    try {
      let groups: Record<string, Candle[]> = {};
      if (sessionPeriod === 'weekly') {
        groups = groupCandlesByWeek(candles);
      } else if (sessionPeriod === 'monthly') {
        groups = groupCandlesByMonth(candles);
      } else {
        groups = groupCandlesByDay(candles);
      }
      return groups[activeDateStr] || [];
    } catch (e) {
      console.error('Error fetching active candles:', e);
      return [];
    }
  }, [candles, activeDateStr, sessionPeriod]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const handleTimeframeChange = (newTf: string) => {
    if (newTf === 'W') {
      setTimeframe('30');
      setSessionPeriod('weekly');
      setProfileType('tpo-split');
    } else if (newTf === 'M') {
      setTimeframe('30');
      setSessionPeriod('monthly');
      setProfileType('tpo-split');
    } else {
      setTimeframe(newTf);
      setSessionPeriod('daily');
      if (sessionPeriod === 'weekly' || sessionPeriod === 'monthly') {
        setProfileType('tpo-collapsed');
      }
    }
  };

  const handleSessionPeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSessionPeriod(period);
    if (period === 'weekly' || period === 'monthly') {
      setProfileType('tpo-split');
      setTimeframe('30'); // Ensure we fetch 30m candles for weekly/monthly calculation
    } else {
      setProfileType('tpo-collapsed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
      
      {/* Header controls */}
      <DashboardHeader
        currentSymbol={symbol}
        currentTimeframe={sessionPeriod === 'weekly' ? 'W' : sessionPeriod === 'monthly' ? 'M' : timeframe}
        connectionStatus={connectionStatus}
        onSymbolChange={setSymbol}
        onTimeframeChange={handleTimeframeChange}
        profileType={profileType}
        onProfileTypeChange={setProfileType}
        binCount={binCount}
        onBinCountChange={setBinCount}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sessionPeriod={sessionPeriod}
        onSessionPeriodChange={handleSessionPeriodChange}
        viewerCount={viewerCount}
      />

      {/* Main Dashboard Workspace */}
      <div className={viewMode === 'options' ? "" : "dashboard-grid"} style={viewMode === 'options' ? { padding: '0 20px 20px 20px' } : {}}>
        
        {/* Left Side: Sessions List & Stats */}
        {viewMode !== 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <LiveScanner onSelectSymbol={setSymbol} currentSymbol={symbol} />
            <StatsPanel
              dayProfiles={dayProfiles}
              activeDateStr={activeDateStr}
              onSelectDate={setActiveDateStr}
              gexData={gexData}
              untestedPocs={untestedPocs}
              symbol={symbol}
              optimalTick={optimalTicks[symbol]}
            />
          </div>
        )}

        {/* Right Side: Charts Pane */}
        <div style={viewMode === 'options' ? { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' } : { display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '550px' }}>
          {error && (
            <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px' }}>
              <AlertCircle color="#ef4444" size={20} />
              <div>
                <strong style={{ color: '#ef4444', fontSize: '14px' }}>Connection Error:</strong>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="glass-panel" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '400px' }}>
              <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Connecting to TradingView WebSocket & streaming data...</p>
            </div>
          ) : (
            <div className={viewMode === 'options' || viewMode === 'btst' || viewMode === 'nineam' || viewMode === 'reports' || viewMode === 'monthly' ? "" : "chart-section"} style={{ flex: '1' }}>
              {viewMode !== 'btst' && viewMode !== 'nineam' && viewMode !== 'options' && viewMode !== 'reports' && viewMode !== 'monthly' ? (
                <>
                  <ChartContainer
                    candles={activeCandles}
                    symbol={symbol}
                    timeframe={timeframe}
                    sessionPeriod={sessionPeriod}
                    pocPrice={activeProfile?.pocPrice}
                    vahPrice={activeProfile?.vahPrice}
                    valPrice={activeProfile?.valPrice}
                    ibHigh={activeProfile?.ibHigh}
                    ibLow={activeProfile?.ibLow}
                    
                    priorPocPrice={priorProfile?.pocPrice}
                    priorVahPrice={priorProfile?.vahPrice}
                    priorValPrice={priorProfile?.valPrice}
                    poorHighPrice={nuances?.poorHigh ? activeProfile?.dayHigh : undefined}
                    poorLowPrice={nuances?.poorLow ? activeProfile?.dayLow : undefined}
                    untestedPocs={untestedPocs}
                    failedAuctions={unfilledFailedAuctions}
                    ddGapTop={ddGapTop}
                    ddGapBottom={ddGapBottom}
                    threeDayBalanceHigh={threeDayBalanceHigh}
                    threeDayBalanceLow={threeDayBalanceLow}

                    openPrice={activeProfile?.openPrice}
                    openingType={nuances?.openingType}
                    activeSinglePrints={nuances?.singlePrints}
                    legacySapnas={unfilledSapnas}
                    onVisiblePriceRangeChange={setVisiblePriceRange}
                    
                    gexCallWall={gexData?.stats?.call_wall}
                    gexPutWall={gexData?.stats?.put_wall}
                    gexFlipZone={gexData?.stats?.gamma_flip}
                    gexMaxPain={gexData?.stats?.max_pain}
                  />
                  
                  {/* Conditional Visualizer rendering based on viewMode */}
                  {viewMode === 'profile' ? (
                    <MarketProfile
                      activeProfile={activeProfile}
                      priorProfile={priorProfile}
                      profileType={profileType}
                      visiblePriceRange={visiblePriceRange}
                      sessionPeriod={sessionPeriod}
                      livePrice={activeDateStr === dayProfiles[0]?.dateStr && candles.length > 0 ? candles[candles.length - 1].close : undefined}
                    />
                  ) : viewMode === 'gex' ? (
                    <GexProfile
                      symbol={symbol}
                      expiries={gexExpiries}
                      selectedExpiry={selectedGexExpiry}
                      onExpiryChange={setSelectedGexExpiry}
                      gexData={gexData}
                      loading={gexLoading}
                    />
                  ) : (
                    <PcrProfile
                      symbol={symbol}
                      expiries={gexExpiries}
                      selectedExpiry={selectedGexExpiry}
                      onExpiryChange={setSelectedGexExpiry}
                      pcrData={pcrData}
                      loading={pcrLoading}
                    />
                  )}
                </>
              ) : viewMode === 'btst' ? (
                <BtstReport onSelectSymbol={(sym) => { setSymbol(sym); setViewMode('profile'); }} />
              ) : viewMode === 'nineam' ? (
                <NineAmReport onSelectSymbol={(sym) => { setSymbol(sym); setViewMode('profile'); }} />
              ) : viewMode === 'reports' ? (
                <DailyReports />
              ) : viewMode === 'monthly' ? (
                <MonthlyProfileTab currentSymbol={symbol} onSelectSymbol={(sym) => setSymbol(sym)} />
              ) : (
                <OptionsTab symbol={symbol} onSelectSymbol={(sym) => { setSymbol(sym); setViewMode('profile'); }} />
              )}

            </div>
          )}
        </div>

      </div>

      {/* Global SEBI Disclaimer Footer */}
      <footer style={{
        margin: '20px 20px 10px 20px',
        padding: '14px 20px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: '1.5',
        letterSpacing: '0.2px'
      }}>
        "Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. All calls and ideas shared are for educational purposes only."
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;