let dynamicBackendUrl: string | null = null;
const urlListeners: Array<(url: string) => void> = [];

export function onBackendChange(listener: (url: string) => void): () => void {
  urlListeners.push(listener);
  if (dynamicBackendUrl && isValidTunnelUrl(dynamicBackendUrl)) {
    try { listener(dynamicBackendUrl); } catch (e) {}
  }
  return () => {
    const idx = urlListeners.indexOf(listener);
    if (idx !== -1) urlListeners.splice(idx, 1);
  };
}

function notifyListeners(url: string) {
  for (const listener of [...urlListeners]) {
    try { listener(url); } catch (e) {}
  }
}

export function isValidTunnelUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  if (clean.includes('api.trycloudflare.com')) return false;
  if (clean.includes('loca.lt')) return false;
  return true;
}

export async function refreshBackendUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // 1. Try local relative live_backend.json (served directly by same CDN/host, takes <20ms)
  try {
    const r = await fetch('./live_backend.json?_t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (data && isValidTunnelUrl(data.backendUrl)) {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try { localStorage.setItem('market_profile_backend_url', url); } catch (e) {}
          notifyListeners(url);
          console.log('[Auto-Discovery] Market Profile live backend resolved:', url);
        }
        return url;
      }
    }
  } catch (e) {}

  // 2. Fallback to Hugging Face Raw file endpoint
  try {
    const r = await fetch('https://huggingface.co/spaces/mihir0099/tradingview/raw/main/live_backend.json?_t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (data && isValidTunnelUrl(data.backendUrl)) {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try { localStorage.setItem('market_profile_backend_url', url); } catch (e) {}
          notifyListeners(url);
          console.log('[Auto-Discovery] Market Profile live backend resolved via HF raw:', url);
        }
        return url;
      }
    }
  } catch (e) {}

  return dynamicBackendUrl;
}

if (typeof window !== 'undefined') {
  // 1. Check URL parameters first (e.g. ?backend=https://...)
  try {
    const params = new URLSearchParams(window.location.search);
    const paramBackend = params.get('backend');
    if (paramBackend && isValidTunnelUrl(paramBackend)) {
      dynamicBackendUrl = paramBackend.trim().replace(/\/$/, '');
      localStorage.setItem('market_profile_backend_url', dynamicBackendUrl);
    }
  } catch (e) {}

  // 2. Pre-load cached from localStorage if valid
  if (!dynamicBackendUrl) {
    try {
      const cached = localStorage.getItem('market_profile_backend_url');
      if (cached && isValidTunnelUrl(cached)) {
        dynamicBackendUrl = cached.trim().replace(/\/$/, '');
      }
    } catch (e) {}
  }

  // 3. Immediately trigger non-blocking refresh
  refreshBackendUrl();
  // Keep background polling every 25 seconds for zero-lag reconnection
  setInterval(refreshBackendUrl, 25000);

  // 4. Global fetch interceptor: automatically add bypass headers for tunnels
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (
        urlStr &&
        (urlStr.includes('serveousercontent.com') ||
         urlStr.includes('loca.lt') ||
         urlStr.includes('trycloudflare.com') ||
         urlStr.includes('ngrok-free.app') ||
         urlStr.includes('ngrok-free.dev'))
      ) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        headers.set('bypass-tunnel-reminder', 'true');
        headers.set('Bypass-Tunnel-Remainder', 'true');
        headers.set('ngrok-skip-browser-warning', '69420');
        init.headers = headers;
      }
    } catch (e) {}
    return originalFetch.call(this, input, init);
  };
}

export const getApiBase = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Check URL param first
  try {
    const params = new URLSearchParams(window.location.search);
    const paramBackend = params.get('backend');
    if (paramBackend && isValidTunnelUrl(paramBackend)) {
      return paramBackend.trim().replace(/\/$/, '');
    }
  } catch (e) {}

  if (dynamicBackendUrl && isValidTunnelUrl(dynamicBackendUrl)) {
    return dynamicBackendUrl;
  }

  try {
    const cached = localStorage.getItem('market_profile_backend_url');
    if (cached && isValidTunnelUrl(cached)) {
      return cached.trim().replace(/\/$/, '');
    }
  } catch (e) {}

  return window.location.origin;
};

export const getWsBase = (): string => {
  const apiBase = getApiBase();
  if (apiBase.startsWith('http://localhost') || apiBase.startsWith('http://127.0.0.1')) {
    return apiBase.replace(/^http:/, 'ws:');
  }
  return apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
};

export const apiFetch = (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('bypass-tunnel-reminder', 'true');
  headers.set('Bypass-Tunnel-Remainder', 'true');
  headers.set('ngrok-skip-browser-warning', '69420');
  return fetch(url, { ...options, headers });
};
