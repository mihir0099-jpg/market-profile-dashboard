import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { TradingViewBridge } from './tradingview.js';
import { startScanner, getScannerState } from './scanner.js';
import { runPatternLearner } from './pattern_learner.js';
import { generateBtstReport } from './generate_btst_report.js';
import { generateNineAmReport } from './generate_nineam_report.js';
import { logOptionsChainData } from './options_logger.js';
import { getMonthlyProfileData } from './monthly_profile_analyzer.js';
import { exec, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import compression from 'compression';
import net from 'net';

process.on('uncaughtException', (err) => {
  console.error('[Node Backend Error] Uncaught Exception:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Node Backend Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(compression());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEX_PORT = process.env.GEX_PORT || 5000;

// Disable caching to prevent browser caching issues
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Serve static files from React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Scanner API endpoint
app.get('/api/scanner', (req, res) => {
  res.json(getScannerState());
});

// Serve Daily Reports list
app.get('/api/daily-reports', (req, res) => {
  const reportsDir = path.join(__dirname, 'daily_reports');
  if (!fs.existsSync(reportsDir)) {
    return res.json([]);
  }
  try {
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('report_') && f.endsWith('.md'))
      .map(f => f.replace('report_', '').replace('.md', ''))
      .sort((a, b) => b.localeCompare(a));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve specific Daily Report content
app.get('/api/daily-reports/:date', (req, res) => {
  const { date } = req.params;
  const cleanDate = date.replace(/[^0-9\-]/g, '');
  const reportPath = path.join(__dirname, 'daily_reports', `report_${cleanDate}.md`);
  if (!fs.existsSync(reportPath)) {
    return res.status(404).send('Report not found');
  }
  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    res.send(content);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Serve active viewers count
app.get('/api/viewers', (req, res) => {
  res.json({ count: wss.clients.size });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('error', (err) => {
  console.error('[Node Backend] WebSocket Server error:', err);
});

// Helper to broadcast active viewer count to all clients
function broadcastViewerCount() {
  const count = wss.clients.size;
  const payload = JSON.stringify({ type: 'viewer_count', count });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(payload);
      } catch (err) {}
    }
  });
}

const tvBridge = new TradingViewBridge();
startScanner(tvBridge);


wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket server');
  broadcastViewerCount();
  
  ws.on('error', (err) => {
    console.error('[Node Backend] Client WebSocket error:', err);
  });
  
  let unsubscribePromise = null;

  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message);
      console.log('Received WebSocket message:', payload);
      
      if (payload.type === 'subscribe') {
        const { symbol, timeframe } = payload;
        
        // Clean up previous subscription for this connection
        if (unsubscribePromise) {
          const prevCleanup = await unsubscribePromise;
          if (typeof prevCleanup === 'function') {
            await prevCleanup();
          }
          unsubscribePromise = null;
        }

        if (!symbol || !timeframe) {
          ws.send(JSON.stringify({ type: 'error', message: 'Symbol and timeframe are required.' }));
          return;
        }

        // Start subscription (returns a Promise resolving to the cleanup function)
        unsubscribePromise = tvBridge.subscribeSymbol(
          symbol,
          timeframe,
          (data) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'data',
                symbol: data.symbol,
                timeframe: data.timeframe,
                isSnapshot: data.isSnapshot,
                candles: data.candles
              }));
            }
          },
          (err) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `TradingView connection error: ${err.message || err}`
              }));
            }
          }
        );
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      } catch (e) {}
    }
  });

  ws.on('close', async () => {
    console.log('Client disconnected');
    if (unsubscribePromise) {
      try {
        const cleanup = await unsubscribePromise;
        if (typeof cleanup === 'function') {
          await cleanup();
        }
      } catch (err) {
        console.error('Error cleaning up subscription on close:', err);
      }
      unsubscribePromise = null;
    }
    setTimeout(broadcastViewerCount, 100);
  });
});

// Daily diary & pattern learning automation: Runs daily IST (local time)
let lastDiaryRunDate = '';
let lastPatternRunDate = '';
let lastBtstRunDate = '';
let lastNineAmRunDate = '';
let optionsLoggerTickCount = 9; // Run on first tick (after 30 seconds)

