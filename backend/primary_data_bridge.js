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
              this.tvBridge.subscribeSymbol(symbol, timeframe, onData, onError, limit);
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
