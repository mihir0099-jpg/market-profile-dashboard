import { angelOneBridge } from './angelone_bridge.js';
import { TradingViewBridge } from './tradingview.js';

export class PrimaryDataBridge {
  constructor() {
    this.tvBridge = new TradingViewBridge();
    this.angelBridge = angelOneBridge;
  }

  async subscribeSymbol(symbol, timeframe, onData, onError, limit = 300) {
    const isGlobalCryptoFx = (
      symbol.includes('BTC') ||
      symbol.includes('USOIL') ||
      symbol.includes('XAU') ||
      symbol.startsWith('COINBASE:') ||
      symbol.startsWith('OANDA:') ||
      symbol.startsWith('TVC:')
    );

    if (!isGlobalCryptoFx) {
      try {
        const candles = await this.angelBridge.getFormattedCandles(symbol, timeframe, limit);
        if (candles && candles.length > 0) {
          return this.angelBridge.subscribeSymbol(symbol, timeframe, onData, onError, limit);
        }
      } catch (err) {
        console.warn(`[PrimaryDataBridge] Angel One unavailable for ${symbol} (${err.message}), falling back to TradingView...`);
      }
    }

    return this.tvBridge.subscribeSymbol(symbol, timeframe, onData, onError, limit);
  }
}

export const primaryDataBridge = new PrimaryDataBridge();
