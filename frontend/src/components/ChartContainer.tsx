import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { Candle } from '../utils/profileCalculator';

interface ChartContainerProps {
  candles: Candle[];
  symbol: string;
  timeframe?: string;
  pocPrice?: number;
  vahPrice?: number;
  valPrice?: number;
  ibHigh?: number;
  ibLow?: number;
  
  // New props for PDF-based reference levels
  priorPocPrice?: number;
  priorVahPrice?: number;
  priorValPrice?: number;
  poorHighPrice?: number;
  poorLowPrice?: number;
  untestedPocs?: { price: number; date: string }[];
  failedAuctions?: { price: number; type: 'high' | 'low'; date: string }[];
  ddGapTop?: number;
  ddGapBottom?: number;
  threeDayBalanceHigh?: number;
  threeDayBalanceLow?: number;

  // Session Opening props
  openPrice?: number;
  openingType?: string;

  // Active single prints
  activeSinglePrints?: { start: number; end: number }[];
  legacySapnas?: { start: number; end: number; date: string }[];

  // Visible price range change callback
  onVisiblePriceRangeChange?: (range: { min: number; max: number; paneHeight: number } | null) => void;

  // GEX Levels props
  gexCallWall?: number;
  gexPutWall?: number;
  gexFlipZone?: number;
  gexMaxPain?: number;
  sessionPeriod?: 'daily' | 'weekly' | 'monthly';
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  symbol,
  timeframe = '30',
  sessionPeriod,
  pocPrice,
  vahPrice,
  valPrice,
  ibHigh,
  ibLow,
  priorPocPrice,
  priorVahPrice,
  priorValPrice,
  poorHighPrice,
  poorLowPrice,
  untestedPocs,
  failedAuctions,
  ddGapTop,
  ddGapBottom,
  threeDayBalanceHigh,
  threeDayBalanceLow,
  openPrice,
  openingType,
  activeSinglePrints,
  legacySapnas,
  onVisiblePriceRangeChange,
  gexCallWall,
  gexPutWall,
  gexFlipZone,
  gexMaxPain
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Custom price lines for profile metrics
  const pocLineRef = useRef<any>(null);
  const vahLineRef = useRef<any>(null);
  const valLineRef = useRef<any>(null);

  // Price lines for Initial Balance & Extensions
  const ibHighLineRef = useRef<any>(null);
  const ibLowLineRef = useRef<any>(null);
  const ext1618UpLineRef = useRef<any>(null);
  const ext1618DownLineRef = useRef<any>(null);
  const ext2618UpLineRef = useRef<any>(null);
  const ext2618DownLineRef = useRef<any>(null);
  const ext3618UpLineRef = useRef<any>(null);
  const ext3618DownLineRef = useRef<any>(null);

  // New PDF references
  const priorPocLineRef = useRef<any>(null);
  const priorVahLineRef = useRef<any>(null);
  const priorValLineRef = useRef<any>(null);
  const poorHighLineRef = useRef<any>(null);
  const poorLowLineRef = useRef<any>(null);
  const ddGapTopLineRef = useRef<any>(null);
  const ddGapBottomLineRef = useRef<any>(null);
  const threeDayBalHighLineRef = useRef<any>(null);
  const threeDayBalLowLineRef = useRef<any>(null);
  const untestedPocLinesRef = useRef<any[]>([]);
  const failedAuctionLinesRef = useRef<any[]>([]);
  const activeSinglePrintLinesRef = useRef<any[]>([]);
  const legacySapnaLinesRef = useRef<any[]>([]);

  // Open line
  const openPriceLineRef = useRef<any>(null);
  const lastSymbolTimeframeRef = useRef<string>('');

  // GEX Refs
  const gexCallWallLineRef = useRef<any>(null);
  const gexPutWallLineRef = useRef<any>(null);
  const gexFlipZoneLineRef = useRef<any>(null);
  const gexMaxPainLineRef = useRef<any>(null);

  const onVisiblePriceRangeChangeRef = useRef(onVisiblePriceRangeChange);
  const handleRangeChangeRef = useRef<() => void>(() => {});

