import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Activity, ZoomIn, ZoomOut, ShieldAlert } from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FootprintChartProps {
  candles: Candle[];
  symbol: string;
  onRefresh?: () => void;
}

interface ZoomStyle {
  columnWidth: number;
  rowHeight: number;
  fontSize: number;
  showText: boolean;
  padding: string;
}

const ZOOM_PRESETS: Record<number, ZoomStyle> = {
  1: { columnWidth: 35, rowHeight: 8, fontSize: 0, showText: false, padding: '0' },
  2: { columnWidth: 80, rowHeight: 18, fontSize: 7, showText: true, padding: '1px 2px' },
  3: { columnWidth: 135, rowHeight: 24, fontSize: 8.5, showText: true, padding: '2px 4px' },
  4: { columnWidth: 175, rowHeight: 30, fontSize: 10, showText: true, padding: '3px 6px' },
  5: { columnWidth: 215, rowHeight: 36, fontSize: 12, showText: true, padding: '4px 8px' }
};

export const FootprintChart: React.FC<FootprintChartProps> = ({ candles, symbol }) => {
  const [manualTickSize, setManualTickSize] = useState<number | null>(() => {
    const saved = localStorage.getItem(`footprint_manualTickSize_${symbol}`);
    if (saved === null || saved === 'null') return null;
    const parsed = parseFloat(saved);
    return isNaN(parsed) ? null : parsed;
  });

  const [barPeriod, setBarPeriod] = useState<5 | 30>(() => {
    const saved = localStorage.getItem(`footprint_barPeriod_${symbol}`);
    return saved === '5' ? 5 : 30;
  });

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem(`footprint_zoomLevel_${symbol}`);
    if (saved === null) return 3;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) ? 3 : parsed;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-save settings to localStorage namespaced by symbol
  useEffect(() => {
    localStorage.setItem(`footprint_manualTickSize_${symbol}`, String(manualTickSize));
  }, [manualTickSize, symbol]);

  useEffect(() => {
    localStorage.setItem(`footprint_barPeriod_${symbol}`, String(barPeriod));
  }, [barPeriod, symbol]);

  useEffect(() => {
    localStorage.setItem(`footprint_zoomLevel_${symbol}`, String(zoomLevel));
  }, [zoomLevel, symbol]);

  const activeZoom = ZOOM_PRESETS[zoomLevel] || ZOOM_PRESETS[3];

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const amt = direction === 'left' ? -350 : 350;
      container.scrollLeft += amt;
    }
  };

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const wheelAccumulatorRef = useRef(0);

  // Price Axis Drag Scaling
  const isScalingRef = useRef(false);
  const startScaleYRef = useRef(0);
  const startTickSizeRef = useRef(1);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if clicked on left Price Axis (width 60px)
    const rect = container.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    
    if (localX <= 60) {
      isScalingRef.current = true;
      startScaleYRef.current = e.clientY;
      startTickSizeRef.current = tickSize;
      container.style.cursor = 'ns-resize';
      e.preventDefault();
      return;
    }

    isDownRef.current = true;
    container.style.cursor = 'grabbing';
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    scrollLeftRef.current = container.scrollLeft;
    scrollTopRef.current = container.scrollTop;
    
    // Prevent browser text selection / drag starting
    e.preventDefault();
  };

  const handleMouseLeave = () => {
    // Do NOT reset isDownRef.current = false!
    // This allows the drag to continue smoothly even if the cursor temporarily moves outside the chart area.
    isScalingRef.current = false;
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = 'default';
    }
  };

  const handleMouseUp = () => {
    isDownRef.current = false;
    isScalingRef.current = false;
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = 'default';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isScalingRef.current) {
      e.preventDefault();
      const diffY = e.clientY - startScaleYRef.current;
      // Dragging up (negative diffY) -> coarser tick size (fewer rows)
      // Dragging down (positive diffY) -> finer tick size (more rows)
      const multiplier = Math.pow(1.008, diffY);
      const newTick = startTickSizeRef.current * multiplier;
      
      let minTick = 0.05;
      if (symbol.includes('BTCUSD')) minTick = 5;
      if (symbol.includes('XAUUSD')) minTick = 0.1;
      
      setManualTickSize(Math.max(minTick, parseFloat(newTick.toFixed(4))));
      return;
    }

    if (!isDownRef.current) return;
    
    e.preventDefault();
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;
    // Walk scaling factors for smooth pan speed (higher multiplier on horizontal to match wide columns)
    container.scrollLeft = scrollLeftRef.current - diffX * 2.5;
    container.scrollTop = scrollTopRef.current - diffY * 1.5;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only intercept and zoom if Ctrl key is held!
    // This allows normal mouse wheel scrolling without locking up page/container.
    if (e.ctrlKey) {
      e.preventDefault();
      wheelAccumulatorRef.current += e.deltaY;
      if (Math.abs(wheelAccumulatorRef.current) >= 120) {
        if (wheelAccumulatorRef.current > 0) {
          setZoomLevel((prev) => Math.max(1, prev - 1));
        } else {
          setZoomLevel((prev) => Math.min(5, prev + 1));
        }
        wheelAccumulatorRef.current = 0;
      }
    }
  };

  // 1. Pre-calculate VWAP on 1-minute candles (Starts everyday, resets on new date)
  const candlesWithVwap = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    
    // Sort candles chronologically
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    
    let runningSum = 0;
    let runningVolume = 0;
    let lastDateStr = '';

    return sorted.map(c => {
      const dateStr = new Date(c.time * 1000).toDateString();
      // Reset daily
      if (dateStr !== lastDateStr) {
        runningSum = 0;
        runningVolume = 0;
        lastDateStr = dateStr;
      }
      
      const typicalPrice = (c.open + c.high + c.low + c.close) / 4;
      runningSum += typicalPrice * c.volume;
      runningVolume += c.volume;
      
      return {
        ...c,
        vwap: runningVolume > 0 ? runningSum / runningVolume : typicalPrice
      };
    });
  }, [candles]);

  // 2. Group candles into chosen bar interval
  const blocks = useMemo(() => {
    if (candlesWithVwap.length === 0) return [];

    const getBlockTime = (timeSecs: number) => {
      const date = new Date(timeSecs * 1000);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hour = date.getHours();
      
      let min = date.getMinutes();
      if (barPeriod === 30) {
        min = min >= 30 ? 30 : 0;
      } else {
        min = Math.floor(min / 5) * 5;
      }
      return Math.floor(new Date(year, month, day, hour, min, 0, 0).getTime() / 1000);
    };

    const grouped: Record<number, typeof candlesWithVwap> = {};
    candlesWithVwap.forEach((c) => {
      const blockTime = getBlockTime(c.time);
      if (!grouped[blockTime]) {
        grouped[blockTime] = [];
      }
      grouped[blockTime].push(c);
    });

    return Object.entries(grouped)
      .map(([timeStr, blockCandles]) => {
        const time = parseInt(timeStr, 10);
        const opens = blockCandles.map((c) => c.open);
        const closes = blockCandles.map((c) => c.close);
        const highs = blockCandles.map((c) => c.high);
        const lows = blockCandles.map((c) => c.low);
        const volumes = blockCandles.map((c) => c.volume);

        // Get VWAP from the last candle of the block (cumulative for the day)
        const finalCandle = blockCandles[blockCandles.length - 1];
        const vwapVal = finalCandle ? finalCandle.vwap : closes[closes.length - 1];

        return {
          time,
          open: opens[0] || 0,
          close: closes[closes.length - 1] || 0,
          high: Math.max(...highs),
          low: Math.min(...lows),
          volume: volumes.reduce((acc, v) => acc + v, 0),
          vwap: vwapVal,
          candles: blockCandles,
        };
      })
      .sort((a, b) => a.time - b.time);
  }, [candlesWithVwap, barPeriod]);

  // Determine tick size
  const tickSize = useMemo(() => {
    if (manualTickSize !== null) return manualTickSize;

    if (candles.length === 0) return 1;
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const range = Math.max(...highs) - Math.min(...lows);

    if (symbol.includes('BANKNIFTY')) {
      return range > 1000 ? 20 : range > 500 ? 10 : 5;
    }
    if (symbol.includes('NIFTY')) {
      return range > 300 ? 5 : range > 100 ? 2 : 1;
    }
    if (symbol.includes('CRUDEOIL')) {
      return range > 200 ? 5 : range > 100 ? 2 : 1;
    }
    if (symbol.includes('BTCUSD')) {
      return range > 5000 ? 100 : range > 2000 ? 50 : 25;
    }
    if (symbol.includes('XAUUSD')) {
      return range > 30 ? 1 : 0.5;
    }

    const rawTick = range / 40;
    const power = Math.pow(10, Math.floor(Math.log10(rawTick)));
    const normalized = rawTick / power;
    let rounded = power;
    if (normalized > 5) rounded = 5 * power;
    else if (normalized > 2) rounded = 2 * power;
    
    return Math.max(0.01, rounded);
  }, [candles, symbol, manualTickSize]);

  // Check for diagonal imbalances
  const checkImbalance = (
    levels: Record<number, { bid: number; ask: number }>,
    price: number,
    type: 'buy' | 'sell'
  ) => {
    const minVolume = 30;
    const ratio = 3.0;

    if (type === 'buy') {
      const askVol = levels[price]?.ask || 0;
      const diagonalPrice = parseFloat((price - tickSize).toFixed(4));
      const bidVol = levels[diagonalPrice]?.bid || 0;
      return askVol >= bidVol * ratio && askVol >= minVolume;
    } else {
      const bidVol = levels[price]?.bid || 0;
      const diagonalPrice = parseFloat((price + tickSize).toFixed(4));
      const askVol = levels[diagonalPrice]?.ask || 0;
      return bidVol >= askVol * ratio && bidVol >= minVolume;
    }
  };

  // Process footprints and find signals
  const processedFootprints = useMemo(() => {
    if (blocks.length === 0) return [];

    const roundToTick = (val: number, step: number) => Math.round(val / step) * step;

    // Build levels
    const rawFootprints = blocks.map((block) => {
      const levels: Record<number, { bid: number; ask: number }> = {};

      block.candles.forEach((c) => {
        const cLow = roundToTick(c.low, tickSize);
        const cHigh = roundToTick(c.high, tickSize);
        const ticks: number[] = [];

        for (let p = cLow; p <= cHigh; p = parseFloat((p + tickSize).toFixed(4))) {
          ticks.push(p);
        }
        if (ticks.length === 0) ticks.push(cLow);

        const volPerTick = c.volume / ticks.length;
        let askShare = 0.5;
        if (c.close > c.open) {
          askShare = 0.65;
        } else if (c.close < c.open) {
          askShare = 0.35;
        }

        ticks.forEach((t) => {
          if (!levels[t]) {
            levels[t] = { bid: 0, ask: 0 };
          }
          levels[t].ask += volPerTick * askShare;
          levels[t].bid += volPerTick * (1 - askShare);
        });
      });

      let totalBid = 0;
      let totalAsk = 0;
      let pocPrice = 0;
      let maxTotalVol = 0;

      Object.entries(levels).forEach(([priceStr, val]) => {
        const price = parseFloat(priceStr);
        const total = val.bid + val.ask;
        totalBid += val.bid;
        totalAsk += val.ask;

        if (total > maxTotalVol) {
          maxTotalVol = total;
          pocPrice = price;
        }
      });

      const delta = Math.round(totalAsk - totalBid);
      const vwapPrice = roundToTick(block.vwap, tickSize);

      return {
        ...block,
        levels,
        totalBid: Math.round(totalBid),
        totalAsk: Math.round(totalAsk),
        delta,
        pocPrice,
        vwapPrice
      };
    });

    // Run Cumulative Delta and Signals
    let runningDelta = 0;
    let lastDateStr = '';

    return rawFootprints.map((block) => {
      const dateStr = new Date(block.time * 1000).toDateString();
      if (dateStr !== lastDateStr) {
        runningDelta = 0;
        lastDateStr = dateStr;
      }
      runningDelta += block.delta;

      let maxConsecutiveBuyImbalances = 0;
      let currentConsecutiveBuy = 0;
      let maxConsecutiveSellImbalances = 0;
      let currentConsecutiveSell = 0;

      const sortedPrices = Object.keys(block.levels).map(Number).sort((a, b) => a - b);
      
      sortedPrices.forEach((price) => {
        const isBuyImb = checkImbalance(block.levels, price, 'buy');
        const isSellImb = checkImbalance(block.levels, price, 'sell');

        if (isBuyImb) {
          currentConsecutiveBuy++;
          maxConsecutiveBuyImbalances = Math.max(maxConsecutiveBuyImbalances, currentConsecutiveBuy);
        } else {
          currentConsecutiveBuy = 0;
        }

        if (isSellImb) {
          currentConsecutiveSell++;
          maxConsecutiveSellImbalances = Math.max(maxConsecutiveSellImbalances, currentConsecutiveSell);
        } else {
          currentConsecutiveSell = 0;
        }
      });

      const isInitiativeBuy = maxConsecutiveBuyImbalances >= 3;
      const isInitiativeSell = maxConsecutiveSellImbalances >= 3;

      let buyerAbsorption = false;
      let sellerAbsorption = false;
      const isBullishBar = block.close >= block.open;
      const isBearishBar = block.close < block.open;
      const midPrice = (block.high + block.low) / 2;

      if (isBullishBar && block.volume > 0) {
        buyerAbsorption = sortedPrices.some(p => p < midPrice && checkImbalance(block.levels, p, 'sell'));
      } else if (isBearishBar && block.volume > 0) {
        sellerAbsorption = sortedPrices.some(p => p > midPrice && checkImbalance(block.levels, p, 'buy'));
      }

      return {
        ...block,
        cumulativeDelta: runningDelta,
        isInitiativeBuy,
        isInitiativeSell,
        buyerAbsorption,
        sellerAbsorption
      };
    });
  }, [blocks, tickSize]);

  // Overall grid price steps
  const priceGrid = useMemo(() => {
    if (candles.length === 0) return [];
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);

    const roundToTick = (val: number, step: number) => Math.round(val / step) * step;
    const start = roundToTick(maxPrice, tickSize);
    const end = roundToTick(minPrice, tickSize);

    const rows: number[] = [];
    const maxSafetyRows = 150;
    let step = tickSize;
    let iterations = Math.round((start - end) / step);

    if (iterations > maxSafetyRows) {
      step = step * Math.ceil(iterations / maxSafetyRows);
    }

    for (let p = start; p >= end; p = parseFloat((p - step).toFixed(4))) {
      rows.push(p);
    }
    return rows;
  }, [candles, tickSize]);

  // Left Volume Profile calculations across visible columns
  const profileVolume = useMemo(() => {
    const vols: Record<number, number> = {};
    processedFootprints.forEach(block => {
      Object.entries(block.levels).forEach(([priceStr, level]) => {
        const price = parseFloat(priceStr);
        vols[price] = (vols[price] || 0) + level.bid + level.ask;
      });
    });
    return vols;
  }, [processedFootprints]);

  const maxProfileVol = useMemo(() => {
    const values = Object.values(profileVolume);
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  }, [profileVolume]);

  const getLotSize = (sym: string): number => {
    if (sym.includes('BANKNIFTY')) return 15;
    if (sym.includes('NIFTY')) return 75;
    if (sym.includes('CRUDEOIL')) return 100;
    if (sym.includes('RELIANCE')) return 250;
    return 1;
  };

  const formatVolume = (val: number) => {
    const lotSize = getLotSize(symbol);
    const lots = val / lotSize;
    if (lots >= 1000) return `${(lots / 1000).toFixed(1)}k`;
    if (lots >= 10) return Math.round(lots).toString();
    return lots % 1 === 0 ? lots.toString() : lots.toFixed(1);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: '1' }}>
      
      {/* Flat, Fully Responsive Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
        
        {/* Title */}
        <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} /> Live Footprint Chart
        </span>

        {/* Bar Period Selector */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setBarPeriod(30)}
            style={{
              background: barPeriod === 30 ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            30 Min Bars (TPO)
          </button>
          <button
            onClick={() => setBarPeriod(5)}
            style={{
              background: barPeriod === 5 ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            5 Min Bars
          </button>
        </div>

        {/* Scroll Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => scroll('left')}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ◀ Scroll Left
          </button>
          <button
            onClick={() => scroll('right')}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Scroll Right ▶
          </button>
        </div>

        {/* Resolution Badge */}
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          Resolution: {tickSize}
        </span>

        {/* Unit Lot Badge */}
        <span style={{ fontSize: '10px', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
          Unit: Lots ({getLotSize(symbol)} shares/lot)
        </span>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.02)', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <button
            onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
            disabled={zoomLevel === 1}
            style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: zoomLevel === 1 ? 'var(--text-muted)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700' }}
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)', alignSelf: 'center', padding: '0 4px' }}>
            Zoom {zoomLevel}
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(5, prev + 1))}
            disabled={zoomLevel === 5}
            style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: zoomLevel === 5 ? 'var(--text-muted)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700' }}
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        {/* Grid Density Buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => setManualTickSize(tickSize * 2)}
            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700' }}
          >
            <ChevronUp size={12} /> Grid Coarser
          </button>
          <button 
            onClick={() => setManualTickSize(Math.max(0.01, tickSize / 2))}
            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700' }}
          >
            <ChevronDown size={12} /> Grid Finer
          </button>
          {manualTickSize !== null && (
            <button 
              onClick={() => setManualTickSize(null)}
              style={{ padding: '4px 8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Scroll Viewport */}
      {processedFootprints.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Awaiting 1-minute order data to build Footprint chart...
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          className="footprint-viewport-scoped"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          style={{ 
            display: 'block', 
            overflowX: 'auto', 
            overflowY: 'auto',
            flex: '1', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            backgroundColor: '#121316', 
            maxHeight: '550px',
            position: 'relative',
            cursor: 'default',
            userSelect: 'none'
          }}
        >
          <div className="footprint-layout-wrapper" style={{ display: 'flex', width: 'max-content', minWidth: '100%' }}>
          
          {/* Sticky Left Price Axis (zIndex: 20 so it sits above column headers/footers) */}
          <div style={{ 
            position: 'sticky', 
            left: 0, 
            zIndex: 20, 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: '#090a0c', 
            borderRight: '1px solid var(--border-color)', 
            width: '60px', 
            flexShrink: 0 
          }}>
            <div style={{ height: '75px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090a0c', flexShrink: 0 }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Price</span>
            </div>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              {priceGrid.map((price) => {
                const vol = profileVolume[price] || 0;
                const volWidthPercent = maxProfileVol > 0 ? (vol / maxProfileVol) * 100 : 0;

                return (
                  <div 
                    key={price} 
                    style={{ 
                      height: `${activeZoom.rowHeight}px`, 
                      fontSize: '9px', 
                      color: 'var(--text-secondary)', 
                      fontWeight: '700', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderBottom: '1px solid rgba(255,255,255,0.01)',
                      boxSizing: 'border-box',
                      position: 'relative'
                    }}
                  >
                    {/* Left Volume Profile Horizontal Bar */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${volWidthPercent * 0.9}%`,
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      borderLeft: '1.5px solid rgba(245, 158, 11, 0.3)',
                      pointerEvents: 'none',
                      zIndex: 0
                    }} />
                    
                    <span style={{ zIndex: 1, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      {price.toFixed(symbol.includes('XAUUSD') ? 1 : 0)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ height: zoomLevel > 1 ? '53px' : '23px', borderTop: '1px solid var(--border-color)', flexShrink: 0, backgroundColor: '#090a0c' }}></div>
          </div>

          {/* Direct Columns mapping inside flat flex layout wrapper */}
          {processedFootprints.map((block, idx) => {
              const letter = String.fromCharCode(65 + (idx % 26));
              const timeStr = new Date(block.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const label = barPeriod === 30 ? `Period ${letter} (${timeStr})` : timeStr;

              // Setup signals text and coloring
              let signalText = '';
              let signalColor = '';
              if (block.isInitiativeBuy) {
                signalText = 'IB';
                signalColor = '#10b981';
              } else if (block.isInitiativeSell) {
                signalText = 'IS';
                signalColor = '#ef4444';
              } else if (block.buyerAbsorption) {
                signalText = 'ABS-B';
                signalColor = '#3b82f6';
              } else if (block.sellerAbsorption) {
                signalText = 'ABS-S';
                signalColor = '#f97316';
              }

              return (
                <div 
                  key={block.time} 
                  style={{ 
                    width: `${activeZoom.columnWidth}px`, 
                    flexShrink: 0, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    backgroundColor: block.close >= block.open ? 'rgba(16, 185, 129, 0.01)' : 'rgba(239, 68, 68, 0.01)'
                  }}
                >
                  
                  {/* Column Header (Sticky vertically) */}
                  <div style={{ 
                    height: '75px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    gap: '3px',
                    padding: '4px'
                  }}>
                    <span style={{ fontSize: zoomLevel <= 2 ? '8.5px' : '10.5px', fontWeight: '800', color: block.close >= block.open ? 'var(--color-bull)' : 'var(--color-bear)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', textAlign: 'center' }}>
                      {label}
                    </span>

                    {/* MINI CANDLESTICK PREVIEW */}
                    {(() => {
                      const candleRange = Math.max(0.01, block.high - block.low);
                      const isBullish = block.close >= block.open;
                      const candleColor = isBullish ? '#10b981' : '#ef4444';
                      
                      const openPos = ((block.high - block.open) / candleRange) * 26;
                      const closePos = ((block.high - block.close) / candleRange) * 26;
                      const bodyTop = Math.min(openPos, closePos);
                      const bodyHeight = Math.max(2.5, Math.abs(openPos - closePos));
                      
                      return (
                        <div style={{ position: 'relative', width: '16px', height: '26px', margin: '2px 0' }} title={`O:${block.open} H:${block.high} L:${block.low} C:${block.close}`}>
                          {/* Wick */}
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', backgroundColor: 'rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }} />
                          {/* Body */}
                          <div style={{ position: 'absolute', left: 'calc(50% - 4px)', top: `${bodyTop}px`, height: `${bodyHeight}px`, width: '8px', backgroundColor: candleColor, border: `0.5px solid ${isBullish ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '1.5px' }} />
                        </div>
                      );
                    })()}

                    {signalText && zoomLevel > 1 && (
                      <span style={{
                        fontSize: '7.5px',
                        fontWeight: '900',
                        color: 'white',
                        backgroundColor: signalColor,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        letterSpacing: '0.5px'
                      }}>
                        {signalText}
                      </span>
                    )}
                  </div>

                  {/* Footprint cells block */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                    {priceGrid.map((price) => {
                      const level = block.levels[price];
                      const isPoc = price === block.pocPrice;
                      const isVwap = price === block.vwapPrice;
                      const hasBid = level && level.bid > 0;
                      const hasAsk = level && level.ask > 0;

                      // Round OHLC values to nearest tickSize to align with grid price keys
                      const roundedOpen = Math.round(block.open / tickSize) * tickSize;
                      const roundedClose = Math.round(block.close / tickSize) * tickSize;
                      const roundedHigh = Math.round(block.high / tickSize) * tickSize;
                      const roundedLow = Math.round(block.low / tickSize) * tickSize;

                      const inBody = price >= Math.min(roundedOpen, roundedClose) && price <= Math.max(roundedOpen, roundedClose);
                      const inWick = price >= roundedLow && price <= roundedHigh;
                      
                      const isBullish = block.close >= block.open;
                      const candleColor = isBullish ? '#10b981' : '#ef4444';

                      // Transparent backgrounds for wicks to keep the candlestick shape clean
                      const bidBg = 'transparent';
                      const askBg = 'transparent';

                      const buyImbalance = level ? checkImbalance(block.levels, price, 'buy') : false;
                      const sellImbalance = level ? checkImbalance(block.levels, price, 'sell') : false;

                      // Borders representing the candlestick body ends (top/bottom caps)
                      const isBodyTop = inBody && price === Math.max(roundedOpen, roundedClose);
                      const isBodyBottom = inBody && price === Math.min(roundedOpen, roundedClose);

                       const borderTopStyle = isBodyTop 
                        ? `2.5px solid ${candleColor}` 
                        : (isPoc ? '1.5px solid white' : undefined);

                      // Border Bottom for VWAP line or body bottom
                      const cellBorderBottom = isVwap 
                        ? '2px dashed #3b82f6' 
                        : (isBodyBottom 
                            ? `2.5px solid ${candleColor}` 
                            : (isPoc ? '1.5px solid white' : '1px solid rgba(255,255,255,0.04)')); // Sharp visible grid lines!

                      return (
                        <div 
                          key={price} 
                          style={{ 
                            height: `${activeZoom.rowHeight}px`, 
                            display: 'flex', 
                            borderTop: borderTopStyle,
                            borderBottom: cellBorderBottom,
                            borderTopColor: isPoc && !isBodyTop ? 'white' : undefined,
                            borderBottomColor: isPoc && !isBodyBottom ? 'white' : undefined,
                            boxSizing: 'border-box',
                            position: 'relative',
                            // Solid traditional candlestick body background!
                            backgroundColor: inBody ? candleColor : 'transparent',
                            // Frame the candle body with clean border lines
                            borderLeft: inBody ? `2.5px solid ${candleColor}` : 'none',
                            borderRight: inBody ? `2.5px solid ${candleColor}` : 'none'
                          }}
                        >
                          {/* Candlestick Wick (High/Low shadow) */}
                          {inWick && (
                            <div style={{
                              position: 'absolute',
                              left: '50%',
                              top: 0,
                              bottom: 0,
                              width: '1.5px',
                              backgroundColor: 'rgba(255, 255, 255, 0.4)',
                              transform: 'translateX(-50%)',
                              pointerEvents: 'none',
                              zIndex: 1
                            }} />
                          )}

                          {/* Left: Bid */}
                          <div style={{ 
                            flex: 1, 
                            backgroundColor: bidBg, 
                            color: inBody 
                              ? (sellImbalance ? 'yellow' : 'white') 
                              : (sellImbalance ? '#ef4444' : '#6b7280'),
                            fontWeight: (sellImbalance || inBody) ? '900' : 'normal',
                            fontSize: `${activeZoom.fontSize}px`, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderRight: inBody ? '1px solid rgba(255,255,255,0.15)' : 'none', // No dividers in wicks!
                            padding: activeZoom.padding,
                            border: sellImbalance ? '1.5px solid #ef4444' : undefined,
                            borderRadius: sellImbalance ? '3px' : undefined,
                            zIndex: sellImbalance ? 2 : undefined,
                            boxSizing: 'border-box'
                          }}>
                            {hasBid && activeZoom.showText ? formatVolume(level.bid) : ''}
                          </div>

                          {/* Right: Ask */}
                          <div style={{ 
                            flex: 1, 
                            backgroundColor: askBg, 
                            color: inBody 
                              ? (buyImbalance ? 'yellow' : 'white') 
                              : (buyImbalance ? '#10b981' : '#9ca3af'),
                            fontWeight: (buyImbalance || inBody) ? '900' : 'normal',
                            fontSize: `${activeZoom.fontSize}px`, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: activeZoom.padding,
                            border: buyImbalance ? '1.5px solid #10b981' : undefined,
                            borderRadius: buyImbalance ? '3px' : undefined,
                            zIndex: buyImbalance ? 2 : undefined,
                            boxSizing: 'border-box'
                          }}>
                            {hasAsk && activeZoom.showText ? formatVolume(level.ask) : ''}
                          </div>

                          {/* POC gold highlight */}
                          {isPoc && (
                            <div style={{ position: 'absolute', inset: 0, border: '1.5px solid gold', pointerEvents: 'none', borderRadius: '2px' }} title="Point of Control (POC)"></div>
                          )}

                          {/* VWAP label inside cell */}
                          {isVwap && activeZoom.showText && zoomLevel >= 3 && (
                            <div style={{ position: 'absolute', right: '2px', bottom: '1px', fontSize: '6px', fontWeight: '900', color: '#60a5fa', backgroundColor: 'rgba(15,23,42,0.8)', padding: '0 2px', borderRadius: '2px', border: '0.5px solid rgba(59,130,246,0.3)', pointerEvents: 'none' }}>
                              VWAP
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Column Footer (Sticky vertically) */}
                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    padding: '6px 8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '3px', 
                    flexShrink: 0,
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10
                  }}>
                    {zoomLevel > 1 ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Vol:</span>
                          <span style={{ fontWeight: '700', color: 'white' }}>{formatVolume(block.volume)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Delta:</span>
                          <span style={{ fontWeight: '800', color: block.delta >= 0 ? '#10b981' : '#ef4444' }}>
                            {block.delta >= 0 ? `+${formatVolume(block.delta)}` : formatVolume(block.delta)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>CumD:</span>
                          <span style={{ fontWeight: '800', color: block.cumulativeDelta >= 0 ? '#10b981' : '#ef4444' }}>
                            {block.cumulativeDelta >= 0 ? `+${formatVolume(block.cumulativeDelta)}` : formatVolume(block.cumulativeDelta)}
                          </span>
                        </div>
                      </>
                    ) : null}

                    {/* Delta Histogram Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        width: `${Math.min(50, (Math.abs(block.delta) / (block.volume || 1)) * 100)}%`,
                        height: '100%',
                        transform: block.delta < 0 ? 'translateX(-100%)' : 'none',
                        backgroundColor: block.delta >= 0 ? '#10b981' : '#ef4444',
                        borderRadius: '2px'
                      }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  </div>

                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* Info Tips Glossary */}
      <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ShieldAlert size={14} color="var(--accent-purple)" />
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>Orderflow Signals & Indicators</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <div>🔵 <strong style={{ color: 'white' }}>VWAP Line</strong>: Represented as a <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>dashed blue line</span> crossing each footprint column. Resets daily.</div>
          <div>🟢 <strong style={{ color: 'white' }}>IB (Initiative Buying)</strong>: 3+ stacked consecutive buy imbalances. Aggressive buyers.</div>
          <div>🔴 <strong style={{ color: 'white' }}>IS (Initiative Selling)</strong>: 3+ stacked consecutive sell imbalances. Aggressive sellers.</div>
          <div>🔵 <strong style={{ color: 'white' }}>ABS-B (Buyer Absorption)</strong>: Bullish close with large sell imbalances (absorbing sellers).</div>
          <div>🟠 <strong style={{ color: 'white' }}>ABS-S (Seller Absorption)</strong>: Bearish close with large buy imbalances (absorbing buyers).</div>
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '2px' }}>
            📈 <strong>Horizontal Scroll</strong>: Scroll horizontally to view all bars beyond the morning session (e.g. past 9:45). Headers and Delta stats remain sticky!
          </div>
        </div>
      </div>

    </div>
  );
};
