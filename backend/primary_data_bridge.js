import { angelOneBridge } from './angelone_bridge.js';
import { TradingViewBridge } from './tradingview.js';

export class PrimaryDataBridge {
  constructor() {
    this.tvBridge = new TradingViewBridge();
    this.angelBridge = angelOneBridge;
  }

  async subscribeSymbol(symbol, timeframe, onData, onError, limit = 300) {
    const isCryptoFx = (
      symbol.includes('BTC') ||
      symbol.startsWith('COINBASE:') ||
      symbol.startsWith('OANDA:') ||
      (symbol.startsWith('TVC:') && !symbol.includes('USOIL') && !symbol.includes('CRUDE'))
    );

    // Primary: Angel One SmartAPI Feed (NSE, BSE, MCX Commodities & USOIL proxy)
    if (!isCryptoFx) {
      try {
        const cleanup = await this.angelBridge.subscribeSymbol(
          symbol,
          timeframe,
          onData,
          null, // Let errors trigger catch block for seamless fallback
          limit
        );
        return cleanup;
      } catch (err) {
        console.warn(`[PrimaryDataBridge] Angel One initial connect error for ${symbol} (${err.message}), falling back to TradingView...`);
      }
    }

    return this.tvBridge.subscribeSymbol(symbol, timeframe, onData, onError, limit);
  }
}

export const primaryDataBridge = new PrimaryDataBridge();
