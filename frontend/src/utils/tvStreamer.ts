import { getWsBase, getApiBase } from './apiConfig';

export interface TVDataMessage {
  symbol: string;
  timeframe: string;
  isSnapshot?: boolean;
  candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

type OnDataCallback = (data: TVDataMessage) => void;
type OnErrorCallback = (error: string) => void;
type OnStatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void;
type OnViewerCountCallback = (count: number) => void;

class TVWebSocketStreamer {
  private ws: WebSocket | null = null;
  private url: string;
  private currentSubscription: { symbol: string; timeframe: string } | null = null;
  private onDataCallback: OnDataCallback | null = null;
  private onErrorCallback: OnErrorCallback | null = null;
  private onStatusCallback: OnStatusCallback | null = null;
  private onViewerCountCallback: OnViewerCountCallback | null = null;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor() {
    this.url = getWsBase();
  }

  public setStatusListener(callback: OnStatusCallback) {
    this.onStatusCallback = callback;
    callback(this.status);
  }

  public setViewerCountListener(callback: OnViewerCountCallback) {
    this.onViewerCountCallback = callback;
  }

  private setStatus(newStatus: 'connecting' | 'connected' | 'disconnected') {
    this.status = newStatus;
    if (this.onStatusCallback) {
      this.onStatusCallback(newStatus);
    }
  }

  public async fetchRestSnapshot(symbol: string, timeframe: string) {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        if (data.candles && data.candles.length > 0 && this.onDataCallback) {
          console.log(`[REST Snapshot] Loaded ${data.candles.length} candles for ${symbol}`);
          this.onDataCallback({
            symbol,
            timeframe,
            isSnapshot: true,
            candles: data.candles
          });
          if (this.status !== 'connected') {
            this.setStatus('connected');
          }
        }
      }
    } catch (err) {
      console.warn('[REST Snapshot] Failed to fetch REST snapshot:', err);
    }
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    console.log(`Connecting to backend WebSocket at ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.setStatus('connected');
        this.startPing();
        
        if (this.currentSubscription) {
          this.sendSubscription(this.currentSubscription.symbol, this.currentSubscription.timeframe);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'data') {
            if (this.onDataCallback) {
              this.onDataCallback(payload);
            }
          } else if (payload.type === 'viewer_count') {
            if (this.onViewerCountCallback) {
              this.onViewerCountCallback(payload.count);
            }
          } else if (payload.type === 'error') {
            console.error('WebSocket Error message from server:', payload.message);
            if (this.onErrorCallback) {
              this.onErrorCallback(payload.message);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.stopPing();
        this.setStatus('disconnected');
        this.ws = null;
        this.triggerReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.stopPing();
        this.setStatus('disconnected');
        if (this.onErrorCallback) {
          this.onErrorCallback('WebSocket server connection error');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket client:', err);
      this.setStatus('disconnected');
      this.triggerReconnect();
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private triggerReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      console.log('Attempting fast reconnect...');
      this.connect();
    }, 800);
  }

  private sendSubscription(symbol: string, timeframe: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        type: 'subscribe',
        symbol,
        timeframe
      });
      this.ws.send(msg);
      console.log(`Sent subscription request for ${symbol} (${timeframe})`);
    } else {
      console.warn('Cannot send subscription, WebSocket not open. Will subscribe upon connection.');
    }
  }

  public subscribe(
    symbol: string,
    timeframe: string,
    onData: OnDataCallback,
    onError?: OnErrorCallback
  ) {
    this.currentSubscription = { symbol, timeframe };
    this.onDataCallback = onData;
    if (onError) this.onErrorCallback = onError;

    this.fetchRestSnapshot(symbol, timeframe);

    this.connect();
    this.sendSubscription(symbol, timeframe);
  }

  public unsubscribe() {
    this.currentSubscription = null;
    this.onDataCallback = null;
    this.onErrorCallback = null;
  }

  public disconnect() {
    this.unsubscribe();
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setStatus('disconnected');
  }
}

export const tvStreamer = new TVWebSocketStreamer();
export default tvStreamer;
