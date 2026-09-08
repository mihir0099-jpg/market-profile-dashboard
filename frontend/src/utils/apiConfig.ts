export const getApiBase = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    return 'https://market-profile-dashboard.onrender.com';
  }
  return window.location.origin;
};

export const getWsBase = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:3001';
  }
  if (hostname.includes('static.hf.space') || hostname.includes('github.io')) {
    return 'wss://market-profile-dashboard.onrender.com';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};
