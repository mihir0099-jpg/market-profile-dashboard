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
        let snapshotDelivered = false;
        const cleanup = await this.angelBridge.subscribeSymbol(
          symbol,
          timeframe,
          (data) => {
            snapshotDelivered = true;
            onData(data);
          },
          (err) => {
            if (!snapshotDelivered) {
              console.warn(`[PrimaryDataBridge] Angel One stream error for ${symbol} (${err.message}), falling back to TradingView...`);
              this.tvBridge.subscribeSymbol(symbol, timeframe, onData, (tvErr) => {
                const msg = tvErr?.message || String(tvErr);
                if (msg.includes('permission denied') && typeof onError === 'function') {
                  onError(new Error(`Angel One active for ${symbol}. (TradingView public stream restricted for this symbol)`));
                } else if (typeof onError === 'function') {
                  onError(tvErr);
                }
              }, limit);
            } else if (typeof onError === 'function') {
              onError(err);
            }
          },
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
