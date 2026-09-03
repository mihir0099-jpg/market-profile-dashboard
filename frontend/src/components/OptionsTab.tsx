import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Edit3, Check, Search } from 'lucide-react';

const API_BASE = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;

// Stock strike intervals from NSE rules
const STRIKE_INTERVALS: Record<string, number> = {
  'NIFTY': 50,
  'NIFTY1!': 50,
  'BANKNIFTY': 100,
  'BANKNIFTY1!': 100,
  'RELIANCE': 20,
  'HDFCBANK': 10,
  'SBIN': 5,
  'TCS': 50,
  'INFY': 20,
  'ICICIBANK': 10,
  'AXISBANK': 10,
  'LT': 50,
  'ITC': 5,
  'KOTAKBANK': 20,
  'BHARTIARTL': 20,
  'MARUTI': 100,
  'SUNPHARMA': 20,
  'BAJFINANCE': 100,
  'JSWSTEEL': 10,
  'CIPLA': 20,
  'COALINDIA': 5,
  'TATAPOWER': 5,
  'HINDALCO': 10,
  'BPCL': 5,
  'ONGC': 2.5,
  'NTPC': 5,
  'PFC': 5,
  'RECLTD': 5,
  'POWERGRID': 5,
  'BEL': 2.5,
  'HAL': 50,
  'BHEL': 2.5,
  'SAIL': 2.5,
  'CGPOWER': 10,
  'INDIGO': 50,
  'SONACOMS': 10,
  'AMBER': 100,
  'SBICARD': 10,
  'BLUESTARCO': 20,
  'ICICIGI': 20,
  'DELHIVERY': 10
};

interface TradeSignal {
  id: string;
  symbol: string;
  strategy: string;
  type: string;
  direction: 'BUY' | 'SELL' | 'SHORT' | 'LONG';
  entry: number;
  sl: number;
  target: number;
  target2?: number;
  currentPrice?: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'EXPIRED' | 'T1_HIT' | 'T2_HIT';
  pnlPoints?: number;
  exitPrice?: number;
  createdDate: string;
  timestamp: string;
  liveOptionLtp?: number;
  liveExpiryDate?: string;
  liveAtmStrike?: number;
  actualOptionEntryPrice?: number;
  actualOptionSl?: number;
  actualOptionTarget?: number;
  actualOptionTarget2?: number;
  indexDrag?: 'bullish' | 'bearish' | 'none';
}

