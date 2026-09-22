let dynamicBackendUrl: string | null = null;

if (typeof window !== 'undefined') {
  // 1. Check URL parameters first (e.g. ?backend=https://...)
  try {
    const params = new URLSearchParams(window.location.search);
    const paramBackend = params.get('backend');
    if (paramBackend) {
      dynamicBackendUrl = paramBackend.trim().replace(/\/$/, '');
      localStorage.setItem('market_profile_backend_url', dynamicBackendUrl);
    }
  } catch (e) {}

  // 2. Check localStorage
  if (!dynamicBackendUrl) {
    try {
      const cached = localStorage.getItem('market_profile_backend_url');
      if (cached) dynamicBackendUrl = cached.trim().replace(/\/$/, '');
    } catch (e) {}
  }

  // 3. Auto-discover from live_backend.json
  fetch('./live_backend.json?_t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.backendUrl && typeof data.backendUrl === 'string') {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url && url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try {
            localStorage.setItem('market_profile_backend_url', url);
            console.log('[Auto-Discovery] Market Profile live backend updated:', url);
          } catch (e) {}
        }
      }
    })
    .catch(() => {});

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
         urlStr.includes('ngrok-free.app'))
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
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    return dynamicBackendUrl || (typeof localStorage !== 'undefined' && localStorage.getItem('market_profile_backend_url')) || 'https://bhaichara-scanner-mihir.serveousercontent.com';
  }
  return window.location.origin;
};

export const getWsBase = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:3001';
  }
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    const target = dynamicBackendUrl || (typeof localStorage !== 'undefined' && localStorage.getItem('market_profile_backend_url')) || 'https://bhaichara-scanner-mihir.serveousercontent.com';
    return target.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

export const apiFetch = (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('bypass-tunnel-reminder', 'true');
  headers.set('Bypass-Tunnel-Remainder', 'true');
  headers.set('ngrok-skip-browser-warning', '69420');
  return fetch(url, { ...options, headers });
};
