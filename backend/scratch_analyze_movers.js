import { TradingViewBridge } from './tradingview.js';
import { calculateDayProfile } from './pattern_learner.js';

const symbols = [
  "NSE:NIFTY", "NSE:BANKNIFTY", "NSE:RELIANCE", "NSE:TCS", "NSE:HDFCBANK", 
  "NSE:TATAMOTORS", "NSE:SBIN", "NSE:SUZLON", "NSE:ITC", "NSE:INFY", 
  "NSE:ICICIBANK", "NSE:BHARTIARTL", "NSE:ADANIENT", "NSE:RVNL", "NSE:ZOMATO"
];

async function main() {
  const bridge = new TradingViewBridge();
  console.log("Connecting to TradingView WebSocket to identify top movers...");
  
  const movers = [];

  for (const sym of symbols) {
    try {
      console.log(`Fetching candles for ${sym}...`);
      const data = await new Promise((resolve, reject) => {
        let resolved = false;
        bridge.subscribeSymbol(sym, '30', (res) => {
          if (res.isSnapshot && !resolved) {
            resolved = true;
            resolve(res.candles);
          }
        }, (err) => {
          reject(err);
        }).catch(reject);
      });

      if (data && data.length > 50) {
        const sorted = [...data].sort((a, b) => a.time - b.time);
        const daysMap = {};
        for (const c of sorted) {
          const dStr = new Date(c.time * 1000).toISOString().split('T')[0];
          if (!daysMap[dStr]) daysMap[dStr] = [];
          daysMap[dStr].push(c);
        }
        
        const sortedDates = Object.keys(daysMap).sort();
        if (sortedDates.length >= 2) {
          const lastDate = sortedDates[sortedDates.length - 1];
          const priorDate = sortedDates[sortedDates.length - 2];
          
          const lastDayCandles = daysMap[lastDate];
          const priorDayCandles = daysMap[priorDate];
          
          const lastClose = lastDayCandles[lastDayCandles.length - 1].close;
          const priorClose = priorDayCandles[priorDayCandles.length - 1].close;
          
          const pctChange = ((lastClose - priorClose) / priorClose) * 100;
          
          movers.push({
            symbol: sym,
            pctChange,
            lastDate,
            priorDate,
            candles: lastDayCandles,
            priorCandles: priorDayCandles,
            lastClose
          });
        }
      }
    } catch (e) {
      console.error(`Failed to fetch for ${sym}:`, e.message);
    }
  }

  if (movers.length === 0) {
    console.log("No movers found.");
    bridge.closeSession();
    return;
  }

  // Find the top absolute mover
  movers.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  const topMover = movers[0];
  console.log(`\n=== TOP MOVER: ${topMover.symbol} ===`);
  console.log(`Percentage Change: ${topMover.pctChange.toFixed(2)}%`);
  console.log(`Close Price: ${topMover.lastClose.toFixed(2)}`);
  console.log(`Date: ${topMover.lastDate}\n`);

  // Calculate day profiles
  const lastProfile = calculateDayProfile(topMover.lastDate, topMover.candles, 40, topMover.symbol);
  const priorProfile = calculateDayProfile(topMover.priorDate, topMover.priorCandles, 40, topMover.symbol);

  if (lastProfile && priorProfile) {
    console.log("--- Last Session Profile Details ---");
    console.log(`High: ${lastProfile.dayHigh}`);
    console.log(`Low: ${lastProfile.dayLow}`);
    console.log(`POC: ${lastProfile.pocPrice}`);
    console.log(`VAH: ${lastProfile.vahPrice}`);
    console.log(`VAL: ${lastProfile.valPrice}`);
    console.log(`IB High: ${lastProfile.ibHigh}`);
    console.log(`IB Low: ${lastProfile.ibLow}`);
    console.log(`Tick Size: ${lastProfile.tickSize}`);
    
    // Check for drive, failures, rule compliance
    const ibRange = lastProfile.ibHigh - lastProfile.ibLow;
    const dayRange = lastProfile.dayHigh - lastProfile.dayLow;
    console.log(`IB Range: ${ibRange.toFixed(2)} | Day Range: ${dayRange.toFixed(2)}`);
    
    // Analyze Open relationship
    const openPrice = topMover.candles[0].open;
    console.log(`Open Price: ${openPrice}`);
    if (openPrice > priorProfile.dayHigh) {
      console.log("Open Relationship: Gap Up (Extremely Bullish imbalance)");
    } else if (openPrice < priorProfile.dayLow) {
      console.log("Open Relationship: Gap Down (Extremely Bearish imbalance)");
    } else if (openPrice >= priorProfile.valPrice && openPrice <= priorProfile.vahPrice) {
      console.log("Open Relationship: Inside Value (Balance/Rotational focus)");
    } else {
      console.log("Open Relationship: Outside Value, Inside Range (Targeting Value Area borders)");
    }

    // Check for IB breakouts
    const ibBrokeHigh = lastProfile.dayHigh > lastProfile.ibHigh;
    const ibBrokeLow = lastProfile.dayLow < lastProfile.ibLow;
    if (ibBrokeHigh && !ibBrokeLow) {
      console.log("Auction Behavior: IB High Breakout (OTF Buyers active)");
    } else if (ibBrokeLow && !ibBrokeHigh) {
      console.log("Auction Behavior: IB Low Breakout (OTF Sellers active)");
    } else if (ibBrokeHigh && ibBrokeLow) {
      console.log("Auction Behavior: Double IB Extension (Volatile/Neutral Day)");
    } else {
      console.log("Auction Behavior: Rotational/Inside IB (Rotational Balancing Day)");
    }
  }

  bridge.closeSession();
}

main().catch(console.error);