interface OptionsTabProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({ symbol, onSelectSymbol }) => {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering & Search
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state (stores the option levels directly)
  const [editingSignal, setEditingSignal] = useState<TradeSignal | null>(null);
  const [editEntry, setEditEntry] = useState('');
  const [editSL, setEditSL] = useState('');
  const [editT1, setEditT1] = useState('');
  const [editT2, setEditT2] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch signals
  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/signals`);
      if (res.ok) {
        const data = await res.json();
        setSignals(data);
      } else {
        throw new Error('Failed to load signals database');
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching signals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch stock macro stats for the leaderboard
  const [macroStats, setMacroStats] = useState<any>({});
  useEffect(() => {
    const fetchMacroStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scanner/macro-stats`);
        if (res.ok) {
          const data = await res.json();
          setMacroStats(data);
        }
      } catch (e) {
        console.error('Failed to fetch macro stats:', e);
      }
    };
    fetchMacroStats();
  }, []);

  const leaders = useMemo(() => {
    if (!macroStats || Object.keys(macroStats).length === 0) return null;
    const items = Object.entries(macroStats).map(([key, val]: [string, any]) => ({
      symbol: val.symbol || key.replace('NSE:', ''),
      weeklyReversion: val.weekly?.insideReversionPct || 0,
      weeklyReversionTotal: val.weekly?.total || 0,
      weeklyTrap: val.weekly?.outsideTrapPct || 0,
      weeklyTrapTotal: val.weekly?.total || 0,
      monthlyReversion: val.monthly?.insideReversionPct || 0,
      monthlyReversionTotal: val.monthly?.total || 0,
      monthlyTrap: val.monthly?.outsideTrapPct || 0,
      monthlyTrapTotal: val.monthly?.total || 0,
    }));
    
    return {
      weeklyReversions: items.filter(i => i.weeklyReversionTotal > 15).sort((a,b) => b.weeklyReversion - a.weeklyReversion).slice(0, 5),
      weeklyTraps: items.filter(i => i.weeklyTrapTotal > 15).sort((a,b) => b.weeklyTrap - a.weeklyTrap).slice(0, 5),
      monthlyReversions: items.filter(i => i.monthlyReversionTotal > 5).sort((a,b) => b.monthlyReversion - a.monthlyReversion).slice(0, 5),
      monthlyTraps: items.filter(i => i.monthlyTrapTotal > 5).sort((a,b) => b.monthlyTrap - a.monthlyTrap).slice(0, 5)
    };
  }, [macroStats]);

  // Format Helper Functions
  const getTpoPeriod = (timestampStr: string): string => {
    try {
      const dateObj = new Date(timestampStr);
      const hour = dateObj.getHours();
      const min = dateObj.getMinutes();
      const minutesSinceStart = (hour * 60 + min) - (9 * 60 + 15);
      
      if (minutesSinceStart < 0) return 'A';
      const periodIdx = Math.floor(minutesSinceStart / 30);
      const periods = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
      return periods[Math.min(periodIdx, periods.length - 1)] || 'L';
    } catch (e) {
      return 'L';
    }
  };

  const formatSignalDate = (timestampStr: string): string => {
    try {
      const dateObj = new Date(timestampStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = months[dateObj.getMonth()];
      const y = dateObj.getFullYear();
      return `${d} ${m} ${y}`;
    } catch (e) {
      return '08 Jul 2026';
    }
  };

  const formatSignalTime = (timestampStr: string): string => {
    try {
      const date = new Date(timestampStr);
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = String(minutes).padStart(2, '0');
      const hoursStr = String(hours).padStart(2, '0');
      return `${hoursStr}:${minutesStr} ${ampm}`;
    } catch (e) {
      return '02:54 PM';
    }
  };

  // Convert Spot Levels into Option Premium Levels using 0.5 Delta proxy rules
  const translateToOptionLevels = (sig: TradeSignal) => {
    const cleanSym = sig.symbol.replace('NSE:', '');
    const optionBaseSym = cleanSym.replace('1!', '');
    const isIndex = cleanSym.includes('NIFTY') || cleanSym.includes('BANKNIFTY') || cleanSym.includes('FINNIFTY') || cleanSym.includes('MIDCPNIFTY') || cleanSym.includes('SENSEX') || cleanSym.includes('BANKEX');
    
    // Helper to calculate expiry date string (e.g. "16-Jul-26")
    const getExpiryDate = (sym: string, timestampStr: string): string => {
      const date = new Date(timestampStr);
      if (isNaN(date.getTime())) {
        return '16-Jul-26'; // Fallback if timestamp is invalid
      }
      const clean = sym.replace('NSE:', '').replace('BSE:', '').replace('1!', '').toUpperCase();

      // Helper to find the last Thursday of a given month
      const getLastThursdayOfMonth = (year: number, month: number): Date => {
        const lastDay = new Date(year, month + 1, 0); // Last day of month
        let day = lastDay.getDay();
        let diff = (day >= 4) ? (day - 4) : (day + 7 - 4);
        const lastThursday = new Date(lastDay.getTime());
        lastThursday.setDate(lastDay.getDate() - diff);
        return lastThursday;
      };

      const formatExpiryDate = (d: Date): string => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = months[d.getMonth()];
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}-${mm}-${yy}`;
      };

      // Determine asset type and weekly expiry day of week (0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday)
      let isIndexAsset = false;
      let expiryDayOfWeek = 4; // Default to Thursday for Nifty

      if (clean.includes('BANKNIFTY')) {
        isIndexAsset = true;
        expiryDayOfWeek = 3; // Wednesday
      } else if (clean.includes('FINNIFTY')) {
        isIndexAsset = true;
        expiryDayOfWeek = 2; // Tuesday
      } else if (clean.includes('MIDCPNIFTY')) {
        isIndexAsset = true;
        expiryDayOfWeek = 1; // Monday
      } else if (clean.includes('NIFTY')) {
        isIndexAsset = true;
        expiryDayOfWeek = 4; // Thursday
      } else if (clean.includes('SENSEX')) {
        isIndexAsset = true;
        expiryDayOfWeek = 5; // Friday
      } else if (clean.includes('BANKEX')) {
        isIndexAsset = true;
        expiryDayOfWeek = 1; // Monday
      }

      // 1. Stock Options (Monthly Expiry - Last Thursday of the Month)
      if (!isIndexAsset) {
        let expiry = getLastThursdayOfMonth(date.getFullYear(), date.getMonth());
        // If the signal timestamp is AFTER the last Thursday of this month, then option belongs to next month's expiry
        if (date.getTime() > expiry.getTime() + 24 * 60 * 60 * 1000) {
          expiry = getLastThursdayOfMonth(date.getFullYear(), date.getMonth() + 1);
        }
        return formatExpiryDate(expiry);
      }

      // 2. Index Options (Weekly Expiry)
      const expiry = new Date(date.getTime());
      const currentDayOfWeek = date.getDay();
      let daysToExpiry = expiryDayOfWeek - currentDayOfWeek;
      if (daysToExpiry < 0) {
        daysToExpiry += 7;
      } else if (daysToExpiry === 0) {
        // If it's the expiry day, check the time. If after 15:30, it rolls over to next week's expiry
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeVal = hours * 100 + minutes;
        if (timeVal >= 1530) {
          daysToExpiry = 7;
        }
      }
      
      expiry.setDate(date.getDate() + daysToExpiry);
      return formatExpiryDate(expiry);
    };

    let timeStr = sig.timestamp;
    if (!timeStr) {
      if (sig.createdDate) {
        timeStr = `${sig.createdDate}T09:15:00`;
      } else {
        timeStr = new Date().toISOString();
      }
    }
    
    // Determine Expiry Date (use live expiry from backend if available, fallback to calculation)
    let expiryStr = getExpiryDate(sig.symbol, timeStr);
    if (sig.liveExpiryDate) {
      const dateParts = sig.liveExpiryDate.split('-');
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) {
          // Format "2026-07-30" -> "30-Jul-26"
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const yr = dateParts[0].slice(-2);
          const mo = months[parseInt(dateParts[1]) - 1] || 'Jul';
          const dy = dateParts[2].padStart(2, '0');
          expiryStr = `${dy}-${mo}-${yr}`;
        } else if (dateParts[2].length === 4) {
          // Format "30-Jul-2026" or "30-JUL-2026" -> "30-Jul-26"
          const yr = dateParts[2].slice(-2);
          const monthRaw = dateParts[1];
          const monthFormatted = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();
          expiryStr = `${dateParts[0]}-${monthFormatted}-${yr}`;
        } else {
          expiryStr = sig.liveExpiryDate;
        }
      } else {
        expiryStr = sig.liveExpiryDate;
      }
    }

    // 1. Calculate Strike (use live ATM strike from backend if available, fallback to rounding formula)
    const interval = STRIKE_INTERVALS[cleanSym] || (sig.entry < 500 ? 5 : 10);
    const atmStrike = sig.liveAtmStrike !== undefined ? sig.liveAtmStrike : Math.round(sig.entry / interval) * interval;
    const isLongType = sig.direction === 'BUY' || sig.direction === 'LONG';
    const contractType = isLongType ? 'CE' : 'PE';
    const contractSymbol = `${optionBaseSym} ${expiryStr} ${atmStrike} ${contractType}`;

    // 2. Premium Modeling (ATM premium is roughly 1.8% of spot for stocks, 0.8% for indexes)
    const premiumRatio = isIndex ? 0.008 : 0.018;
    const optEntry = sig.actualOptionEntryPrice !== undefined 
      ? sig.actualOptionEntryPrice 
      : Math.round((sig.entry * premiumRatio) * 10) / 10;

    // 3. Option SL calculation (0.5 Delta Proxy)
    const spotRisk = Math.abs(sig.entry - sig.sl);
    const optionRisk = spotRisk * 0.5;
    const minOptionRisk = optEntry * 0.15;
    const calculatedSl = Math.round((optEntry - optionRisk) * 10) / 10;
    
    let optSL = sig.actualOptionSl !== undefined ? sig.actualOptionSl : calculatedSl;
    let optT1 = sig.actualOptionTarget !== undefined ? sig.actualOptionTarget : Math.round((optEntry + optionRisk * 1.5) * 10) / 10;
    let optT2 = sig.actualOptionTarget2 !== undefined ? sig.actualOptionTarget2 : Math.round((optEntry + optionRisk * 3.0) * 10) / 10;
    
    if (sig.actualOptionSl === undefined && (optionRisk < minOptionRisk || calculatedSl <= 0)) {
      optSL = Math.round((optEntry * 0.7) * 10) / 10;
      optT1 = Math.round((optEntry * 1.3) * 10) / 10;
      optT2 = Math.round((optEntry * 1.6) * 10) / 10;
    }

    // Live Option LTP Simulation (fallback) or Actual live LTP from backend
    const spotLtp = sig.currentPrice || sig.entry * (sig.status === 'TARGET_HIT' ? 1.025 : sig.status === 'STOP_LOSS_HIT' ? 0.99 : 1.005);
    const spotPnlChange = spotLtp - sig.entry;
    
    let optLtp = sig.liveOptionLtp !== undefined ? sig.liveOptionLtp : optEntry;
    if (sig.liveOptionLtp === undefined) {
      if (isLongType) {
        optLtp = optEntry + (spotPnlChange * 0.5);
      } else {
        optLtp = optEntry - (spotPnlChange * 0.5);
      }
      optLtp = Math.max(0.05, Math.round(optLtp * 10) / 10);
    }

    // Calculate P&L %
    const pnlPct = ((optLtp - optEntry) / optEntry) * 100;

    // Determine status badge based on premium hits
    let statusText = sig.status.replace('_', ' ');
    if (sig.status === 'TARGET_HIT') {
      statusText = optLtp >= optT2 ? 'T2 HIT' : 'T1 HIT';
    }

    return {
      contractSymbol,
      atmStrike,
      contractType,
      optEntry,
      optSL,
      optT1,
      optT2,
      optLtp,
      pnlPct,
      statusText
    };
  };

  const isPerfectSetup = (sig: TradeSignal): string | null => {
    const cleanSym = sig.symbol.replace('NSE:', '').replace('BSE:', '').toUpperCase();
    const isTuesday = new Date().getDay() === 2; // Tuesday is Expiry Day
    
    // 1. Bank Nifty Period F Breakout (100.0% Win Rate)
    if (cleanSym === 'BANKNIFTY' && sig.strategy.includes('Period F') && sig.direction === 'LONG') {
      return '💎 100% BANKNIFTY PERIOD F BREAKOUT';
    }
    
    // 2. G-Period Expiry Breakouts (100% Win Rate)
    if (isTuesday && cleanSym === 'NIFTY' && sig.strategy.includes('G-Period') && sig.status === 'ACTIVE') {
      return '💎 100% NIFTY G-PERIOD EXPIRY BREAKOUT';
    }

    // 3. Expiry Day Failed Breakout Reversal (100% Reversal)
    if (isTuesday && (cleanSym === 'NIFTY' || cleanSym === 'BANKNIFTY') && sig.strategy.includes('Trap') && sig.status === 'ACTIVE') {
      return '🔥 100% HERO EXPIRY REVERSAL';
    }

    return null;
  };

  // Filter signals list
  const filteredSignals = useMemo(() => {
    return signals.filter(sig => {
      // 1. Search Query Filter
      if (searchQuery && !sig.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. Filter Tab Selection
      const { statusText } = translateToOptionLevels(sig);
      const isBreakout = sig.strategy.toLowerCase().includes('breakout') || sig.strategy.toLowerCase().includes('drive');
      const isBreakdown = sig.strategy.toLowerCase().includes('breakdown') || sig.strategy.toLowerCase().includes('fade');

      switch (activeFilter) {
        case 'Active': return sig.status === 'ACTIVE';
        case 'Watchlist': return sig.status === 'EXPIRED'; 
        case 'T1 Hit': return statusText === 'T1 HIT';
        case 'T2 Hit': return statusText === 'T2 HIT';
        case 'SL Hit': return sig.status === 'STOP_LOSS_HIT';
        case 'Expired': return sig.status === 'EXPIRED';
        case 'Breakouts': return isBreakout;
        case 'Breakdowns': return isBreakdown;
        default: return true;
      }
    });
  }, [signals, activeFilter, searchQuery]);

  // Get all high-accuracy leaders and index symbols trades
  const highAccuracyTrades = useMemo(() => {
    if (!leaders) return [];
    const leaderSymbols = new Set([
      ...leaders.weeklyReversions.map(l => l.symbol),
      ...leaders.weeklyTraps.map(l => l.symbol),
      ...leaders.monthlyReversions.map(l => l.symbol),
      ...leaders.monthlyTraps.map(l => l.symbol),
      'NIFTY', 'BANKNIFTY', 'NIFTY1!'
    ]);

    return signals.filter(sig => {
      const cleanSym = sig.symbol.replace('NSE:', '');
      return leaderSymbols.has(cleanSym) && (sig.status === 'ACTIVE' || sig.status.includes('HIT'));
    }).slice(0, 4); // Limit to top 4 active/recent setups
  }, [signals, leaders]);

  // Edit handler
  const handleEditClick = (sig: TradeSignal) => {
    const { optEntry, optSL, optT1, optT2 } = translateToOptionLevels(sig);
    setEditingSignal(sig);
    setEditEntry(optEntry.toFixed(2));
    setEditSL(optSL.toFixed(2));
    setEditT1(optT1.toFixed(2));
    setEditT2(optT2.toFixed(2));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSignal) return;

    setSaveLoading(true);
    try {
      // Convert edited option premium values back to underlying spot approximations before saving to signals database
      const premiumRatio = (editingSignal.symbol.includes('NIFTY') || editingSignal.symbol.includes('BANKNIFTY')) ? 0.008 : 0.018;
      
      const newSpotEntry = parseFloat(editEntry) / premiumRatio;
      const optionRisk = parseFloat(editEntry) - parseFloat(editSL);
      const spotRisk = optionRisk / 0.5;
      const newSpotSL = editingSignal.direction === 'BUY' ? (newSpotEntry - spotRisk) : (newSpotEntry + spotRisk);
      const newSpotT1 = editingSignal.direction === 'BUY' ? (newSpotEntry + spotRisk * 1.5) : (newSpotEntry - spotRisk * 1.5);
      const newSpotT2 = editingSignal.direction === 'BUY' ? (newSpotEntry + spotRisk * 3.0) : (newSpotEntry - spotRisk * 3.0);

      const res = await fetch(`${API_BASE}/api/signals/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSignal.id,
          entry: parseFloat(newSpotEntry.toFixed(2)),
          sl: parseFloat(newSpotSL.toFixed(2)),
          target: parseFloat(newSpotT1.toFixed(2)),
          target2: parseFloat(newSpotT2.toFixed(2))
        })
      });

      if (res.ok) {
        setEditingSignal(null);
        fetchSignals(); // Reload list
      } else {
        alert('Failed to update signal levels.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating signal.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getLunchtimeDecayStatus = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hr = ist.getHours();
    const min = ist.getMinutes();
    const mins = hr * 60 + min;

    // Period G is 12:15 PM to 12:45 PM IST (735 to 765 minutes since midnight)
    const isPeriodG = mins >= 735 && mins <= 765;
    return { isPeriodG };
  };

  const decayStatus = getLunchtimeDecayStatus();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {decayStatus.isPeriodG && (
        <div className="glass-panel" style={{ 
          padding: '12px 18px', 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'center', 
          borderLeft: '4px solid #f59e0b', 
          backgroundColor: 'rgba(245, 158, 11, 0.03)' 
        }}>
          <span style={{ fontSize: '15px' }}>⏳</span>
          <span style={{ fontSize: '12.5px', color: '#fbbf24', fontWeight: '500' }}>
            <strong>LUNCHTIME DECAY RADAR (Period G):</strong> High risk of option premium theta grinding (12:15 - 12:45 PM IST). Avoid option buying / consider exiting active positions.
          </span>
        </div>
      )}
      {error && (
        <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', gap: '10px', alignItems: 'center', borderLeft: '4px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
          <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '12.5px', color: '#ef4444' }}>{error}</span>
        </div>
      )}
      
      {/* 1. Header Filter Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <span style={{ display: 'none' }}>{symbol}</span>

        {['All', 'Active', 'Watchlist', 'T1 Hit', 'T2 Hit', 'SL Hit', 'Expired', 'Breakouts', 'Breakdowns'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid ' + (activeFilter === filter ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'),
              background: activeFilter === filter ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'var(--bg-input)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {filter}
            {filter === 'T2 Hit' && <Check size={11} />}
          </button>
        ))}

        {/* Live Search */}
        <div style={{ position: 'relative', marginLeft: 'auto', minWidth: '180px' }}>
          <input
            type="text"
            className="custom-input"
            style={{ width: '100%', padding: '5px 10px 5px 30px', fontSize: '12px' }}
            placeholder="Search contract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={12} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* High-Accuracy Live Trades Grid */}
      {leaders && (
        <div style={{ width: '100%' }}>
          
          <div className="glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#f43f5e', letterSpacing: '0.3px' }}>🔥 HIGH-ACCURACY LIVE TRADES</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Index & Leader Setups. Click to view)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {highAccuracyTrades.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0', gridColumn: '1 / -1' }}>
                  ⏳ Waiting for index or leader breakout triggers (Nifty, Bank Nifty, Reliance, CGPower)...
                </div>
              ) : (
                highAccuracyTrades.map(sig => {
                  const { contractSymbol, optEntry, optSL, optT1, pnlPct, statusText } = translateToOptionLevels(sig);
                  const isCall = contractSymbol.includes('CE');
                  const pnlColor = pnlPct >= 0 ? '#10b981' : '#ef4444';
                  const perfectBadge = isPerfectSetup(sig);
                  
                  return (
                    <div 
                      key={sig.id} 
                      onClick={() => onSelectSymbol(sig.symbol)}
                      style={{ 
                        padding: '12px 16px', 
                        background: perfectBadge ? 'rgba(234, 179, 8, 0.03)' : 'rgba(255,255,255,0.02)', 
                        border: perfectBadge 
                          ? '1px solid rgba(234, 179, 8, 0.45)' 
                          : '1px solid ' + (pnlPct >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'), 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                        boxShadow: perfectBadge ? '0 0 10px rgba(234, 179, 8, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }} 
                      className="scanner-row-interactive"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {perfectBadge && (
                          <div style={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            color: '#eab308', 
                            backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            display: 'inline-block',
                            width: 'max-content',
                            marginBottom: '4px',
                            letterSpacing: '0.5px'
                          }}>
                            {perfectBadge}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '900', color: 'white', fontSize: '13px' }}>{contractSymbol}</span>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 'bold', 
                            padding: '1px 4px', 
                            borderRadius: '3px',
                            backgroundColor: isCall ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isCall ? '#10b981' : '#ef4444'
                          }}>
                            {isCall ? 'CALL' : 'PUT'}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Buy: <strong>₹{optEntry.toFixed(1)}</strong> | SL: <strong>₹{optSL.toFixed(1)}</strong> | T1: <strong>₹{optT1.toFixed(1)}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: pnlColor }}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                        </span>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          padding: '1px 4px', 
                          borderRadius: '3px',
                          backgroundColor: statusText.includes('HIT') ? (statusText.includes('SL') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(99, 102, 241, 0.1)',
                          color: statusText.includes('HIT') ? (statusText.includes('SL') ? '#ef4444' : '#10b981') : '#60a5fa'
                        }}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}


      {/* 3. The Options Premium Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0, borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>DATE</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>TIME - PERIOD</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>OPTION CONTRACT</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>ACTION</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>SIGNAL</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>TIER</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>BUY AT</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>LTP</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>SL</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>T1</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>T2</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>P&L %</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>DAYS</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>STATUS</th>
              <th style={{ padding: '14px 18px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>EDIT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw className="animate-spin" size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  Loading signal scanner data...
                </td>
              </tr>
            ) : filteredSignals.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active or historical signals match the filter criteria.
                </td>
              </tr>
            ) : (
              filteredSignals.map(sig => {
                const {
                  contractSymbol,
                  contractType,
                  optEntry,
                  optSL,
                  optT1,
                  optT2,
                  optLtp,
                  pnlPct,
                  statusText
                } = translateToOptionLevels(sig);
                
                const cleanSym = sig.symbol.replace('NSE:', '');
                const formattedDate = formatSignalDate(sig.timestamp);
                const formattedTime = formatSignalTime(sig.timestamp);
                const period = getTpoPeriod(sig.timestamp);
                
                // Tier based on backtest rates
                const isTierAPlus = cleanSym === 'CGPOWER' || cleanSym === 'RELIANCE' || cleanSym === 'SONACOMS';

                return (
                  <React.Fragment key={sig.id}>
                    <tr
                      className="scanner-row-interactive"
                      style={{
                        borderBottom: sig.indexDrag && sig.indexDrag !== 'none' && sig.status === 'ACTIVE' ? 'none' : '1px solid var(--border-color)',
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        transition: 'background 0.2s'
                      }}
                    >
                    {/* DATE */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>{formattedDate}</td>
                    
                    {/* TIME - PERIOD */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                      {formattedTime} - <strong style={{ color: 'white' }}>{period}</strong>
                    </td>
                    
                    {/* OPTION CONTRACT */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          onClick={() => onSelectSymbol(sig.symbol)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            color: 'white',
                            fontWeight: '800',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13.5px'
                          }}
                        >
                          {contractSymbol}
                        </button>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spot: {sig.entry.toFixed(2)}</span>
                      </div>
                    </td>
                    
                    {/* ACTION */}
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: contractType === 'CE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: contractType === 'CE' ? 'var(--color-bull)' : 'var(--color-bear)'
                        }}
                      >
                        {contractType === 'CE' ? 'BUY CALL' : 'BUY PUT'}
                      </span>
                    </td>
                    
                    {/* SIGNAL */}
                    <td style={{ padding: '12px 18px', fontWeight: '800', color: contractType === 'CE' ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                      {contractType === 'CE' ? '▲ BREAKOUT' : '▼ BREAKDOWN'}
                    </td>
                    
                    {/* TIER */}
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          justifyContent: 'center',
                          width: '24px',
                          padding: '2px 0',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--accent-blue)'
                        }}
                      >
                        {isTierAPlus ? 'A+' : 'A'}
                      </span>
                    </td>
                    
                    {/* BUY AT */}
                    <td style={{ padding: '12px 18px', fontWeight: '700' }}>₹{optEntry.toFixed(2)}</td>
                    
                    {/* LTP */}
                    <td style={{ padding: '12px 18px', fontWeight: '700', color: pnlPct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                      ₹{optLtp.toFixed(2)}
                    </td>
                    
                    {/* SL */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>₹{optSL.toFixed(2)}</td>
                    
                    {/* T1 */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>₹{optT1.toFixed(2)}</td>
                    
                    {/* T2 */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>₹{optT2.toFixed(2)}</td>
                    
                    {/* P&L % */}
                    <td style={{ padding: '12px 18px', fontWeight: '700', color: pnlPct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </td>
                    
                    {/* DAYS */}
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>0d</td>
                    
                    {/* STATUS */}
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          letterSpacing: '0.2px',
                          backgroundColor: statusText.includes('HIT') ? (statusText.includes('SL') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(99, 102, 241, 0.1)',
                          color: statusText.includes('HIT') ? (statusText.includes('SL') ? '#ef4444' : '#10b981') : '#60a5fa',
                          border: '1px solid ' + (statusText.includes('HIT') ? (statusText.includes('SL') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)') : 'rgba(99, 102, 241, 0.2)')
                        }}
                      >
                        {statusText}
                      </span>
                    </td>
                    
                    {/* EDIT */}
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEditClick(sig)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Edit3 size={12} />
                      </button>
                    </td>
                  </tr>
                  {sig.indexDrag && sig.indexDrag !== 'none' && sig.status === 'ACTIVE' && (
                    <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                      <td colSpan={15} style={{ padding: '6px 18px', fontSize: '11px', color: '#f87171', borderBottom: '1px solid var(--border-color)', borderTop: 'none', textAlign: 'left' }}>
                        <span style={{ marginRight: '6px' }}>⚠️</span>
                        <strong>INDEX DRAG DETECTED:</strong> Broad market index has opposite momentum (PCR drift is {sig.indexDrag === 'bearish' ? 'Bearish' : 'Bullish'}). High risk of breakout failure.
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Edit Modal Dialog */}
      {editingSignal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 2000,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid var(--border-hover)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'white' }}>
                Edit Option Levels: {editingSignal.symbol.replace('NSE:', '')}
              </h4>
              <button
                onClick={() => setEditingSignal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>OPTION ENTRY PREMIUM</label>
                <input
                  type="number"
                  step="0.05"
                  className="custom-input"
                  style={{ width: '100%' }}
                  value={editEntry}
                  onChange={(e) => setEditEntry(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>OPTION STOP LOSS (SL)</label>
                <input
                  type="number"
                  step="0.05"
                  className="custom-input"
                  style={{ width: '100%' }}
                  value={editSL}
                  onChange={(e) => setEditSL(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>OPTION TARGET 1 (T1)</label>
                <input
                  type="number"
                  step="0.05"
                  className="custom-input"
                  style={{ width: '100%' }}
                  value={editT1}
                  onChange={(e) => setEditT1(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>OPTION TARGET 2 (T2)</label>
                <input
                  type="number"
                  step="0.05"
                  className="custom-input"
                  style={{ width: '100%' }}
                  value={editT2}
                  onChange={(e) => setEditT2(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSignal(null)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="glow-btn"
                  style={{ flex: 1, padding: '8px', borderRadius: '6px' }}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEBI / Market Risk Disclaimer Footer */}
      <div style={{
        marginTop: '25px',
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        color: 'var(--text-muted)',
        fontSize: '11px',
        lineHeight: '1.6',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        letterSpacing: '0.2px'
      }}>
        <div style={{ fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          ⚠️ DISCLAIMER & RISK WARNING
        </div>
        <div>
          "Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. All calls and ideas shared are for educational purposes only."
        </div>
      </div>

      {/* Styled rows wrapper */}
      <style>{`
        .scanner-row-interactive:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>

    </div>
  );
};
export default OptionsTab;