setInterval(() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // 1. Diary logger runs at 3:45 PM (15:45) IST
  if (hours === 15 && minutes === 45) {
    if (lastDiaryRunDate !== dateStr) {
      lastDiaryRunDate = dateStr;
      console.log(`[Server Scheduler] It is 3:45 PM IST on ${dateStr}. Executing diary logger...`);
      exec('node diary_logger.js', (err, stdout, stderr) => {
        if (err) {
          console.error('[Server Scheduler] Error running diary logger:', err);
          return;
        }
        console.log('[Server Scheduler] Diary logger completed successfully.');
      });
    }
  }

  // 2. Pattern learner auto-updater runs at 3:50 PM (15:50) IST
  if (hours === 15 && minutes === 50) {
    if (lastPatternRunDate !== dateStr) {
      lastPatternRunDate = dateStr;
      console.log(`[Server Scheduler] It is 3:50 PM IST on ${dateStr}. Executing pattern learner auto-update...`);
      runPatternLearner().catch(err => {
        console.error('[Server Scheduler] Error running pattern learner auto-update:', err);
      });
    }
  }

  // 3. BTST report runs at 3:15 PM (15:15) IST
  if (hours === 15 && minutes === 15) {
    if (lastBtstRunDate !== dateStr) {
      lastBtstRunDate = dateStr;
      console.log(`[Server Scheduler] It is 3:15 PM IST on ${dateStr}. Executing BTST report scan...`);
      generateBtstReport().catch(err => {
        console.error('[Server Scheduler] Error running BTST report scan:', err);
      });
    }
  }

  // 4. 9:00 AM Pre-Market scan runs at 9:00 AM (09:00) IST
  if (hours === 9 && minutes === 0) {
    if (lastNineAmRunDate !== dateStr) {
      lastNineAmRunDate = dateStr;
      console.log(`[Server Scheduler] It is 9:00 AM IST on ${dateStr}. Executing 9 AM Pre-market report scan...`);
      generateNineAmReport().catch(err => {
        console.error('[Server Scheduler] Error running 9 AM Pre-market report scan:', err);
      });
    }
  }

  // 5. Options Chain Snapshot Logger (Runs every 5 minutes during market hours)
  optionsLoggerTickCount++;
  if (optionsLoggerTickCount >= 10) {
    optionsLoggerTickCount = 0;
    logOptionsChainData().catch(err => {
      console.error('[Server Scheduler] Error running options logger:', err);
    });
  }
}, 30 * 1000); // Check every 30 seconds

// Forward to Python GEX Flask App
app.get('/api/gex/instruments', async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:${GEX_PORT}/api/instruments`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to connect to GEX service: ${err.message}` });
  }
});

app.get('/api/gex/expiries', async (req, res) => {
  const { symbol } = req.query;
  try {
    let cleanSymbol = (symbol || 'NIFTY').split(':').pop();
    if (cleanSymbol === 'NIFTY1!') {
      cleanSymbol = 'NIFTY';
    }
    const response = await fetch(`http://127.0.0.1:${GEX_PORT}/api/expiries?symbol=${cleanSymbol}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch GEX expiries: ${err.message}` });
  }
});

app.get('/api/gex/data', async (req, res) => {
  const { symbol, expiry, r } = req.query;
  try {
    let cleanSymbol = (symbol || 'NIFTY').split(':').pop();
    if (cleanSymbol === 'NIFTY1!') {
      cleanSymbol = 'NIFTY';
    }
    let url = `http://127.0.0.1:${GEX_PORT}/api/gex?symbol=${cleanSymbol}`;
    if (expiry) url += `&expiry=${expiry}`;
    if (r) url += `&r=${r}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch GEX data: ${err.message}` });
  }
});

app.get('/api/pcr/data', async (req, res) => {
  const { symbol, expiry } = req.query;
  try {
    let cleanSymbol = (symbol || 'NIFTY').split(':').pop();
    if (cleanSymbol === 'NIFTY1!') {
      cleanSymbol = 'NIFTY';
    }
    let url = `http://127.0.0.1:${GEX_PORT}/api/pcr?symbol=${cleanSymbol}`;
    if (expiry) url += `&expiry=${expiry}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch PCR data: ${err.message}` });
  }
});

