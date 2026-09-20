import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'data', 'angelone_config.json');

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const output = [];
  for (let i = 0; i < base32.length; i++) {
    const char = base32[i].toUpperCase();
    if (char === '=') break;
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTOTP(secretKey) {
  const key = base32Decode(secretKey.replace(/\\s+/g, ''));
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;
  return code.toString().padStart(6, '0');
}

export class AngelOneBridge {
  constructor() {
    this.config = {
      apiKey: '',
      clientCode: '',
      mpin: '',
      totpKey: '',
      connected: false,
      lastLogin: null
    };
    this.session = {
      jwtToken: null,
      refreshToken: null,
      feedToken: null,
      userName: null,
      clientName: null,
      loginTime: null
    };
    this._tokenMap = new Map([
      ['NIFTY', { exchange: 'NSE', tradingsymbol: 'Nifty 50', symboltoken: '99926000' }],
      ['BANKNIFTY', { exchange: 'NSE', tradingsymbol: 'Nifty Bank', symboltoken: '99926009' }],
      ['FINNIFTY', { exchange: 'NSE', tradingsymbol: 'Nifty Fin Services', symboltoken: '99926037' }],
      ['MIDCPNIFTY', { exchange: 'NSE', tradingsymbol: 'NIFTY MID SELECT', symboltoken: '99926074' }],
      ['SENSEX', { exchange: 'BSE', tradingsymbol: 'SENSEX', symboltoken: '99919000' }],
      ['RELIANCE', { exchange: 'NSE', tradingsymbol: 'RELIANCE-EQ', symboltoken: '2885' }],
      ['HDFCBANK', { exchange: 'NSE', tradingsymbol: 'HDFCBANK-EQ', symboltoken: '1333' }],
      ['ICICIBANK', { exchange: 'NSE', tradingsymbol: 'ICICIBANK-EQ', symboltoken: '4963' }],
      ['SBIN', { exchange: 'NSE', tradingsymbol: 'SBIN-EQ', symboltoken: '3045' }],
      ['INFY', { exchange: 'NSE', tradingsymbol: 'INFY-EQ', symboltoken: '1594' }],
      ['TCS', { exchange: 'NSE', tradingsymbol: 'TCS-EQ', symboltoken: '11536' }],
      ['AXISBANK', { exchange: 'NSE', tradingsymbol: 'AXISBANK-EQ', symboltoken: '5900' }],
      ['BHARTIARTL', { exchange: 'NSE', tradingsymbol: 'BHARTIARTL-EQ', symboltoken: '10604' }],
      ['LT', { exchange: 'NSE', tradingsymbol: 'LT-EQ', symboltoken: '11483' }],
      ['KOTAKBANK', { exchange: 'NSE', tradingsymbol: 'KOTAKBANK-EQ', symboltoken: '1922' }],
      ['TATASTEEL', { exchange: 'NSE', tradingsymbol: 'TATASTEEL-EQ', symboltoken: '3499' }],
      ['TATAMOTORS', { exchange: 'NSE', tradingsymbol: 'TATAMOTORS-EQ', symboltoken: '3456' }],
      ['BAJFINANCE', { exchange: 'NSE', tradingsymbol: 'BAJFINANCE-EQ', symboltoken: '317' }],
      ['MARUTI', { exchange: 'NSE', tradingsymbol: 'MARUTI-EQ', symboltoken: '10999' }],
      ['SUNPHARMA', { exchange: 'NSE', tradingsymbol: 'SUNPHARMA-EQ', symboltoken: '3351' }],
      ['TITAN', { exchange: 'NSE', tradingsymbol: 'TITAN-EQ', symboltoken: '3506' }],
      ['ITC', { exchange: 'NSE', tradingsymbol: 'ITC-EQ', symboltoken: '1660' }],
      ['ADANIENT', { exchange: 'NSE', tradingsymbol: 'ADANIENT-EQ', symboltoken: '25' }]
    ]);
    this._ltpCache = new Map();
    this._candleCache = new Map();
    this._searchCache = new Map();
    this._candleQueue = Promise.resolve();
    this._lastCandleReqTime = 0;
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...this.config, ...parsed };
        if (parsed.session && parsed.session.jwtToken) {
          this.session = { ...this.session, ...parsed.session };
        }
      }
    } catch (err) {
      console.error('[AngelOne] Error reading config:', err.message);
    }
  }

  saveConfig() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...this.config, session: this.session }, null, 2), 'utf8');
    } catch (err) {
      console.error('[AngelOne] Error saving config:', err.message);
    }
  }

  async login(force = false) {
    this.loadConfig();
    if (!this.config.apiKey || !this.config.clientCode || !this.config.mpin || !this.config.totpKey) {
      throw new Error('Angel One credentials incomplete in angelone_config.json');
    }

    if (!force && this.session.jwtToken && this.session.loginTime) {
      const loginDate = new Date(this.session.loginTime).toDateString();
      const todayDate = new Date().toDateString();
      if (loginDate === todayDate) {
        this.config.connected = true;
        return {
          success: true,
          clientCode: this.config.clientCode,
          clientName: this.session.clientName,
          loginTime: this.session.loginTime,
          cached: true
        };
      }
    }

    const currentTOTP = generateTOTP(this.config.totpKey);
    const payload = JSON.stringify({
      clientcode: this.config.clientCode,
      password: this.config.mpin,
      totp: currentTOTP
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '106.193.147.98',
      'X-MACAddress': 'fe80::216e:6507:4b90:3719',
      'X-PrivateKey': this.config.apiKey,
      'Content-Length': Buffer.byteLength(payload)
    };

    const res = await this._makeRequest('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', 'POST', headers, payload);
    
    if (res && res.status && res.data && res.data.jwtToken) {
      this.session.jwtToken = res.data.jwtToken;
      this.session.refreshToken = res.data.refreshToken;
      this.session.feedToken = res.data.feedToken;
      this.session.loginTime = new Date().toISOString();
      this.config.connected = true;
      this.config.lastLogin = this.session.loginTime;
      this.saveConfig();

      try {
        const prof = await this.getProfile();
        if (prof && prof.name) {
          this.session.clientName = prof.name;
        }
      } catch (pe) {}

      console.log(`[AngelOne] Live login successful for ${this.session.clientName || this.config.clientCode} (TOTP: ${currentTOTP})`);
      return {
        success: true,
        clientCode: this.config.clientCode,
        clientName: this.session.clientName,
        loginTime: this.session.loginTime
      };
    } else {
      this.config.connected = false;
      this.saveConfig();
      throw new Error(res?.message || 'Login failed from Angel One API');
    }
  }

  async _authedGet(url) {
    if (!this.session.jwtToken) {
      await this.login();
    }
    const headers = {
      'Authorization': `Bearer ${this.session.jwtToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '106.193.147.98',
      'X-MACAddress': 'fe80::216e:6507:4b90:3719',
      'X-PrivateKey': this.config.apiKey
    };
    return this._makeRequest(url, 'GET', headers);
  }

  async _authedPost(url, payloadObj) {
    if (!this.session.jwtToken) {
      await this.login();
    }
    const payload = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);
    const headers = {
      'Authorization': `Bearer ${this.session.jwtToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '106.193.147.98',
      'X-MACAddress': 'fe80::216e:6507:4b90:3719',
      'X-PrivateKey': this.config.apiKey,
      'Content-Length': Buffer.byteLength(payload)
    };

    let res = await this._makeRequest(url, 'POST', headers, payload);
    // If token expired or unauthorized, attempt 1 auto-login and retry
    if (res && (res.errorcode === 'AG8001' || res.errorcode === 'AG8002' || res.message?.includes('Invalid Token') || res.message?.includes('Unauthorized'))) {
      console.warn('[AngelOne] Session expired, auto-renewing login...');
      await this.login();
      headers['Authorization'] = `Bearer ${this.session.jwtToken}`;
      res = await this._makeRequest(url, 'POST', headers, payload);
    }
    return res;
  }

  async getLtp(exchange, tradingsymbol, symboltoken) {
    try {
      const res = await this._authedPost('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getLtpData', {
        exchange,
        tradingsymbol,
        symboltoken
      });
      return res?.data || null;
    } catch (e) {
      console.warn(`[AngelOne getLtp Error for ${tradingsymbol}]:`, e.message);
      return null;
    }
  }

  async searchScrip(exchange, searchscrip) {
    try {
      if (!this._searchCache) this._searchCache = new Map();
      const key = `${exchange || 'NSE'}:${searchscrip.toUpperCase().trim()}`;
      if (this._searchCache.has(key)) {
        return this._searchCache.get(key);
      }
      const res = await this._authedPost('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/searchScrip', {
        exchange: exchange || 'NSE',
        searchscrip
      });
      const data = res?.data || [];
      this._searchCache.set(key, data);
      return data;
    } catch (e) {
      console.warn(`[AngelOne searchScrip Error for ${searchscrip}]:`, e.message);
      return [];
    }
  }

  async getCandles(exchange, symboltoken, interval = 'FIVE_MINUTE', fromdate, todate) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const from = fromdate || `${todayStr} 09:15`;
      const to = todate || `${todayStr} 15:30`;
      const cacheKey = `${exchange}:${symboltoken}:${interval}:${from}:${to}`;
      const now = Date.now();

      if (!this._candleCache) this._candleCache = new Map();
      const cached = this._candleCache.get(cacheKey);
      const ttl = (interval === 'ONE_DAY') ? 300000 : 3000; // 5 mins for daily, 3s for intraday
      if (cached && (now - cached.time < ttl)) {
        return cached.data;
      }

      // Throttle queue to strictly obey Angel One max 3 requests/sec rate limit
      const execute = async () => {
        const timeSinceLast = Date.now() - (this._lastCandleReqTime || 0);
        if (timeSinceLast < 350) {
          await new Promise(r => setTimeout(r, 350 - timeSinceLast));
        }
        this._lastCandleReqTime = Date.now();

        let res = await this._authedPost('https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData', {
          exchange,
          symboltoken,
          interval,
          fromdate: from,
          todate: to
        });

        // If rate limited or 403, retry once after 600ms backoff
        if (!res?.data && (res?.statusCode === 403 || res?.rawBody?.includes('exceeding') || res?.message?.includes('exceeding'))) {
          await new Promise(r => setTimeout(r, 600));
          this._lastCandleReqTime = Date.now();
          res = await this._authedPost('https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData', {
            exchange,
            symboltoken,
            interval,
            fromdate: from,
            todate: to
          });
        }

        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this._candleCache.set(cacheKey, { time: Date.now(), data: res.data });
          return res.data;
        }

        // Return stale cache if available
        if (cached?.data) return cached.data;
        return res?.data || [];
      };

      if (!this._candleQueue) this._candleQueue = Promise.resolve();
      const result = await (this._candleQueue = this._candleQueue.then(execute, execute));
      return result;
    } catch (e) {
      console.warn(`[AngelOne getCandles Error]:`, e.message);
      const cached = this._candleCache?.get(`${exchange}:${symboltoken}:${interval}:${fromdate}:${todate}`);
      return cached?.data || [];
    }
  }

  // High-performance Spot & Index Resolver with token caching & 2s LTP cache
  async resolveAndGetLtp(symbol) {
    const clean = symbol.replace('NSE:', '').replace('BSE:', '').toUpperCase().trim();
    const now = Date.now();

    // Check LTP cache (2-second freshness)
    const cached = this._ltpCache.get(clean);
    if (cached && (now - cached.time < 2000)) {
      return cached.ltp;
    }

    let meta = this._tokenMap.get(clean);
    if (!meta) {
      // Dynamically search scrip
      const results = await this.searchScrip('NSE', clean);
      const exact = results.find(r => r.tradingsymbol === clean + '-EQ') || results[0];
      if (exact) {
        meta = { exchange: exact.exchange || 'NSE', tradingsymbol: exact.tradingsymbol, symboltoken: exact.symboltoken };
        this._tokenMap.set(clean, meta);
      }
    }

    if (meta) {
      const data = await this.getLtp(meta.exchange, meta.tradingsymbol, meta.symboltoken);
      if (data && data.ltp > 0) {
        this._ltpCache.set(clean, { ltp: data.ltp, time: now, data });
        return data.ltp;
      }
    }

    return null;
  }

  async getProfile() {
    const res = await this._authedGet('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile');
    return res?.data || null;
  }

  async getFunds() {
    const res = await this._authedGet('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS');
    return res?.data || null;
  }

  async getPositions() {
    const res = await this._authedGet('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getPosition');
    return res?.data || [];
  }

  async getHoldings() {
    const res = await this._authedGet('https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding');
    return res?.data || [];
  }

  async getOrderBook() {
    const res = await this._authedGet('https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getOrderBook');
    return res?.data || [];
  }

  getStatus() {
    return {
      broker: 'ANGEL_ONE',
      mode: 'READ_ONLY_DATA_ADVISORY',
      orderExecutionBlocked: true,
      connected: this.config.connected && !!this.session.jwtToken,
      clientCode: this.config.clientCode,
      clientName: this.session.clientName || 'MIHIRKUMAR NARENDRABHAI PATEL',
      lastLogin: this.session.loginTime || this.config.lastLogin,
      hasCredentials: !!(this.config.apiKey && this.config.clientCode && this.config.mpin && this.config.totpKey)
    };
  }

  // STRICT USER RULE: NEVER EXECUTE TRADES. READ-ONLY DATA AND ADVISORY ONLY.
  async placeOrder() {
    throw new Error('TRADE_EXECUTION_BLOCKED: User rule strictly prohibits trade execution. Angel One is locked in READ-ONLY mode.');
  }

  _makeRequest(urlStr, method, headers, payload = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            resolve({ rawBody: body, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout to ' + urlStr));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }
}

export const angelOneBridge = new AngelOneBridge();

