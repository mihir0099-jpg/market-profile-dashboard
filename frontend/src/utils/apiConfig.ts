let dynamicBackendUrl: string | null = null;

if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem('market_profile_backend_url');
    if (cached) dynamicBackendUrl = cached.trim().replace(/\/$/, '');
  } catch (e) {}

  fetch('./live_backend.json?_t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.backendUrl && typeof data.backendUrl === 'string') {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url && url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try {
            localStorage.setItem('market_profile_backend_url', url);
            console.log('[Auto-Discovery] Market Profile live backend:', url);
          } catch (e) {}
        }
      }
    })
    .catch(() => {});
}

export const getApiBase = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    return dynamicBackendUrl || 'https://bhaichara-scanner-mihir.serveousercontent.com';
  }
  return window.location.origin;
};

export const getWsBase = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:3001';
  }
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    const target = dynamicBackendUrl || 'https://bhaichara-scanner-mihir.serveousercontent.com';
    return target.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