// Get scanner auto-learn pattern stats
app.get('/api/scanner/stats', (req, res) => {
  const filePath = path.join(__dirname, 'auto_learnings.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read stats file' });
    }
  } else {
    res.status(404).json({ error: 'Stats not generated yet' });
  }
});

// Get scanner stock options TPO macro stats
app.get('/api/scanner/macro-stats', (req, res) => {
  const filePath = path.join(__dirname, 'all_stocks_macro_stats.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read macro stats file' });
    }
  } else {
    res.json({});
  }
});


// Get monthly profile & 5-day IB analysis
app.get('/api/monthly-profile', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'NSE:NIFTY';
    const data = await getMonthlyProfileData(symbol);
    res.json(data);
  } catch (err) {
    console.error('[API Monthly Profile Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch monthly profile data' });
  }
});


// Get scanner optimal tick configurations
app.get('/api/scanner/ticks', (req, res) => {
  const filePath = path.join(__dirname, 'dynamic_configs.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read ticks file' });
    }
  } else {
    res.json({});
  }
});

// Get scanner setup accuracy scorecard
app.get('/api/scanner/accuracy', (req, res) => {
  const filePath = path.join(__dirname, 'setup_accuracy.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read accuracy file' });
    }
  } else {
    res.status(404).json({ error: 'Accuracy data not generated yet' });
  }
});

// Get 3:15 PM BTST scanner report
app.get('/api/scanner/btst-report', (req, res) => {
  const filePath = path.join(__dirname, 'btst_report.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read BTST report' });
    }
  } else {
    res.status(404).json({ error: 'BTST report not generated yet' });
  }
});

// Get 9:00 AM Pre-market report (generates on the fly if missing)
app.get('/api/scanner/nineam-report', (req, res) => {
  const filePath = path.join(__dirname, 'nineam_report.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read 9 AM Pre-market report' });
    }
  } else {
    console.log('[9 AM API] Report not found. Generating on the fly...');
    generateNineAmReport()
      .then(() => {
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          res.json(data);
        } else {
          res.status(404).json({ error: '9 AM report failed to generate' });
        }
      })
      .catch(err => {
        res.status(500).json({ error: `Failed to generate 9 AM report: ${err.message}` });
      });
  }
});