  useEffect(() => {
    onVisiblePriceRangeChangeRef.current = onVisiblePriceRangeChange;
  }, [onVisiblePriceRangeChange]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0d1017' },
        textColor: '#9ca3af',
        fontSize: 12,
        fontFamily: 'Outfit, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' }
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: {
          color: '#8b5cf6',
          width: 1,
          style: 3, // LineStyle.Dashed
          labelBackgroundColor: '#8b5cf6'
        },
        horzLine: {
          color: '#8b5cf6',
          width: 1,
          style: 3, // LineStyle.Dashed
          labelBackgroundColor: '#8b5cf6'
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        visible: true
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add Volume Series
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'volume-scale'
    });
    
    chart.priceScale('volume-scale').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      },
      visible: false
    });
    volumeSeriesRef.current = volumeSeries;

    // Add Anchored VWAP Series
    const vwapSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: 2, // dashed style
      priceLineVisible: false,
      title: 'VWAP'
    });
    vwapSeriesRef.current = vwapSeries;

    const handleRangeChange = () => {
      if (!chartRef.current || !candlestickSeriesRef.current) return;
      try {
        const height = chartRef.current.paneSize().height;
        const min = candlestickSeriesRef.current.coordinateToPrice(height);
        const max = candlestickSeriesRef.current.coordinateToPrice(0);
        if (min !== null && max !== null && min < max) {
          onVisiblePriceRangeChangeRef.current?.({ min, max, paneHeight: height });
        }
      } catch (e) {
        // Safe catch if paneSize is not ready yet
      }
    };

    handleRangeChangeRef.current = handleRangeChange;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      requestAnimationFrame(handleRangeChange);
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
        requestAnimationFrame(handleRangeChange);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    const container = chartContainerRef.current;
    const triggerUpdate = () => {
      requestAnimationFrame(handleRangeChange);
    };

    if (container) {
      container.addEventListener('wheel', triggerUpdate, { passive: true });
      container.addEventListener('mousemove', triggerUpdate);
      container.addEventListener('touchmove', triggerUpdate, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('wheel', triggerUpdate);
        container.removeEventListener('mousemove', triggerUpdate);
        container.removeEventListener('touchmove', triggerUpdate);
      }
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const chartData = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const volumeData = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    }));

    candlestickSeriesRef.current.setData(chartData);
    volumeSeriesRef.current.setData(volumeData);

    // Calculate and set daily-anchored VWAP
    if (vwapSeriesRef.current) {
      let currentDayStr = '';
      let cumulativeVolume = 0;
      let cumulativePriceVolume = 0;

      const vwapData = candles.map((c) => {
        const date = new Date((c.time as number) * 1000);
        const dayStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (dayStr !== currentDayStr) {
          currentDayStr = dayStr;
          cumulativeVolume = 0;
          cumulativePriceVolume = 0;
        }

        const ohlcPrice = (c.open + c.high + c.low + c.close) / 4;
        cumulativePriceVolume += ohlcPrice * c.volume;
        cumulativeVolume += c.volume;

        return {
          time: c.time as Time,
          value: cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : ohlcPrice
        };
      });

      vwapSeriesRef.current.setData(vwapData);
    }
    
    // Only fit content on initial load of symbol/timeframe/sessionPeriod to avoid snapping zoom on live ticks
    const currentKey = `${symbol}-${timeframe}-${sessionPeriod || 'daily'}`;
    if (lastSymbolTimeframeRef.current !== currentKey) {
      if (sessionPeriod === 'monthly' && candles.length > 150) {
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: candles.length - 150,
          to: candles.length + 5,
        });
      } else if (sessionPeriod === 'weekly' && candles.length > 100) {
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: candles.length - 100,
          to: candles.length + 3,
        });
      } else {
        chartRef.current?.timeScale().fitContent();
      }
      lastSymbolTimeframeRef.current = currentKey;
    }

    // Propagate visible range on data change/render
    requestAnimationFrame(() => {
      handleRangeChangeRef.current();
    });
  }, [candles, symbol, timeframe, sessionPeriod]);

  // Update Price Lines
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    // Helper to clear a line ref
    const clearLine = (ref: React.MutableRefObject<any>) => {
      if (ref.current) {
        try { series.removePriceLine(ref.current); } catch (e) {}
        ref.current = null;
      }
    };

    // Clean up standard lines
    clearLine(pocLineRef);
    clearLine(vahLineRef);
    clearLine(valLineRef);

    // Clean up IB & extensions
    clearLine(ibHighLineRef);
    clearLine(ibLowLineRef);
    clearLine(ext1618UpLineRef);
    clearLine(ext1618DownLineRef);
    clearLine(ext2618UpLineRef);
    clearLine(ext2618DownLineRef);
    clearLine(ext3618UpLineRef);
    clearLine(ext3618DownLineRef);

    // Clean up new PDF lines
    clearLine(priorPocLineRef);
    clearLine(priorVahLineRef);
    clearLine(priorValLineRef);
    clearLine(poorHighLineRef);
    clearLine(poorLowLineRef);
    clearLine(ddGapTopLineRef);
    clearLine(ddGapBottomLineRef);
    clearLine(threeDayBalHighLineRef);
    clearLine(threeDayBalLowLineRef);
    clearLine(openPriceLineRef);

    // Clean up untested POCs list
    if (untestedPocLinesRef.current.length > 0) {
      untestedPocLinesRef.current.forEach(line => {
        try { series.removePriceLine(line); } catch (e) {}
      });
      untestedPocLinesRef.current = [];
    }

    // Clean up Failed Auctions list
    if (failedAuctionLinesRef.current.length > 0) {
      failedAuctionLinesRef.current.forEach(line => {
        try { series.removePriceLine(line); } catch (e) {}
      });
      failedAuctionLinesRef.current = [];
    }

    // Clean up active single prints list
    if (activeSinglePrintLinesRef.current.length > 0) {
      activeSinglePrintLinesRef.current.forEach(line => {
        try { series.removePriceLine(line); } catch (e) {}
      });
      activeSinglePrintLinesRef.current = [];
    }

    // Clean up legacy Sapnas list
    if (legacySapnaLinesRef.current.length > 0) {
      legacySapnaLinesRef.current.forEach(line => {
        try { series.removePriceLine(line); } catch (e) {}
      });
      legacySapnaLinesRef.current = [];
    }

    // Clean up GEX lines
    clearLine(gexCallWallLineRef);
    clearLine(gexPutWallLineRef);
    clearLine(gexFlipZoneLineRef);
    clearLine(gexMaxPainLineRef);

    // 1. Draw Active POC
    if (pocPrice) {
      pocLineRef.current = series.createPriceLine({
        price: pocPrice,
        color: '#00f0ff',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'POC'
      });
    }

    // 2. Draw Active VAH
    if (vahPrice) {
      vahLineRef.current = series.createPriceLine({
        price: vahPrice,
        color: '#ec4899',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'VAH'
      });
    }

    // 3. Draw Active VAL
    if (valPrice) {
      valLineRef.current = series.createPriceLine({
        price: valPrice,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'VAL'
      });
    }

    // 4. Draw Initial Balance & Fibonacci Extensions
    if (ibHigh && ibLow && ibHigh > ibLow) {
      const ibRange = ibHigh - ibLow;

      ibHighLineRef.current = series.createPriceLine({
        price: ibHigh,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'IB High'
      });

      ibLowLineRef.current = series.createPriceLine({
        price: ibLow,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'IB Low'
      });

      // 1.618
      const up1618 = ibLow + (ibRange * 1.618);
      ext1618UpLineRef.current = series.createPriceLine({
        price: up1618,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 1.618 U'
      });

      const down1618 = ibHigh - (ibRange * 1.618);
      ext1618DownLineRef.current = series.createPriceLine({
        price: down1618,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 1.618 D'
      });

      // 2.618
      const up2618 = ibLow + (ibRange * 2.618);
      ext2618UpLineRef.current = series.createPriceLine({
        price: up2618,
        color: '#f97316',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 2.618 U'
      });

      const down2618 = ibHigh - (ibRange * 2.618);
      ext2618DownLineRef.current = series.createPriceLine({
        price: down2618,
        color: '#f97316',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 2.618 D'
      });

      // 3.618
      const up3618 = ibLow + (ibRange * 3.618);
      ext3618UpLineRef.current = series.createPriceLine({
        price: up3618,
        color: '#ffffff',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 3.618 U'
      });

      const down3618 = ibHigh - (ibRange * 3.618);
      ext3618DownLineRef.current = series.createPriceLine({
        price: down3618,
        color: '#ffffff',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Fib 3.618 D'
      });
    }

    // 5. Draw Prior POC (Cyan, Dashed)
    if (priorPocPrice) {
      priorPocLineRef.current = series.createPriceLine({
        price: priorPocPrice,
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Prior POC'
      });
    }

    // 6. Draw Prior VAH (Pink, Dashed)
    if (priorVahPrice) {
      priorVahLineRef.current = series.createPriceLine({
        price: priorVahPrice,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Prior VAH'
      });
    }

    // 7. Draw Prior VAL (Purple, Dashed)
    if (priorValPrice) {
      priorValLineRef.current = series.createPriceLine({
        price: priorValPrice,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Prior VAL'
      });
    }

    // 8. Draw Poor High (Red, Dotted, Unfinished extreme)
    if (poorHighPrice) {
      poorHighLineRef.current = series.createPriceLine({
        price: poorHighPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'Poor High (Unfinished)'
      });
    }

    // 9. Draw Poor Low (Red, Dotted, Unfinished extreme)
    if (poorLowPrice) {
      poorLowLineRef.current = series.createPriceLine({
        price: poorLowPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'Poor Low (Unfinished)'
      });
    }

    // 10. Draw Double Distribution Single Print Gap (Prior Sapna) Boundary
    if (ddGapTop) {
      ddGapTopLineRef.current = series.createPriceLine({
        price: ddGapTop,
        color: '#ec4899',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Prior Sapna Top'
      });
    }
    if (ddGapBottom) {
      ddGapBottomLineRef.current = series.createPriceLine({
        price: ddGapBottom,
        color: '#ec4899',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Prior Sapna Btm'
      });
    }

    // 11. Draw 3-Day Balance High & Low boundaries
    if (threeDayBalanceHigh) {
      threeDayBalHighLineRef.current = series.createPriceLine({
        price: threeDayBalanceHigh,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: '3D Bal High'
      });
    }
    if (threeDayBalanceLow) {
      threeDayBalLowLineRef.current = series.createPriceLine({
        price: threeDayBalanceLow,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: '3D Bal Low'
      });
    }

    // 12. Draw Untested POC target lines (Naked POCs)
    if (untestedPocs && untestedPocs.length > 0) {
      const formatUpocDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        const dStr = parseInt(parts[2], 10).toString();
        if (mIdx >= 0 && mIdx < 12) return `${monthNames[mIdx]} ${dStr}`;
        return dateStr;
      };

      untestedPocs.forEach((upoc) => {
        const dateStr = formatUpocDate(upoc.date);
        const line = series.createPriceLine({
          price: upoc.price,
          color: '#f43f5e', // Rose color
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `NPOC (${dateStr})`
        });
        untestedPocLinesRef.current.push(line);
      });
    }

    // 12b. Draw Unfilled Failed Auctions
    if (failedAuctions && failedAuctions.length > 0) {
      const formatFaDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        const dStr = parseInt(parts[2], 10).toString();
        if (mIdx >= 0 && mIdx < 12) return `${monthNames[mIdx]} ${dStr}`;
        return dateStr;
      };

      failedAuctions.forEach((fa) => {
        const dateStr = formatFaDate(fa.date);
        const titleLabel = fa.type === 'high' ? `FA High (${dateStr})` : `FA Low (${dateStr})`;
        const line = series.createPriceLine({
          price: fa.price,
          color: '#f97316', // Orange color
          lineWidth: 2,
          lineStyle: 1, // Dotted
          axisLabelVisible: true,
          title: titleLabel
        });
        failedAuctionLinesRef.current.push(line);
      });
    }

    // Draw Legacy Unfilled Sapnas (Single Prints / DD Gaps)
    if (legacySapnas && legacySapnas.length > 0) {
      const formatSapnaDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        const dStr = parseInt(parts[2], 10).toString();
        if (mIdx >= 0 && mIdx < 12) return `${monthNames[mIdx]} ${dStr}`;
        return dateStr;
      };

      legacySapnas.forEach((sapna) => {
        const dateStr = formatSapnaDate(sapna.date);
        
        const lineTop = series.createPriceLine({
          price: sapna.end,
          color: '#ec4899',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `Sapna Top (${dateStr})`
        });
        legacySapnaLinesRef.current.push(lineTop);

        const lineBottom = series.createPriceLine({
          price: sapna.start,
          color: '#ec4899',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `Sapna Btm (${dateStr})`
        });
        legacySapnaLinesRef.current.push(lineBottom);
      });
    }

    // 13. Draw Session Opening Price (Color-coded by type)
    if (openPrice && openingType) {
      let lineColor = '#f59e0b'; // Gold default for Open Auction
      if (openingType.includes('Bullish')) {
        lineColor = '#10b981'; // Green for Bullish Open Drive / Test Drive
      } else if (openingType.includes('Bearish')) {
        lineColor = '#ef4444'; // Red for Bearish Open Drive / Test Drive
      } else if (openingType.includes('ORR') || openingType.includes('Rejection')) {
        lineColor = '#c084fc'; // Purple for Rejection Reverse
      }
      
      openPriceLineRef.current = series.createPriceLine({
        price: openPrice,
        color: lineColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `Open: ${openingType}`
      });
    }

    // 14. Draw Active Single Prints (Sapna)
    if (activeSinglePrints && activeSinglePrints.length > 0) {
      activeSinglePrints.forEach((range, idx) => {
        const lineStart = series.createPriceLine({
          price: range.start,
          color: '#f43f5e', // Rose Red
          lineWidth: 1,
          lineStyle: 3, // Dotted
          axisLabelVisible: true,
          title: `Sapna Btm ${idx + 1}`
        });
        activeSinglePrintLinesRef.current.push(lineStart);

        const lineEnd = series.createPriceLine({
          price: range.end,
          color: '#f43f5e', // Rose Red
          lineWidth: 1,
          lineStyle: 3, // Dotted
          axisLabelVisible: true,
          title: `Sapna Top ${idx + 1}`
        });
        activeSinglePrintLinesRef.current.push(lineEnd);
      });
    }

    // 15. Draw GEX Call Wall
    if (gexCallWall) {
      gexCallWallLineRef.current = series.createPriceLine({
        price: gexCallWall,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: 'GEX Call Wall (CW)'
      });
    }

    // 16. Draw GEX Put Wall
    if (gexPutWall) {
      gexPutWallLineRef.current = series.createPriceLine({
        price: gexPutWall,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: 'GEX Put Wall (PW)'
      });
    }

    // 17. Draw GEX Flip Zone
    if (gexFlipZone) {
      gexFlipZoneLineRef.current = series.createPriceLine({
        price: gexFlipZone,
        color: '#a78bfa',
        lineWidth: 1,
        lineStyle: 3, // dotted
        axisLabelVisible: true,
        title: 'GEX Flip Zone (FZ)'
      });
    }

    // 18. Draw GEX Max Pain
    if (gexMaxPain) {
      gexMaxPainLineRef.current = series.createPriceLine({
        price: gexMaxPain,
        color: '#e879f9',
        lineWidth: 1,
        lineStyle: 3, // dotted
        axisLabelVisible: true,
        title: 'GEX Max Pain (MP)'
      });
    }

  }, [
    pocPrice, vahPrice, valPrice, ibHigh, ibLow, candles,
    priorPocPrice, priorVahPrice, priorValPrice,
    poorHighPrice, poorLowPrice, untestedPocs, failedAuctions,
    ddGapTop, ddGapBottom,
    threeDayBalanceHigh, threeDayBalanceLow,
    openPrice, openingType, activeSinglePrints, legacySapnas,
    gexCallWall, gexPutWall, gexFlipZone, gexMaxPain
  ]);

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: '1', height: '100%', overflow: 'hidden' }}>
      
      {/* Chart Title Overlay */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(13, 16, 23, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{symbol}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            Candlestick Chart
          </span>
        </div>
        {candles.length > 0 && (
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span>O: <strong style={{ color: 'white' }}>{candles[candles.length - 1].open.toFixed(2)}</strong></span>
            <span>H: <strong style={{ color: '#10b981' }}>{candles[candles.length - 1].high.toFixed(2)}</strong></span>
            <span>L: <strong style={{ color: '#ef4444' }}>{candles[candles.length - 1].low.toFixed(2)}</strong></span>
            <span>C: <strong style={{ color: 'white' }}>{candles[candles.length - 1].close.toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      <div 
        ref={chartContainerRef} 
        style={{ flex: '1', minHeight: '380px', width: '100%', position: 'relative' }} 
      />

    </div>
  );
};
