import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function logOptionsChainData() {
  try {
    const now = new Date();
    
    // Convert current UTC time to India Standard Time (IST, UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    
    const day = istDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Note: getUTCHours() and getUTCMinutes() on the offsetted Date will give the IST hours & minutes
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    
    const isWeekday = day >= 1 && day <= 5;
    const minutesSinceMidnight = hours * 60 + minutes;
    
    // Market hours are 9:15 AM (555 minutes) to 3:30 PM (930 minutes) IST
    const isMarketOpen = minutesSinceMidnight >= 555 && minutesSinceMidnight <= 930;
    
    if (!isWeekday || !isMarketOpen) {
      // Don't log outside market hours
      return;
    }

    const symbols = ['NIFTY', 'BANKNIFTY'];
    const filePath = path.join(__dirname, 'options_history.json');
    let history = [];
    
    if (fs.existsSync(filePath)) {
      try {
        history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error('[Options Logger] Failed to parse existing history file, resetting:', e.message);
      }
    }

    for (const symbol of symbols) {
      try {
        // Fetch GEX data from Flask GEX app
        const gexRes = await fetch(`http://127.0.0.1:5000/api/gex?symbol=${symbol}`);
        if (!gexRes.ok) continue;
        const gexData = await gexRes.json();
        
        // Fetch PCR data from Flask GEX app
        const pcrRes = await fetch(`http://127.0.0.1:5000/api/pcr?symbol=${symbol}`);
        if (!pcrRes.ok) continue;
        const pcrData = await pcrRes.json();
        
        const spot = gexData.spot_price;
        const callWall = gexData.stats ? gexData.stats.call_wall : null;
        const putWall = gexData.stats ? gexData.stats.put_wall : null;
        const gammaFlip = gexData.stats ? gexData.stats.gamma_flip : null;
        const maxPain = gexData.stats ? gexData.stats.max_pain : null;
        const pcr = pcrData.oi_pcr || (gexData.stats ? gexData.stats.pcr : null);
        
        const chain = gexData.option_chain || [];
        const findStrikeLtp = (strikeVal, type) => {
          if (!strikeVal) return null;
          const strikeObj = chain.find(s => Math.abs(s.strike - strikeVal) < 1.0);
          if (!strikeObj) return null;
          return type === 'CE' ? strikeObj.ce_ltp : strikeObj.pe_ltp;
        };

        // ATM strike (closest to spot) lookup
        let atmStrike = null;
        let atmCeLtp = null;
        let atmPeLtp = null;
        if (chain.length > 0) {
          const closestObj = chain.reduce((prev, curr) => 
            Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev
          );
          if (closestObj) {
            atmStrike = closestObj.strike;
            atmCeLtp = closestObj.ce_ltp;
            atmPeLtp = closestObj.pe_ltp;
          }
        }

        const snapshot = {
          timestamp: now.toISOString(),
          symbol: symbol,
          spot: spot,
          callWall: callWall,
          callWallCeLtp: findStrikeLtp(callWall, 'CE'),
          putWall: putWall,
          putWallPeLtp: findStrikeLtp(putWall, 'PE'),
          gammaFlip: gammaFlip,
          maxPain: maxPain,
          maxPainCeLtp: findStrikeLtp(maxPain, 'CE'),
          maxPainPeLtp: findStrikeLtp(maxPain, 'PE'),
          atmStrike: atmStrike,
          atmCeLtp: atmCeLtp,
          atmPeLtp: atmPeLtp,
          pcr: pcr
        };

        history.push(snapshot);
        console.log(`[Options Logger] Logged snapshot for ${symbol}: Spot=${spot}, PCR=${pcr}`);
      } catch (err) {
        console.error(`[Options Logger] Failed snapshot for ${symbol}:`, err.message);
      }
    }

    // Keep size cap to ~20,000 entries (approx. 10 market sessions for both symbols at 5-minute ticks)
    if (history.length > 25000) {
      history = history.slice(history.length - 20000);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (globalErr) {
    console.error('[Options Logger] Global error in logging function:', globalErr.message);
  }
}