const STRIKE_INTERVALS = {
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

const gexCacheStore = {};
let isUpdatingCache = false;

async function updateActiveOptionsCache() {
  if (isUpdatingCache) return;
  isUpdatingCache = true;
  
  try {
    const filePath = path.join(__dirname, 'signals.json');
    if (!fs.existsSync(filePath)) {
      isUpdatingCache = false;
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const activeSignals = data.filter(s => s.status === 'ACTIVE');
    if (activeSignals.length === 0) {
      isUpdatingCache = false;
      return;
    }
    
    // Get all unique active symbols starting with NSE:
    const symbols = [...new Set(activeSignals.map(s => s.symbol))].filter(s => s && s.startsWith('NSE:'));
    
    console.log(`[Background GEX] Starting options update for ${symbols.length} active symbols...`);
    
    for (const symbol of symbols) {
      try {
        let cleanSymbol = symbol.split(':').pop();
        if (cleanSymbol === 'NIFTY1!') cleanSymbol = 'NIFTY';
        if (cleanSymbol === 'BANKNIFTY1!') cleanSymbol = 'BANKNIFTY';
        
        const response = await fetch(`http://127.0.0.1:${GEX_PORT}/api/gex?symbol=${cleanSymbol}`);
        if (response.ok) {
          const result = await response.json();
          gexCacheStore[symbol] = {
            data: result,
            timestamp: Date.now()
          };
        } else {
          // If response not ok, cache a null placeholder to prevent hammering if invalid
          if (!gexCacheStore[symbol]) {
            gexCacheStore[symbol] = { data: null, timestamp: Date.now() };
          }
        }
        // Throttling: 200ms delay to prevent rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.warn(`[Background GEX] Failed to fetch data for ${symbol}:`, e.message);
        if (!gexCacheStore[symbol]) {
          gexCacheStore[symbol] = { data: null, timestamp: Date.now() };
        }
      }
    }

    // Update signals.json with actual option entry price and resolve signals if premium hits target/SL
    let signalsUpdated = false;
    for (const sig of data) {
      if (sig.status === 'ACTIVE' && gexCacheStore[sig.symbol] && gexCacheStore[sig.symbol].data) {
        const gexData = gexCacheStore[sig.symbol].data;
        if (gexData.option_chain && gexData.option_chain.length > 0) {
          const cleanSym = sig.symbol.replace('NSE:', '');
          const isLongType = sig.direction === 'BUY' || sig.direction === 'LONG';
          const contractType = isLongType ? 'CE' : 'PE';
          
          // Find closest strike to spot entry
          let closestStrike = gexData.option_chain[0].strike;
          let minDiff = Math.abs(sig.entry - closestStrike);
          for (const item of gexData.option_chain) {
            const diff = Math.abs(sig.entry - item.strike);
            if (diff < minDiff) {
              minDiff = diff;
              closestStrike = item.strike;
            }
          }
          const atmStrike = closestStrike;
          
          const strikeObj = gexData.option_chain.find(s => Math.abs(s.strike - atmStrike) < 1.0);
          if (strikeObj) {
            const ltp = contractType === 'CE' ? strikeObj.ce_ltp : strikeObj.pe_ltp;
            if (ltp && ltp > 0) {
              sig.liveOptionLtp = ltp;
              
              // 1. If actual option entry is not set yet, set it now
              if (!sig.actualOptionEntryPrice) {
                const createdTime = new Date(sig.timestamp).getTime();
                const nowTime = Date.now();
                const isHistorical = (nowTime - createdTime) > 30 * 60 * 1000;
                
                const premiumRatio = sig.symbol.startsWith('NSE:NIFTY') || sig.symbol.startsWith('NSE:BANKNIFTY') ? 0.008 : 0.018;
                if (isHistorical) {
                  sig.actualOptionEntryPrice = Math.round((sig.entry * premiumRatio) * 10) / 10;
                  console.log(`[Background GEX] Initializing historical signal ${sig.symbol} with modeled option entry price: ₹${sig.actualOptionEntryPrice}`);
                } else {
                  sig.actualOptionEntryPrice = ltp;
                  console.log(`[Background GEX] Captured live option entry for ${sig.symbol} at ₹${ltp}`);
                }
                
                const spotRisk = Math.abs(sig.entry - sig.sl);
                const optionRisk = spotRisk * 0.5;
                
                const calculatedSl = Math.round((sig.actualOptionEntryPrice - optionRisk) * 10) / 10;
                const minOptionRisk = sig.actualOptionEntryPrice * 0.15;
                
                if (optionRisk < minOptionRisk || calculatedSl <= 0) {
                  sig.actualOptionSl = Math.round((sig.actualOptionEntryPrice * 0.7) * 10) / 10;
                  sig.actualOptionTarget = Math.round((sig.actualOptionEntryPrice * 1.3) * 10) / 10;
                  sig.actualOptionTarget2 = Math.round((sig.actualOptionEntryPrice * 1.6) * 10) / 10;
                  console.log(`[Background GEX] Target/SL was too tight for ${sig.symbol}. Applied fallback option SL: ₹${sig.actualOptionSl}, T2: ₹${sig.actualOptionTarget2}`);
                } else {
                  sig.actualOptionSl = calculatedSl;
                  sig.actualOptionTarget = Math.round((sig.actualOptionEntryPrice + optionRisk * 1.5) * 10) / 10;
                  sig.actualOptionTarget2 = Math.round((sig.actualOptionEntryPrice + optionRisk * 3.0) * 10) / 10;
                }
                signalsUpdated = true;
              }
              
              // 2. Check for option premium resolution (Target 2 or Stop Loss hit)
              const optEntry = sig.actualOptionEntryPrice;
              const optSL = sig.actualOptionSl;
              const optT2 = sig.actualOptionTarget2;
              
              if (ltp >= optT2) {
                sig.status = 'TARGET_HIT';
                sig.exitPrice = sig.target;
                sig.pnlPoints = isLongType ? (sig.target - sig.entry) : (sig.entry - sig.target);
                sig.resolvedDate = new Date().toISOString().split('T')[0];
                console.log(`[Background GEX] Resolving signal ${sig.id} as TARGET_HIT (Option LTP ₹${ltp} >= T2 ₹${optT2})`);
                signalsUpdated = true;
              } else if (ltp <= optSL) {
                sig.status = 'STOP_LOSS_HIT';
                sig.exitPrice = sig.sl;
                sig.pnlPoints = isLongType ? (sig.sl - sig.entry) : (sig.entry - sig.sl);
                sig.resolvedDate = new Date().toISOString().split('T')[0];
                console.log(`[Background GEX] Resolving signal ${sig.id} as STOP_LOSS_HIT (Option LTP ₹${ltp} <= SL ₹${optSL})`);
                signalsUpdated = true;
              }
            }
          }
        }
      }
    }
    
    if (signalsUpdated) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Background GEX] Saved updated option entry/resolution statuses to signals.json.`);
    }

    console.log(`[Background GEX] Options update cycle complete.`);
  } catch (e) {
    console.error('[Background GEX] Global loop error:', e.message);
  } finally {
    isUpdatingCache = false;
  }
}

// Start background updates (run on startup, and then every 30 seconds)
setInterval(updateActiveOptionsCache, 30000);
// Run initial cache population slightly deferred to let server bind port 3001 first
setTimeout(updateActiveOptionsCache, 1000);

// Get Live Trade Radar Signals
app.get('/api/signals', async (req, res) => {
  const filePath = path.join(__dirname, 'signals.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      for (const sig of data) {
        if (sig.status !== 'ACTIVE' || !gexCacheStore[sig.symbol] || !gexCacheStore[sig.symbol].data) continue;
        
        const gexData = gexCacheStore[sig.symbol].data;
        const cleanSym = sig.symbol.replace('NSE:', '');
        const isLongType = sig.direction === 'BUY' || sig.direction === 'LONG';
        const contractType = isLongType ? 'CE' : 'PE';
        
        let atmStrike;
        if (gexData.option_chain && gexData.option_chain.length > 0) {
          let closestStrike = gexData.option_chain[0].strike;
          let minDiff = Math.abs(sig.entry - closestStrike);
          for (const item of gexData.option_chain) {
            const diff = Math.abs(sig.entry - item.strike);
            if (diff < minDiff) {
              minDiff = diff;
              closestStrike = item.strike;
            }
          }
          atmStrike = closestStrike;
          sig.liveAtmStrike = atmStrike;
        } else {
          const interval = STRIKE_INTERVALS[cleanSym] || (sig.entry < 500 ? 5 : 10);
          atmStrike = Math.round(sig.entry / interval) * interval;
        }
        
        if (gexData.expiry) {
          sig.liveExpiryDate = gexData.expiry;
        }
        
        if (gexData.option_chain) {
          const strikeObj = gexData.option_chain.find(s => Math.abs(s.strike - atmStrike) < 1.0);
          if (strikeObj) {
            const ltp = contractType === 'CE' ? strikeObj.ce_ltp : strikeObj.pe_ltp;
            if (ltp && ltp > 0) {
              sig.liveOptionLtp = ltp;
            }
          }
        }
      }
      
      res.json(data);
    } catch (e) {
      console.error('[Signals API] Error processing signals:', e.message);
      res.status(500).json({ error: 'Failed to read signals database' });
    }
  } else {
    res.json([]);
  }
});

// Update an existing signal
app.post('/api/signals/update', express.json(), (req, res) => {
  const { id, entry, sl, target, target2 } = req.body;
  const filePath = path.join(__dirname, 'signals.json');
  if (fs.existsSync(filePath)) {
    try {
      let signals = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const idx = signals.findIndex(s => s.id === id);
      if (idx !== -1) {
        signals[idx].entry = parseFloat(entry);
        signals[idx].sl = parseFloat(sl);
        signals[idx].target = parseFloat(target);
        if (target2 !== undefined) {
          signals[idx].target2 = parseFloat(target2);
        }
        fs.writeFileSync(filePath, JSON.stringify(signals, null, 2), 'utf8');
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Signal not found' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed to update signals database' });
    }
  } else {
    res.status(404).json({ error: 'Signals database not found' });
  }
});


// Get Auto-Learned Trading Parameters
app.get('/api/learning/params', (req, res) => {
  const filePath = path.join(__dirname, 'learned_params.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read learned parameters' });
    }
  } else {
    res.status(404).json({ error: 'Parameters not initialized yet' });
  }
});

// Get Auto-Learning Log Journal
app.get('/api/learning/journal', (req, res) => {
  const filePath = path.join(__dirname, 'learning_journal.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read learning journal' });
    }
  } else {
    res.json([]);
  }
});

// Fallback to React index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Clean up duplicate signals from database on startup
function cleanDuplicateSignals() {
  const filePath = path.join(__dirname, 'signals.json');
  if (!fs.existsSync(filePath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let cleaned = [];
    let removedCount = 0;
    
    // Group signals by unique key: symbol + strategy + timestamp
    const seen = {};
    for (const sig of data) {
      const key = `${sig.symbol}|${sig.strategy}|${sig.timestamp}`;
      if (!seen[key]) {
        seen[key] = sig;
        cleaned.push(sig);
      } else {
        const existing = seen[key];
        if (sig.status !== 'ACTIVE' && existing.status === 'ACTIVE') {
          seen[key] = sig;
          const index = cleaned.indexOf(existing);
          if (index !== -1) cleaned[index] = sig;
          removedCount++;
        } else {
          removedCount++;
        }
      }
    }
    
    if (removedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
      console.log(`[Startup Cleanup] Cleaned up ${removedCount} duplicate active/resolved signals from signals.json.`);
    }
  } catch (e) {
    console.error('[Startup Cleanup] Error cleaning duplicates:', e.message);
  }
}

cleanDuplicateSignals();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend WebSocket server listening on port ${PORT}`);
  
  // Run pattern learner to calculate live probabilities on startup (delayed by 60s to prevent concurrent socket handshake collision)
  setTimeout(() => {
    runPatternLearner().catch(err => {
      console.error('[Node Backend] Failed to run pattern learner on startup:', err);
    });
  }, 60000);
  
  // Run options snapshot logger on startup
  logOptionsChainData().catch(err => {
    console.error('[Node Backend] Failed to run options logger on startup:', err);
  });
  
  // Start Python GEX Flask App in background if running locally
  const gexAppDir = path.resolve(__dirname, '../../nse-gex-dashboard');
  const gexPython = path.join(gexAppDir, 'venv/Scripts/python.exe');
  const gexApp = path.join(gexAppDir, 'app.py');
  
  if (fs.existsSync(gexPython) && fs.existsSync(gexApp)) {
    // Check if the GEX port is already in use before starting a new instance
    const checkSocket = new net.Socket();
    checkSocket.setTimeout(1000);
    
    checkSocket.on('connect', () => {
      console.log(`[Node Backend] Python GEX Server is already running on port ${GEX_PORT}. Skipping auto-start.`);
      checkSocket.destroy();
    });
    
    const handleNoServer = () => {
      checkSocket.destroy();
      console.log(`[Node Backend] Starting Python GEX Flask Server on port ${GEX_PORT} in ${gexAppDir}...`);
      // Start Flask on the custom GEX_PORT via FLASK_RUN_PORT environment variable
      const gexProcess = spawn(gexPython, [gexApp], { 
        cwd: gexAppDir,
        env: { ...process.env, FLASK_RUN_PORT: GEX_PORT.toString() }
      });

      gexProcess.on('error', (err) => {
        console.error('[Node Backend] Python GEX Server failed to start:', err.message);
      });

      gexProcess.on('exit', (code, signal) => {
        console.log(`[Node Backend] Python GEX Server exited with code ${code} and signal ${signal}`);
      });

      gexProcess.stdout.on('data', (data) => {
        console.log('[Python GEX Server] ' + data.toString().trim());
      });

      gexProcess.stderr.on('data', (data) => {
        console.error('[Python GEX Server Error] ' + data.toString().trim());
      });

      // Clean up child process on parent exit
      process.on('exit', () => {
        gexProcess.kill();
      });
    };
    
    checkSocket.on('timeout', handleNoServer);
    checkSocket.on('error', handleNoServer);
    
    checkSocket.connect(Number(GEX_PORT), '127.0.0.1');
  } else {
    console.warn(`[Node Backend] GEX Flask app not found at ${gexAppDir}. Skipping auto-start.`);
  }
});
