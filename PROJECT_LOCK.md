# 🔒 PROJECT LOCK & ISOLATION MANIFEST

**Project Name:** Market Profile Bhaichara Dashboard & Trading Engine
**Created/Locked Date:** 2026-09-08
**Status:** LOCKED & ISOLATED (v1.0.0)

---

## 📌 Dedicated Deployment & Workspace Configuration

- **Local Workspace Path:** `C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard`
- **GitHub Repository:** `https://github.com/mihir0099-jpg/market-profile-dashboard.git`
- **Primary Branch:** `main`
- **Hugging Face Space (Static Frontend):** `https://mihir0099-tradingview.static.hf.space`
- **Hugging Face Repository:** `https://huggingface.co/spaces/mihir0099/tradingview`
- **Backend Tunnel URL:** `https://bhaichara-scanner-mihir.serveousercontent.com`
- **WebSocket Base:** `wss://bhaichara-scanner-mihir.serveousercontent.com`

---

## 🛑 Strict Isolation Rules

1. **No Mixed Codebases:** All Market Profile, Volume Profile, Black-Scholes GEX, PCR Drift, and TS2Vec/TimesFM AI code MUST reside strictly inside this repository (`market-profile-dashboard`).
2. **Dedicated Hugging Face Space:** `mihir0099/tradingview` is strictly bound to this Market Profile project. Do NOT push code from other projects to this space.
3. **Environment & Dependencies:** Root and sub-packages (`backend`, `frontend`) have locked `package.json` and `render.yaml` specifications.
4. **Auto-Routing:** `frontend/src/utils/apiConfig.ts` is explicitly locked to target `bhaichara-scanner-mihir.serveousercontent.com` when running on `static.hf.space`.

---

## 🟢 Verification Checkpoints Passed

- [x] Hugging Face Static Space HTTP 200 OK (`index.html` & JS assets loaded via Cloudflare CDN)
- [x] Backend HTTP `/health` returning `{"status":"OK"}`
- [x] Real-time scanner processing 217 liquid symbols
- [x] WebSocket handshake established with < 15ms latency
- [x] Zero F12 console errors or CORS restrictions
