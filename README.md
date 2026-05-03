# Mdaad Now: Humanitarian Coordination Ecosystem

Mdaad Now is a high-performance, resilient coordination platform designed for humanitarian actors operating in complex, low-bandwidth environments.

## Architecture Highlights

### 1. Robust Serverless Core (`/api`)
- **Resilient Proxy**: Multi-layered fallback system for humanitarian APIs (UNHCR, ReliefWeb, HDX, HOT).
- **Graceful Degradation**: Integrated "Investor Demo" mode that serves high-fidelity mock data when upstream providers are unreachable.
- **Node.js 20+**: Built on modern Node.js standards for maximum performance and security.

### 2. Premium Frontend Stack
- **React 18 + Tailwind CSS**: Modular component architecture with a custom premium design system.
- **Bilingual Interface**: Native English/Arabic support with optimized typography (Outfit & Readex Pro).
- **Offline First**: Service Worker integration for asset caching and offline resilience.

### 3. Integrated Security & Privacy
- **Coordination Masking**: Automatic geometric masking for sensitive coordination points.
- **Verified Actor System**: TrustScore engine for NGOs based on registration data and field history.

## Development

### Build System
The project uses a static Tailwind compilation workflow to ensure zero-overhead in production:
```bash
npm run build
```

### Routing
Vercel rewrites route all `/api/*` requests to the unified Node.js handler at `api/index.js`, providing a clean, RESTful interface for the frontend.

## API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System status and environment metadata |
| `/api/campaigns` | GET/POST | Humanitarian aid campaigns and needs |
| `/api/resources` | GET | NGOs, Hospitals, and Warehouse locations |
| `/api/external/*` | GET | Proxied humanitarian data from global providers |

---
*Built with excellence by Antigravity for the Mdaad Humanitarian Network.*
